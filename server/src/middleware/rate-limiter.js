import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { redis } from '../services/redis-client.js';

const windowMs = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 900_000);
const max = Number(process.env.AUTH_RATE_LIMIT_MAX ?? 100);

/** Brute-force protection for auth routes, backed by shared Redis. */
export const authLimiter = rateLimit({
  windowMs,
  max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, try again later' } },
  store: new RedisStore({
    // Full namespace here: ioredis keyPrefix is not applied to .call(), so we
    // include the project prefix explicitly to keep shared-Redis isolation.
    prefix: `${process.env.REDIS_KEY_PREFIX ?? 'rcd:'}ratelimit:`,
    sendCommand: (...args) => redis.call(...args),
  }),
});
