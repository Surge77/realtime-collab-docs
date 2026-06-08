process.env.NODE_ENV = 'test';

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

import { createTicket, validateTicket } from '../src/services/ws-ticket.js';
import { closeRedis } from '../src/services/redis-client.js';

after(async () => {
  await closeRedis().catch(() => {});
});

describe('ws-ticket', () => {
  it('mints a ticket that validates to its userId + documentId', async () => {
    const userId = randomUUID();
    const documentId = randomUUID();
    const token = await createTicket(userId, documentId);

    const payload = await validateTicket(token);
    assert.equal(payload.userId, userId);
    assert.equal(payload.documentId, documentId);
  });

  it('returns null for an unknown ticket', async () => {
    assert.equal(await validateTicket('does-not-exist'), null);
    assert.equal(await validateTicket(null), null);
  });

  it('binds the ticket to a single document', async () => {
    const userId = randomUUID();
    const docA = randomUUID();
    const token = await createTicket(userId, docA);

    const payload = await validateTicket(token);
    // The upgrade handler rejects when payload.documentId !== requested doc.
    assert.notEqual(payload.documentId, randomUUID());
    assert.equal(payload.documentId, docA);
  });
});
