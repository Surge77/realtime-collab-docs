process.env.NODE_ENV = 'test';

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { WebSocket } from 'ws';

import { setupYjsWebSocket } from '../src/services/yjs-server.js';
import { getDocumentState } from '../src/services/persistence.js';
import { createTicket } from '../src/services/ws-ticket.js';
import { createUser } from '../src/models/user.js';
import { createDocument } from '../src/models/document.js';
import { pool, closePool } from '../src/db/connection.js';
import { closeRedis } from '../src/services/redis-client.js';

function waitFor(predicate, { timeout = 6000, interval = 30 } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = async () => {
      try {
        if (await predicate()) return resolve();
      } catch {
        /* keep polling */
      }
      if (Date.now() - started > timeout) return reject(new Error('waitFor timed out'));
      setTimeout(tick, interval);
    };
    tick();
  });
}

describe('yjs persistence over WS (survives reconnect/restart)', () => {
  let server;
  let port;
  let docId;
  let ticket;
  let userEmail;

  before(async () => {
    server = createServer();
    setupYjsWebSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;

    const id = randomUUID().slice(0, 8);
    userEmail = `wspersist_${id}@example.com`;
    const user = await createUser({ email: userEmail, username: `wsp_${id}`, passwordHash: 'x' });
    const doc = await createDocument({ title: 'WS Persist', ownerId: user.id });
    docId = doc.id;
    ticket = await createTicket(user.id, docId);
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.query('DELETE FROM users WHERE email = $1', [userEmail]).catch(() => {});
    await closePool().catch(() => {});
    await closeRedis().catch(() => {});
  });

  it('persists on disconnect and reloads for a fresh client', async () => {
    const url = `ws://localhost:${port}/yjs`;

    // Client 1 connects, types, then disconnects (triggers writeState flush).
    const doc1 = new Y.Doc();
    const p1 = new WebsocketProvider(url, docId, doc1, { params: { ticket }, WebSocketPolyfill: WebSocket });
    await waitFor(() => p1.wsconnected);
    doc1.getText('content').insert(0, 'restart text');
    p1.destroy();
    doc1.destroy();

    // Wait until the state is actually in the DB.
    await waitFor(async () => (await getDocumentState(docId)) !== null);

    // Client 2 connects fresh to the same room — bindState loads from the DB.
    const doc2 = new Y.Doc();
    const p2 = new WebsocketProvider(url, docId, doc2, { params: { ticket }, WebSocketPolyfill: WebSocket });
    try {
      await waitFor(() => doc2.getText('content').toString() === 'restart text');
      assert.equal(doc2.getText('content').toString(), 'restart text');
    } finally {
      p2.destroy();
      doc2.destroy();
    }
  });
});
