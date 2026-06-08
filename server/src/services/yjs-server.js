import { createRequire } from 'node:module';

import { WebSocketServer } from 'ws';

import { logger } from '../utils/logger.js';

// y-websocket ships its server helpers as CommonJS; load them through require.
const require = createRequire(import.meta.url);
const { setupWSConnection } = require('y-websocket/bin/utils');

const WS_PATH_PREFIX = '/yjs/';

/** Extract the documentId from a /yjs/<documentId> URL. Returns null if absent. */
export function extractDocName(url) {
  if (!url || !url.startsWith(WS_PATH_PREFIX)) return null;
  const afterPrefix = url.slice(WS_PATH_PREFIX.length).split('?')[0];
  return afterPrefix.length > 0 ? decodeURIComponent(afterPrefix) : null;
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

  httpServer.on('upgrade', (req, socket, head) => {
    if (!isAllowedUpgrade(req)) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (conn) => {
      wss.emit('connection', conn, req);
    });
  });

  logger.info('yjs websocket server attached at /yjs');
  return wss;
}
