import { hash, verify } from '@node-rs/argon2';

// argon2id defaults from @node-rs/argon2 are OWASP-aligned; keep explicit for clarity.
const OPTIONS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

export function hashPassword(plain) {
  return hash(plain, OPTIONS);
}

export function verifyPassword(storedHash, plain) {
  return verify(storedHash, plain);
}
