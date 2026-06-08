import { query } from '../db/connection.js';

const PUBLIC_FIELDS = 'id, email, username, avatar_color AS "avatarColor", created_at AS "createdAt"';

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

function randomAvatarColor() {
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
}

export async function createUser({ email, username, passwordHash }) {
  const { rows } = await query(
    `INSERT INTO users (email, username, password_hash, avatar_color)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_FIELDS}`,
    [email, username, passwordHash, randomAvatarColor()],
  );
  return rows[0];
}

/** Returns the full row incl. password_hash — for auth only, never sent to client. */
export async function findByEmailWithHash(email) {
  const { rows } = await query(
    `SELECT id, email, username, password_hash AS "passwordHash",
            avatar_color AS "avatarColor"
     FROM users WHERE email = $1`,
    [email],
  );
  return rows[0] ?? null;
}

export async function findById(id) {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function findByEmail(email) {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE email = $1`, [email]);
  return rows[0] ?? null;
}

/** Returns 'email' | 'username' | null indicating which field already exists. */
export async function findConflict(email, username) {
  const { rows } = await query(
    'SELECT email, username FROM users WHERE email = $1 OR username = $2',
    [email, username],
  );
  for (const row of rows) {
    if (row.email === email) return 'email';
    if (row.username === username) return 'username';
  }
  return null;
}
