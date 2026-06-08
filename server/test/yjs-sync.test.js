import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { WebSocket } from 'ws';

import { setupYjsWebSocket } from '../src/services/yjs-server.js';

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

  before(async () => {
    server = createServer();
    setupYjsWebSocket(server);
    await new Promise((resolve) => server.listen(0, resolve));
    port = server.address().port;
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('propagates text edits between two clients in the same room', async () => {
    const room = `sync-test-${Date.now()}`;
    const url = `ws://localhost:${port}/yjs`;
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const p1 = new WebsocketProvider(url, room, doc1, { WebSocketPolyfill: WebSocket });
    const p2 = new WebsocketProvider(url, room, doc2, { WebSocketPolyfill: WebSocket });

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
});
