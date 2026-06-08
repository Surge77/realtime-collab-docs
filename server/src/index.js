import { createServer } from 'node:http';

import { createApp } from './app.js';
import { setupYjsWebSocket, flushAllRooms } from './services/yjs-server.js';
import { redis, closeRedis } from './services/redis-client.js';
import { closePool } from './db/connection.js';
import { logger } from './utils/logger.js';

const PORT = Number(process.env.PORT ?? 4000);

async function start() {
  // Fail fast if Redis is unreachable. ping() triggers the lazy connection and
  // is safe whether or not the client is already connected (unlike connect(),
  // which throws if a connection is already in progress).
  await redis.ping();
  logger.info('redis connected');

  const app = createApp();
  const server = createServer(app);
  setupYjsWebSocket(server);

  server.listen(PORT, () => {
    logger.info(`server listening on http://localhost:${PORT}`);
  });

  // Graceful shutdown: flush active Yjs documents before closing the pools.
  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    server.close(async () => {
      // D8 ordering: flush Yjs rooms to the DB BEFORE closing the pool.
      await flushAllRooms().catch((err) => logger.error({ err }, 'error flushing yjs rooms'));
      await closePool().catch((err) => logger.error({ err }, 'error closing pg pool'));
      await closeRedis().catch((err) => logger.error({ err }, 'error closing redis'));
      process.exit(0);
    });
    // Force-exit if cleanup hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error({ err }, 'failed to start server');
  process.exit(1);
});
