import jwt from 'jsonwebtoken';

const accessSecret = process.env.JWT_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const accessExpiry = process.env.JWT_ACCESS_EXPIRY ?? '15m';
const refreshExpiry = process.env.JWT_REFRESH_EXPIRY ?? '7d';

if (!accessSecret || !refreshSecret) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set');
}

/** @param {{ sub: string, email: string, username: string }} payload */
export function signAccessToken(payload) {
  return jwt.sign(payload, accessSecret, { expiresIn: accessExpiry });
}

/** @param {{ sub: string, jti: string }} payload */
export function signRefreshToken(payload) {
  return jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiry });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, refreshSecret);
}
