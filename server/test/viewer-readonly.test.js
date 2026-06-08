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
    const start = Date.now();
    const tick = () => {
      if (predicate()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('waitFor timed out'));
      setTimeout(tick, interval);
    };
    tick();
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

describe('viewer read-only enforced server-side (D4)', () => {
  let server;
  let port;
  let docId;
  let ownerTicket;
  let viewerTicket;
  let userEmail;

  before(async () => {
    server = createServer();
    setupYjsWebSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;

    const id = randomUUID().slice(0, 8);
    userEmail = `viewer_${id}@example.com`;
    const owner = await createUser({ email: userEmail, username: `viewer_${id}`, passwordHash: 'x' });
    const doc = await createDocument({ title: 'RO', ownerId: owner.id });
    docId = doc.id;
    ownerTicket = await createTicket(owner.id, docId, 'owner');
    viewerTicket = await createTicket(randomUUID(), docId, 'viewer');
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.query('DELETE FROM users WHERE email = $1', [userEmail]).catch(() => {});
    await closePool().catch(() => {});
    await closeRedis().catch(() => {});
  });

  it('drops viewer writes but still delivers owner edits to the viewer', async () => {
    const url = `ws://localhost:${port}/yjs`;
    const ownerDoc = new Y.Doc();
    const viewerDoc = new Y.Doc();
    // disableBc: providers in one process otherwise sync via BroadcastChannel,
    // bypassing the server's read-only gating. Force the server path.
    const ownerP = new WebsocketProvider(url, docId, ownerDoc, {
      params: { ticket: ownerTicket },
      WebSocketPolyfill: WebSocket,
      disableBc: true,
    });
    const viewerP = new WebsocketProvider(url, docId, viewerDoc, {
      params: { ticket: viewerTicket },
      WebSocketPolyfill: WebSocket,
      disableBc: true,
    });

    try {
      await waitFor(() => ownerP.wsconnected && viewerP.wsconnected);

      // Viewer attempts a write — must NOT propagate to the owner.
      viewerDoc.getText('content').insert(0, 'VIEWER HACK');
      await delay(600);
      assert.equal(ownerDoc.getText('content').toString(), '', 'viewer write must be dropped');

      // Owner writes — viewer must receive it (read path works).
      ownerDoc.getText('content').insert(0, 'owner edit');
      await waitFor(() => viewerDoc.getText('content').toString().includes('owner edit'));
      assert.ok(viewerDoc.getText('content').toString().includes('owner edit'));
    } finally {
      ownerP.destroy();
      viewerP.destroy();
      ownerDoc.destroy();
      viewerDoc.destroy();
    }
  });
});
