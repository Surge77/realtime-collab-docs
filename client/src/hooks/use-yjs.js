import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

import { getWsTicket } from '../services/document-service.js';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000';

/**
 * Fetch a short-lived WS ticket, then create a Y.Doc + WebsocketProvider for
 * the document and tear them down cleanly. Exactly one provider per mount.
 * `synced` gates the editor until first sync (D9). The JWT is never put in the
 * URL — the opaque ticket is (Phase 6).
 *
 * @param {string} documentId
 * @returns {{ ydoc: Y.Doc|null, provider: WebsocketProvider|null,
 *             yText: Y.Text|null, synced: boolean, status: string }}
 */
export function useYjs(documentId) {
  const [conn, setConn] = useState(null);
  const [synced, setSynced] = useState(false);
  const [status, setStatus] = useState('connecting');

  useEffect(() => {
    let cancelled = false;
    let provider;
    let ydoc;

    const onStatus = (event) => setStatus(event.status);
    const onSync = (isSynced) => setSynced(isSynced);

    setStatus('connecting');
    setSynced(false);

    (async () => {
      try {
        const ticket = await getWsTicket(documentId);
        if (cancelled) return;
        ydoc = new Y.Doc();
        provider = new WebsocketProvider(`${WS_URL}/yjs`, documentId, ydoc, {
          params: { ticket },
        });
        provider.on('status', onStatus);
        provider.on('sync', onSync);
        setConn({ ydoc, provider });
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      provider?.off('status', onStatus);
      provider?.off('sync', onSync);
      provider?.destroy();
      ydoc?.destroy();
      setConn(null);
      setSynced(false);
      setStatus('connecting');
    };
  }, [documentId]);

  return {
    ydoc: conn?.ydoc ?? null,
    provider: conn?.provider ?? null,
    yText: conn?.ydoc?.getText('content') ?? null,
    synced,
    status,
  };
}
