process.env.NODE_ENV = 'test';

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { WebSocket } from 'ws';

import { setupYjsWebSocket } from '../src/services/yjs-server.js';
import { createTicket } from '../src/services/ws-ticket.js';
import { createUser } from '../src/models/user.js';
import { createDocument } from '../src/models/document.js';
import { pool, closePool } from '../src/db/connection.js';
import { closeRedis } from '../src/services/redis-client.js';

function waitFor(predicate, { timeout = 4000, interval = 25 } = {}) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - started > timeout) return reject(new Error('waitFor timed out'));
      setTimeout(tick, interval);
    };
    tick();
  });
}

describe('yjs sync (two clients)', () => {
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
    userEmail = `sync_${id}@example.com`;
    const user = await createUser({ email: userEmail, username: `sync_${id}`, passwordHash: 'x' });
    const doc = await createDocument({ title: 'Sync', ownerId: user.id });
    docId = doc.id;
    ticket = await createTicket(user.id, docId);
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.query('DELETE FROM users WHERE email = $1', [userEmail]).catch(() => {});
    await closePool().catch(() => {});
    await closeRedis().catch(() => {});
  });

  it('propagates text edits between two clients in the same room', async () => {
    const url = `ws://localhost:${port}/yjs`;
    const opts = { params: { ticket }, WebSocketPolyfill: WebSocket };
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const p1 = new WebsocketProvider(url, docId, doc1, opts);
    const p2 = new WebsocketProvider(url, docId, doc2, opts);

    try {
      await waitFor(() => p1.wsconnected && p2.wsconnected);
      doc1.getText('content').insert(0, 'hello sync');
      await waitFor(() => doc2.getText('content').toString() === 'hello sync');
      assert.equal(doc2.getText('content').toString(), 'hello sync');
    } finally {
      p1.destroy();
      p2.destroy();
      doc1.destroy();
      doc2.destroy();
    }
  });

  it('rejects a connection with no ticket', async () => {
    const url = `ws://localhost:${port}/yjs`;
    const doc = new Y.Doc();
    const provider = new WebsocketProvider(url, docId, doc, { WebSocketPolyfill: WebSocket });
    let sawClose = false;
    provider.ws?.addEventListener?.('close', () => {
      sawClose = true;
    });
    try {
      // Without a ticket the upgrade is rejected, so it never reaches connected.
      await waitFor(() => provider.wsconnected === false && (sawClose || provider.wsUnsuccessfulReconnects > 0), {
        timeout: 3000,
      }).catch(() => {});
      assert.equal(provider.wsconnected, false);
    } finally {
      provider.destroy();
      doc.destroy();
    }
  });
});
