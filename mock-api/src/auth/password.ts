import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

/** A salted scrypt hash. Plain-text passwords are never stored. */
export interface PasswordHash {
  readonly salt: Buffer;
  readonly hash: Buffer;
}

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<PasswordHash> {
  const salt = randomBytes(SALT_LENGTH);
  return { salt, hash: await deriveKey(password, salt) };
}

/** Constant-time comparison to avoid leaking information through response timing. */
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const candidate = await deriveKey(password, stored.salt);
  return timingSafeEqual(candidate, stored.hash);
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });
}
