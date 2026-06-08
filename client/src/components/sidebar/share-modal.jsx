import { useEffect, useState } from 'react';

import {
  listCollaborators,
  removeCollaborator,
  shareDocument,
} from '../../services/document-service.js';

/**
 * Owner-only modal to invite collaborators by email and manage access.
 * @param {{ documentId: string, onClose: () => void }} props
 */
export function ShareModal({ documentId, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [collaborators, setCollaborators] = useState([]);
  const [error, setError] = useState(null);

  const refresh = () => listCollaborators(documentId).then(setCollaborators).catch(() => {});

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const handleShare = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await shareDocument(documentId, email, role);
      setEmail('');
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error?.message ?? 'Could not share');
    }
  };

  const handleRemove = async (userId) => {
    await removeCollaborator(documentId, userId);
    await refresh();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-label="Share document" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Share document</h2>
        <form className="share-form" onSubmit={handleShare}>
          <input
            type="email"
            placeholder="person@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Collaborator email"
          />
          <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button type="submit">Invite</button>
        </form>
        {error && <p role="alert" className="auth-error">{error}</p>}

        <ul className="collab-manage">
          {collaborators.map((c) => (
            <li key={c.userId}>
              <span>{c.username} · {c.role}</span>
              <button onClick={() => handleRemove(c.userId)}>Remove</button>
            </li>
          ))}
        </ul>

        <button className="modal-close" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
