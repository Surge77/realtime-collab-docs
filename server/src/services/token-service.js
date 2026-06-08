import { createHash, randomUUID } from 'node:crypto';

import { redis } from './redis-client.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/errors.js';

const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // matches JWT_REFRESH_EXPIRY=7d
const refreshKey = (userId) => `refresh:${userId}`;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/**
 * Issue an access + refresh token pair and persist the refresh-token hash.
 * @param {{ id: string, email: string, username: string }} user
 */
export async function issueTokens(user) {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, username: user.username });
  const refreshToken = signRefreshToken({ sub: user.id, jti: randomUUID() });
  await redis.set(refreshKey(user.id), sha256(refreshToken), 'EX', REFRESH_TTL_SECONDS);
  return { accessToken, refreshToken };
}

/**
 * Verify a refresh token's signature AND that its hash is the stored one.
 * Reuse detection: a validly-signed token whose hash is NOT the stored one was
 * already rotated (or stolen) — revoke the whole session as a precaution.
 */
export async function verifyRefresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Invalid refresh token');
  }
  const stored = await redis.get(refreshKey(payload.sub));
  if (!stored || stored !== sha256(refreshToken)) {
    // Signature was valid but this token is not current → possible reuse.
    await revokeRefresh(payload.sub);
    throw unauthorized('Refresh token revoked or expired');
  }
  return payload;
}

export async function revokeRefresh(userId) {
  await redis.del(refreshKey(userId));
}
