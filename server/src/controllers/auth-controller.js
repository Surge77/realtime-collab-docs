import { asyncHandler, conflict, unauthorized } from '../utils/errors.js';
import { loginSchema, parseOrThrow, registerSchema } from '../utils/validation.js';
import { hashPassword, verifyPassword } from '../services/password.js';
import { issueTokens, revokeRefresh, verifyRefresh } from '../services/token-service.js';
import { createUser, findByEmailWithHash, findById, findConflict } from '../models/user.js';

const REFRESH_COOKIE = 'refreshToken';
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: process.env.COOKIE_SAMESITE ?? 'strict',
  path: '/api/auth',
  maxAge: REFRESH_MAX_AGE_MS,
});

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, cookieOptions());
}

export const register = asyncHandler(async (req, res) => {
  const { email, username, password } = parseOrThrow(registerSchema, req.body);

  const existing = await findConflict(email, username);
  if (existing) {
    throw conflict(`That ${existing} is already taken`, [{ field: existing, message: 'Already in use' }]);
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ email, username, passwordHash });
  const { accessToken, refreshToken } = await issueTokens(user);

  setRefreshCookie(res, refreshToken);
  res.status(201).json({ user, accessToken });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = parseOrThrow(loginSchema, req.body);

  const record = await findByEmailWithHash(email);
  if (!record || !(await verifyPassword(record.passwordHash, password))) {
    throw unauthorized('Invalid email or password');
  }

  const user = {
    id: record.id,
    email: record.email,
    username: record.username,
    avatarColor: record.avatarColor,
  };
  const { accessToken, refreshToken } = await issueTokens(user);

  setRefreshCookie(res, refreshToken);
  res.json({ user, accessToken });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw unauthorized('No refresh token');

  const payload = await verifyRefresh(token);
  const user = await findById(payload.sub);
  if (!user) throw unauthorized('User no longer exists');

  // Rotate: issue a new refresh token (invalidates the presented one) + access.
  const { accessToken, refreshToken } = await issueTokens(user);
  setRefreshCookie(res, refreshToken);
  res.json({ accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = await verifyRefresh(token);
      await revokeRefresh(payload.sub);
    } catch {
      // Token already invalid/expired — nothing to revoke.
    }
  }
  res.clearCookie(REFRESH_COOKIE, { ...cookieOptions(), maxAge: undefined });
  res.json({ message: 'Logged out' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await findById(req.user.id);
  if (!user) throw unauthorized('User no longer exists');
  res.json({ user });
});
