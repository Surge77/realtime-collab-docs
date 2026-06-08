import { createRequire } from 'node:module';

import { WebSocketServer } from 'ws';
import * as Y from 'yjs';

import { logger } from '../utils/logger.js';
import { getDocumentState, saveDocumentState } from './persistence.js';
import { validateTicket } from './ws-ticket.js';

// y-websocket ships its server helpers as CommonJS; load them through require.
const require = createRequire(import.meta.url);
const { setupWSConnection, setPersistence, docs } = require('y-websocket/bin/utils');

const WS_PATH_PREFIX = '/yjs/';
const PERSIST_DEBOUNCE_MS = Number(process.env.YJS_PERSIST_DEBOUNCE_MS ?? 2000);

// Per-document debounce timers so a burst of edits coalesces into one write.
const saveTimers = new Map();

async function persistDoc(docName, ydoc) {
  try {
    await saveDocumentState(docName, Y.encodeStateAsUpdate(ydoc));
  } catch (err) {
    logger.error({ err, docName }, 'failed to persist yjs state');
  }
}

function scheduleSave(docName, ydoc) {
  clearTimeout(saveTimers.get(docName));
  saveTimers.set(
    docName,
    setTimeout(() => {
      saveTimers.delete(docName);
      persistDoc(docName, ydoc);
    }, PERSIST_DEBOUNCE_MS),
  );
}

// D1/D2: y-websocket owns the single Y.Doc; bindState is awaited before the
// socket binds, so persisted state is applied before any client can sync.
setPersistence({
  async bindState(docName, ydoc) {
    const persisted = await getDocumentState(docName);
    if (persisted) Y.applyUpdate(ydoc, persisted);
    ydoc.on('update', () => scheduleSave(docName, ydoc));
  },
  async writeState(docName, ydoc) {
    clearTimeout(saveTimers.get(docName));
    saveTimers.delete(docName);
    await persistDoc(docName, ydoc);
  },
});

/** Flush every active room to the DB. Called during graceful shutdown (D8). */
export async function flushAllRooms() {
  for (const [docName, ydoc] of docs) {
    clearTimeout(saveTimers.get(docName));
    await persistDoc(docName, ydoc);
  }
  saveTimers.clear();
}

/** Extract the documentId from a /yjs/<documentId> URL. Returns null if absent. */
export function extractDocName(url) {
  if (!url || !url.startsWith(WS_PATH_PREFIX)) return null;
  const afterPrefix = url.slice(WS_PATH_PREFIX.length).split('?')[0];
  return afterPrefix.length > 0 ? decodeURIComponent(afterPrefix) : null;
}

/** Extract the ?ticket=... query param from the upgrade URL. */
export function extractTicket(url) {
  const queryString = url?.split('?')[1];
  if (!queryString) return null;
  return new URLSearchParams(queryString).get('ticket');
}

/**
 * Decide whether to accept a WebSocket upgrade.
 * Rejects non-/yjs paths and browser origins that don't match CLIENT_ORIGIN.
 * (Phase 6 adds the WS-ticket auth + per-document permission check.)
 */
export function isAllowedUpgrade(req) {
  if (!extractDocName(req.url)) return false;
  const origin = req.headers?.origin;
  const allowed = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
  // Browsers always send Origin; reject mismatches. Absent origin = non-browser client.
  if (origin && origin !== allowed) return false;
  return true;
}

export function setupYjsWebSocket(httpServer) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (conn, req) => {
    const docName = extractDocName(req.url);
    setupWSConnection(conn, req, { docName, gc: true });
  });

  const reject = (socket, line) => {
    socket.write(`HTTP/1.1 ${line}\r\n\r\n`);
    socket.destroy();
  };

  httpServer.on('upgrade', (req, socket, head) => {
    void (async () => {
      if (!isAllowedUpgrade(req)) return reject(socket, '400 Bad Request');

      const docName = extractDocName(req.url);
      const auth = await validateTicket(extractTicket(req.url));
      // Invalid/expired ticket → 4001; ticket bound to a different doc → 4003 (D3).
      if (!auth) return reject(socket, '401 Unauthorized');
      if (auth.documentId !== docName) return reject(socket, '403 Forbidden');

      req.userId = auth.userId;
      wss.handleUpgrade(req, socket, head, (conn) => {
        wss.emit('connection', conn, req);
      });
    })();
  });

  logger.info('yjs websocket server attached at /yjs');
  return wss;
}
