import { createHash, randomBytes } from 'node:crypto';
import { createAuthRepository } from './authRepository.js';
import { hashPassword, verifyPassword } from './passwords.js';

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function serviceError(code, message, status = 400) {
  return Object.assign(new Error(message), { code, status });
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email || '',
    displayName: user.display_name || user.displayName || user.username,
    avatar: user.avatar_url || user.avatar || '',
    signature: user.signature || '',
    interests: Array.isArray(user.interests) ? user.interests : [],
    createdAt: user.created_at || user.createdAt,
  };
}

export function createAuthService(repository = createAuthRepository()) {
  async function issueSession(user) {
    const rawToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_MS);
    await repository.createSession({ userId: user.id, tokenHash: tokenHash(rawToken), expiresAt });
    return { rawToken, expiresAt, user: publicUser(user) };
  }

  return {
    async register({ username, email = '', password }) {
      const existing = await repository.findUserByIdentity(username);
      if (existing || (email && await repository.findUserByIdentity(email))) {
        throw serviceError('IDENTITY_EXISTS', '用户名或邮箱已存在', 409);
      }
      let user;
      try {
        user = await repository.createUser({ username, email, password: await hashPassword(password) });
      } catch (error) {
        if (error?.code === '23505') throw serviceError('IDENTITY_EXISTS', '用户名或邮箱已存在', 409);
        throw error;
      }
      return issueSession(user);
    },
    async login({ username, password }) {
      const user = await repository.findUserByIdentity(username);
      const valid = user && user.status === 'active' && await verifyPassword(password, {
        hash: user.password_hash,
        salt: user.password_salt,
        params: user.password_params,
      });
      if (!valid) throw serviceError('INVALID_CREDENTIALS', '用户名或密码错误', 401);
      return issueSession(user);
    },
    async authenticate(rawToken) {
      if (!rawToken) return null;
      const session = await repository.findSession(tokenHash(rawToken));
      if (!session || session.revoked_at || new Date(session.expires_at).getTime() <= Date.now() || session.status !== 'active') return null;
      return publicUser(session);
    },
    async logout(rawToken) {
      if (rawToken) await repository.revokeSession(tokenHash(rawToken));
    },
    async updateProfile(rawToken, updates) {
      const current = await this.authenticate(rawToken);
      if (!current) throw serviceError('UNAUTHORIZED', '请先登录', 401);
      return publicUser(await repository.updateProfile(current.id, updates));
    },
  };
}
