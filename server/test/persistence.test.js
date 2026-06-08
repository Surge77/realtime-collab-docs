process.env.NODE_ENV = 'test';

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import * as Y from 'yjs';

import { getDocumentState, saveDocumentState } from '../src/services/persistence.js';
import { createUser } from '../src/models/user.js';
import { createDocument } from '../src/models/document.js';
import { pool, closePool } from '../src/db/connection.js';
import { closeRedis } from '../src/services/redis-client.js';

let docId;
let userEmail;

before(async () => {
  const id = randomUUID().slice(0, 8);
  userEmail = `persist_${id}@example.com`;
  const user = await createUser({
    email: userEmail,
    username: `persist_${id}`,
    passwordHash: 'x',
  });
  const doc = await createDocument({ title: 'Persist Test', ownerId: user.id });
  docId = doc.id;
});

after(async () => {
  await pool.query('DELETE FROM users WHERE email = $1', [userEmail]).catch(() => {});
  await closePool().catch(() => {});
  await closeRedis().catch(() => {});
});

describe('persistence', () => {
  it('round-trips Yjs state and survives a simulated restart', async () => {
    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'persisted text');

    const written = await saveDocumentState(docId, Y.encodeStateAsUpdate(doc));
    assert.equal(written, true);

    // Simulate a fresh process: load from DB into a brand-new doc.
    const loaded = await getDocumentState(docId);
    assert.ok(loaded);
    const restored = new Y.Doc();
    Y.applyUpdate(restored, loaded);
    assert.equal(restored.getText('content').toString(), 'persisted text');
  });

  it('upserts (latest write wins)', async () => {
    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'v1');
    await saveDocumentState(docId, Y.encodeStateAsUpdate(doc));
    doc.getText('content').insert(2, ' v2');
    await saveDocumentState(docId, Y.encodeStateAsUpdate(doc));

    const restored = new Y.Doc();
    Y.applyUpdate(restored, await getDocumentState(docId));
    assert.equal(restored.getText('content').toString(), 'v1 v2');
  });

  it('does not persist (returns false) for an unknown document', async () => {
    const written = await saveDocumentState(randomUUID(), new Uint8Array([1, 2, 3]));
    assert.equal(written, false);
  });
});
