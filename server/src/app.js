import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const isProd = process.env.NODE_ENV === 'production';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      // CSP only engages when Express serves the built SPA (production). It is
      // off otherwise so it can't interfere with the separate Vite dev server.
      // style-src 'unsafe-inline' is required by CodeMirror's injected theme.
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              connectSrc: ["'self'", 'ws:', 'wss:'],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
            },
          }
        : false,
    }),
  );
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

  // In production, serve the built client and fall back to index.html for SPA
  // routes (anything not under /api).
  if (isProd) {
    const distDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'client', 'dist');
    app.use(express.static(distDir));
    app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(distDir, 'index.html')));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
