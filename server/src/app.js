import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';

import { authRouter } from './routes/auth.js';
import { documentsRouter } from './routes/documents.js';
import { authLimiter } from './middleware/rate-limiter.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { logger } from './utils/logger.js';
import { pool } from './db/connection.js';
import { redis } from './services/redis-client.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());

  if (process.env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger }));
  }

  app.get('/healthz', async (_req, res) => {
    const checks = { postgres: false, redis: false };
    try {
      await pool.query('SELECT 1');
      checks.postgres = true;
    } catch {
      /* reported below */
    }
    try {
      await redis.ping();
      checks.redis = true;
    } catch {
      /* reported below */
    }
    const healthy = checks.postgres && checks.redis;
    res.status(healthy ? 200 : 503).json({ status: healthy ? 'ok' : 'degraded', checks });
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/documents', documentsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
