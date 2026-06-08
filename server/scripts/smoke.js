// Connectivity smoke test: verifies Neon Postgres and Upstash Redis are reachable.
// Run: npm run smoke
import { pool, closePool } from '../src/db/connection.js';
import { redis, closeRedis } from '../src/services/redis-client.js';

async function main() {
  let ok = true;

  try {
    const { rows } = await pool.query('SELECT version()');
    console.log('✅ Postgres:', rows[0].version.split(',')[0]);
  } catch (err) {
    ok = false;
    console.error('❌ Postgres failed:', err.message);
  }

  try {
    await redis.connect();
    const pong = await redis.ping();
    const testKey = 'smoke:ping';
    await redis.set(testKey, 'ok', 'EX', 10);
    const val = await redis.get(testKey);
    console.log(`✅ Redis: PING=${pong}, roundtrip=${val}`);
  } catch (err) {
    ok = false;
    console.error('❌ Redis failed:', err.message);
  }

  await closePool().catch(() => {});
  await closeRedis().catch(() => {});
  process.exit(ok ? 0 : 1);
}

main();
