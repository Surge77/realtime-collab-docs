import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CollabEditor } from '../components/editor/collab-editor.jsx';
import { ShareModal } from '../components/sidebar/share-modal.jsx';
import { getDocument } from '../services/document-service.js';

// Loads metadata + the user's role, then renders the collaborative editor.
export function EditorPage() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | forbidden | error
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let active = true;
    getDocument(id)
      .then(({ document: doc, role: docRole }) => {
        if (!active) return;
        setDocument(doc);
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

  if (status === 'loading') return <div className="route-loading">Loading document…</div>;
  if (status === 'forbidden') return <div className="route-error">You don’t have access to this document.</div>;
  if (status === 'error') return <div className="route-error">Could not load this document.</div>;

  return (
    <div className="editor-page">
      <header className="editor-topbar">
        <Link to="/" className="back-link">← Documents</Link>
        <span className="editor-title">{document.title}</span>
        {role === 'owner' && <button onClick={() => setShowShare(true)}>Share</button>}
      </header>
      <main className="editor-page-main">
        <CollabEditor documentId={id} />
      </main>
      {showShare && <ShareModal documentId={id} onClose={() => setShowShare(false)} />}
    </div>
  );
}
