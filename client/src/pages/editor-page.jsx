import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CollabEditor } from '../components/editor/collab-editor.jsx';
import { ShareModal } from '../components/sidebar/share-modal.jsx';
import { getDocument, renameDocument } from '../services/document-service.js';
import { useDebouncedCallback } from '../hooks/use-debounced-callback.js';

const TITLE_SAVE_DEBOUNCE_MS = 1000;

// Loads metadata + the user's role, then renders the collaborative editor.
export function EditorPage() {
  const { id } = useParams();
  const [title, setTitle] = useState('');
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | forbidden | error
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let active = true;
    getDocument(id)
      .then(({ document: doc, role: docRole }) => {
        if (!active) return;
        setTitle(doc.title);
        setRole(docRole);
        setStatus('ready');
      })
      .catch((err) => {
        if (!active) return;
        setStatus(err?.response?.status === 403 ? 'forbidden' : 'error');
      });
    return () => {
      active = false;
    };
  }, [id]);

  const saveTitle = useDebouncedCallback((value) => {
    renameDocument(id, value)
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('idle'));
  }, TITLE_SAVE_DEBOUNCE_MS);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    setSaveState('saving');
    saveTitle(e.target.value);
  };

  if (status === 'loading') return <div className="route-loading">Loading document…</div>;
  if (status === 'forbidden') return <div className="route-error">You don’t have access to this document.</div>;
  if (status === 'error') return <div className="route-error">Could not load this document.</div>;

  const canEdit = role === 'owner' || role === 'editor';

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <Link to="/" className="back-link">← Documents</Link>
        {canEdit ? (
          <input
            className="editor-title-input"
            value={title}
            onChange={handleTitleChange}
            aria-label="Document title"
          />
        ) : (
          <span className="editor-title">{title}</span>
        )}
        {saveState !== 'idle' && (
          <span className="save-state">{saveState === 'saving' ? 'Saving…' : 'Saved'}</span>
        )}
        {role === 'owner' && <button onClick={() => setShowShare(true)}>Share</button>}
      </header>
      <main className="editor-page-main">
        <CollabEditor documentId={id} />
      </main>
      {showShare && <ShareModal documentId={id} onClose={() => setShowShare(false)} />}
    </div>
  );
}
