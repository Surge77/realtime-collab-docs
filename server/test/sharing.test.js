process.env.NODE_ENV = 'test';

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { pool, closePool } from '../src/db/connection.js';
import { closeRedis } from '../src/services/redis-client.js';

const app = createApp();
const emails = [];

async function register() {
  const id = randomUUID().slice(0, 8);
  const email = `share_${id}@example.com`;
  emails.push(email);
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, username: `share_${id}`, password: 'supersecret123' });
  return { token: res.body.accessToken, user: res.body.user, email };
}

const auth = (req, token) => req.set('Authorization', `Bearer ${token}`);

after(async () => {
  for (const email of emails) {
    await pool.query('DELETE FROM users WHERE email = $1', [email]).catch(() => {});
  }
  await closePool().catch(() => {});
  await closeRedis().catch(() => {});
});

describe('sharing & permissions', () => {
  it('owner shares editor access; collaborator gains access', async () => {
    const owner = await register();
    const editor = await register();
    const created = await auth(request(app).post('/api/documents').send({ title: 'Shared' }), owner.token);
    const docId = created.body.document.id;

    const shareRes = await auth(
      request(app).post(`/api/documents/${docId}/share`).send({ email: editor.email, role: 'editor' }),
      owner.token,
    );
    assert.equal(shareRes.status, 201);

    const getRes = await auth(request(app).get(`/api/documents/${docId}`), editor.token);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.role, 'editor');

    const listRes = await auth(request(app).get('/api/documents'), editor.token);
    assert.ok(listRes.body.documents.some((d) => d.id === docId));
  });

  it('non-owner cannot share or access a private document', async () => {
    const owner = await register();
    const outsider = await register();
    const created = await auth(request(app).post('/api/documents').send({ title: 'Private' }), owner.token);
    const docId = created.body.document.id;

    const getRes = await auth(request(app).get(`/api/documents/${docId}`), outsider.token);
    assert.equal(getRes.status, 403);

    const shareRes = await auth(
      request(app).post(`/api/documents/${docId}/share`).send({ email: outsider.email, role: 'editor' }),
      outsider.token,
    );
    assert.equal(shareRes.status, 403);
  });

  it('rejects self-share (400) and unknown email (404)', async () => {
    const owner = await register();
    const created = await auth(request(app).post('/api/documents').send({}), owner.token);
    const docId = created.body.document.id;

    const selfRes = await auth(
      request(app).post(`/api/documents/${docId}/share`).send({ email: owner.email, role: 'editor' }),
      owner.token,
    );
    assert.equal(selfRes.status, 400);

    const unknownRes = await auth(
      request(app).post(`/api/documents/${docId}/share`).send({ email: 'nobody@nowhere.test', role: 'viewer' }),
      owner.token,
    );
    assert.equal(unknownRes.status, 404);
  });

  it('lists and removes a collaborator', async () => {
    const owner = await register();
    const viewer = await register();
    const created = await auth(request(app).post('/api/documents').send({}), owner.token);
    const docId = created.body.document.id;

    await auth(
      request(app).post(`/api/documents/${docId}/share`).send({ email: viewer.email, role: 'viewer' }),
      owner.token,
    );

    const listRes = await auth(request(app).get(`/api/documents/${docId}/collaborators`), owner.token);
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.collaborators.some((c) => c.userId === viewer.user.id && c.role === 'viewer'));

    const delRes = await auth(
      request(app).delete(`/api/documents/${docId}/collaborators/${viewer.user.id}`),
      owner.token,
    );
    assert.equal(delRes.status, 204);

    const after = await auth(request(app).get(`/api/documents/${docId}`), viewer.token);
    assert.equal(after.status, 403);
  });
});
