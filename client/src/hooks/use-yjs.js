import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000';

/**
 * Create a Y.Doc + WebsocketProvider for a document and tear them down cleanly.
 * Exactly one provider exists per mount (cleanup destroys it), avoiding the
 * duplicate-provider leak. `synced` gates the editor until first sync (D9).
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
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(`${WS_URL}/yjs`, documentId, ydoc);

    const onStatus = (event) => setStatus(event.status);
    const onSync = (isSynced) => setSynced(isSynced);
    provider.on('status', onStatus);
    provider.on('sync', onSync);

    setConn({ ydoc, provider });

    return () => {
      provider.off('status', onStatus);
      provider.off('sync', onSync);
      provider.destroy();
      ydoc.destroy();
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
