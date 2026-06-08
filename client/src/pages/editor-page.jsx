import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CollabEditor } from '../components/editor/collab-editor.jsx';
import { getDocument } from '../services/document-service.js';

// Phase 3: loads metadata and renders the local editor. Phase 4 swaps the
// editor's local state for the live Yjs binding using this documentId.
export function EditorPage() {
  const { id } = useParams();
  const [document, setDocument] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | forbidden | error

  useEffect(() => {
    let active = true;
    getDocument(id)
      .then((doc) => {
        if (!active) return;
        setDocument(doc);
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
      </header>
      <main className="editor-page-main">
        <CollabEditor documentId={id} />
      </main>
    </div>
  );
}
