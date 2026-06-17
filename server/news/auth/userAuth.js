// ========== 用户认证系统 ==========
export const users = new Map(); // 内存用户存储
export const userSessions = new Map(); // 会话存储

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createUser(username, password, email, interests = []) {
  const id = generateToken();
  const hashedPassword = await hashPassword(password);
  const user = {
    id,
    username,
    password: hashedPassword,
    email,
    interests,
    createdAt: new Date().toISOString(),
    displayName: username,
    avatar: '',
    signature: ''
  };
  users.set(username, user);
  return user;
}

export async function verifyUser(username, password) {
  const user = users.get(username);
  if (!user) return null;
  const hashedPassword = await hashPassword(password);
  if (user.password !== hashedPassword) return null;
  return user;
}

export function getUserByToken(token) {
  return userSessions.get(token) || null;
}
