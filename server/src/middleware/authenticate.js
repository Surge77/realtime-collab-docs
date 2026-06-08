import { verifyAccessToken } from '../utils/jwt.js';
import { unauthorized } from '../utils/errors.js';

/** Verify the Bearer access token and attach req.user. */
export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(unauthorized('Missing or malformed Authorization header'));
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, username: payload.username };
    return next();
  } catch {
    return next(unauthorized('Invalid or expired access token'));
  }
}
