import { query } from '../db/connection.js';

export async function upsertPermission(documentId, userId, role) {
  await query(
    `INSERT INTO document_permissions (document_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (document_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [documentId, userId, role],
  );
}

export async function removePermission(documentId, userId) {
  await query('DELETE FROM document_permissions WHERE document_id = $1 AND user_id = $2', [
    documentId,
    userId,
  ]);
}

export async function getPermissionRole(documentId, userId) {
  const { rows } = await query(
    'SELECT role FROM document_permissions WHERE document_id = $1 AND user_id = $2',
    [documentId, userId],
  );
  return rows[0]?.role ?? null;
}

export async function listCollaborators(documentId) {
  const { rows } = await query(
    `SELECT u.id AS "userId", u.username, u.email, u.avatar_color AS "avatarColor", p.role
     FROM document_permissions p
     JOIN users u ON u.id = p.user_id
     WHERE p.document_id = $1
     ORDER BY u.username`,
    [documentId],
  );
  return rows;
}
