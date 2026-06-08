import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { yCollab } from 'y-codemirror.next';

import { baseExtensions } from './editor-extensions.js';
import { CollaboratorList } from '../sidebar/collaborator-list.jsx';
import { useYjs } from '../../hooks/use-yjs.js';
import { usePresence } from '../../hooks/use-presence.js';
import { useAuthStore } from '../../store/auth-store.js';

const STATUS_LABEL = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Disconnected',
};

/**
 * Collaborative CodeMirror editor bound to a document's shared Y.Text.
 * yCollab renders remote cursors/selections from awareness — no separate
 * cursor overlay is needed.
 *
 * @param {{ documentId: string }} props
 */
export function CollabEditor({ documentId }) {
  const { yText, provider, synced, status } = useYjs(documentId);
  const user = useAuthStore((s) => s.user);
  const { collaborators } = usePresence(provider, user);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!yText || !provider) return undefined;
    const view = new EditorView({
      state: EditorState.create({
        doc: yText.toString(),
        extensions: [...baseExtensions(), yCollab(yText, provider.awareness)],
      }),
      parent: containerRef.current,
    });
    return () => view.destroy();
  }, [yText, provider]);

  const dotStatus = synced ? 'connected' : status;

  return (
    <div className="collab-editor">
      <div className="conn-indicator">
        <span className="conn-dot" data-status={dotStatus} />
        {synced ? 'Synced' : (STATUS_LABEL[status] ?? status)}
        <CollaboratorList collaborators={collaborators} />
      </div>
      <div ref={containerRef} className="editor-surface" />
    </div>
  );
}
