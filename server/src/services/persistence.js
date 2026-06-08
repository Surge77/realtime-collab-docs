import { query } from '../db/connection.js';

const FK_VIOLATION = '23503';

/**
 * Load the persisted binary Yjs state for a document.
 * @param {string} documentId
 * @returns {Promise<Buffer|null>}
 */
export async function getDocumentState(documentId) {
  const { rows } = await query(
    'SELECT yjs_state FROM document_updates WHERE document_id = $1',
    [documentId],
  );
  return rows[0]?.yjs_state ?? null;
}

/**
 * Upsert the compacted binary Yjs state for a document. Returns false (without
 * throwing) when the document no longer exists — ephemeral/unknown rooms simply
 * are not persisted.
 * @param {string} documentId
 * @param {Uint8Array} state
 * @returns {Promise<boolean>} whether the state was written
 */
export async function saveDocumentState(documentId, state) {
  try {
    await query(
      `INSERT INTO document_updates (document_id, yjs_state, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (document_id)
       DO UPDATE SET yjs_state = EXCLUDED.yjs_state, updated_at = NOW()`,
      [documentId, Buffer.from(state)],
    );
    return true;
  } catch (err) {
    if (err.code === FK_VIOLATION) return false;
    throw err;
  }
}
