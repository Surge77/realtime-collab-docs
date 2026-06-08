import { query } from '../db/connection.js';

const FIELDS = `id, title, owner_id AS "ownerId", is_public AS "isPublic",
                created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function createDocument({ title, ownerId }) {
  const { rows } = await query(
    `INSERT INTO documents (title, owner_id) VALUES ($1, $2) RETURNING ${FIELDS}`,
    [title, ownerId],
  );
  return rows[0];
}

/** Documents the user owns. (Phase 7 will union in shared documents.) */
export async function listForUser(userId) {
  const { rows } = await query(
    `SELECT ${FIELDS} FROM documents WHERE owner_id = $1 ORDER BY updated_at DESC`,
    [userId],
  );
  return rows;
}

export async function findById(id) {
  const { rows } = await query(`SELECT ${FIELDS} FROM documents WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function updateTitle(id, title) {
  const { rows } = await query(
    `UPDATE documents SET title = $2, updated_at = NOW() WHERE id = $1 RETURNING ${FIELDS}`,
    [id, title],
  );
  return rows[0] ?? null;
}

export async function deleteById(id) {
  await query('DELETE FROM documents WHERE id = $1', [id]);
}
