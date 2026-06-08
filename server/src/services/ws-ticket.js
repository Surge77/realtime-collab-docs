import { randomBytes } from 'node:crypto';

import { redis } from './redis-client.js';

const TTL_SECONDS = Number(process.env.WS_TICKET_TTL_SECONDS ?? 60);
const ticketKey = (token) => `wsticket:${token}`;

/**
 * Mint a short-lived, document-scoped WebSocket ticket. The JWT never travels
 * in the WS URL — this opaque token does. Reusable within its TTL (so provider
 * reconnects work); bound to { userId, documentId } so it can't be replayed on
 * another document (D3).
 *
 * @param {string} userId
 * @param {string} documentId
 * @param {string} [role='editor']  the user's role on the document
 * @returns {Promise<string>} the ticket token
 */
export async function createTicket(userId, documentId, role = 'editor') {
  const token = randomBytes(24).toString('hex');
  await redis.set(
    ticketKey(token),
    JSON.stringify({ userId, documentId, role }),
    'EX',
    TTL_SECONDS,
  );
  return token;
}

/**
 * Validate a ticket and return its { userId, documentId }, or null if missing
 * or expired. Does not delete it (reusable within TTL for reconnects).
 *
 * @param {string} token
 * @returns {Promise<{ userId: string, documentId: string }|null>}
 */
export async function validateTicket(token) {
  if (!token) return null;
  const raw = await redis.get(ticketKey(token));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
