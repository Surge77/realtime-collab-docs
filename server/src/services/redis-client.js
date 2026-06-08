import Redis from 'ioredis';

import { logger } from '../utils/logger.js';

const url = process.env.REDIS_URL;
if (!url) {
  throw new Error('REDIS_URL is not set');
}

// keyPrefix namespaces every key so one Upstash DB can be shared across
// projects without collisions (see CONTEXT.md). rediss:// auto-enables TLS.
export const redis = new Redis(url, {
  keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'rcd:',
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error({ err }, 'redis client error');
});

export async function closeRedis() {
  await redis.quit();
}
