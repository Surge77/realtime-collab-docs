import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '../store/auth-store.js';
import { createDocument, deleteDocument, listDocuments } from '../services/document-service.js';

export function Home() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    listDocuments()
      .then((docs) => active && setDocuments(docs))
      .catch(() => active && setError('Failed to load documents'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const handleCreate = async () => {
    const doc = await createDocument();
    navigate(`/doc/${doc.id}`);
  };

  const handleDelete = async (id) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="home">
      <header className="home-header">
        <span className="app-logo">CollabDocs</span>
        <div className="home-user">
          <span>{user?.username}</span>
          <button onClick={() => logout()}>Sign out</button>
        </div>
      </header>

      <main className="home-main">
        <div className="home-toolbar">
          <h2>Your documents</h2>
          <button onClick={handleCreate}>New document</button>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && documents.length === 0 && <p>No documents yet. Create one!</p>}

        <ul className="doc-list">
          {documents.map((doc) => (
            <li key={doc.id} className="doc-item">
              <button className="doc-open" onClick={() => navigate(`/doc/${doc.id}`)}>
                <span className="doc-title">{doc.title}</span>
                <span className="doc-meta">
                  {new Date(doc.updatedAt).toLocaleString()}
                </span>
              </button>
              <button className="doc-delete" onClick={() => handleDelete(doc.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
