import { getPool } from '../db/client.js';

const USER_COLUMN_NAMES = [
  'id', 'username', 'email', 'password_hash', 'password_salt', 'password_params',
  'display_name', 'avatar_url', 'signature', 'interests', 'status', 'created_at', 'updated_at',
];
const USER_COLUMNS = USER_COLUMN_NAMES.join(', ');

export function createAuthRepository(db = getPool()) {
  return {
    async findUserByIdentity(identity) {
      const { rows } = await db.query(
        `select ${USER_COLUMNS} from users where lower(username) = lower($1) or lower(email) = lower($1) limit 1`,
        [identity],
      );
      return rows[0] || null;
    },
    async createUser({ username, email, password }) {
      const { rows } = await db.query(
        `insert into users(username, email, password_hash, password_salt, password_params, display_name)
         values ($1, nullif($2, ''), $3, $4, $5, $1) returning ${USER_COLUMNS}`,
        [username, email || '', password.hash, password.salt, password.params],
      );
      await db.query('insert into user_profiles(user_id) values ($1) on conflict do nothing', [rows[0].id]);
      return rows[0];
    },
    async createSession({ userId, tokenHash, expiresAt }) {
      await db.query('insert into sessions(user_id, token_hash, expires_at) values ($1, $2, $3)', [userId, tokenHash, expiresAt]);
    },
    async findSession(tokenHash) {
      const { rows } = await db.query(
        `select s.expires_at, s.revoked_at, ${USER_COLUMN_NAMES.map(column => `u.${column}`).join(', ')}
         from sessions s join users u on u.id = s.user_id where s.token_hash = $1 limit 1`,
        [tokenHash],
      );
      return rows[0] || null;
    },
    async revokeSession(tokenHash) {
      await db.query('update sessions set revoked_at = coalesce(revoked_at, now()) where token_hash = $1', [tokenHash]);
    },
    async updateProfile(userId, updates) {
      const { rows } = await db.query(
        `update users set display_name = coalesce($2, display_name), avatar_url = coalesce($3, avatar_url),
         signature = coalesce($4, signature), interests = coalesce($5, interests), updated_at = now()
         where id = $1 returning ${USER_COLUMNS}`,
        [userId, updates.displayName ?? null, updates.avatar ?? null, updates.signature ?? null, updates.interests === undefined ? null : JSON.stringify(updates.interests)],
      );
      return rows[0] || null;
    },
  };
}
