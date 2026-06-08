import pg from 'pg';

import { logger } from '../utils/logger.js';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Neon (and most managed Postgres) require TLS. node-postgres does not honour
// sslmode from the URL on its own, so enable ssl when the string asks for it.
const needsSsl = /sslmode=require/.test(connectionString) || /neon\.tech/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'unexpected postgres pool error');
});

/** Run a parameterized query. Never interpolate user input into SQL text. */
export function query(text, params) {
  return pool.query(text, params);
}

export async function closePool() {
  await pool.end();
}
