import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PARAMS = Object.freeze({ algorithm: 'scrypt', version: 1, N: 16384, r: 8, p: 1, keylen: 64 });

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(String(password), salt, PARAMS.keylen, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 64 * 1024 * 1024,
  });
  return { hash: derived.toString('hex'), salt: salt.toString('hex'), params: { ...PARAMS } };
}

export async function verifyPassword(password, record) {
  if (!record?.hash || !record?.salt || record?.params?.algorithm !== 'scrypt') return false;
  const expected = Buffer.from(record.hash, 'hex');
  const actual = await scrypt(String(password), Buffer.from(record.salt, 'hex'), record.params.keylen, {
    N: record.params.N,
    r: record.params.r,
    p: record.params.p,
    maxmem: 64 * 1024 * 1024,
  });
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
