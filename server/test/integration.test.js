process.env.NODE_ENV = 'test';

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { pool, closePool } from '../src/db/connection.js';
import { closeRedis } from '../src/services/redis-client.js';

const app = createApp();
const createdEmails = [];

function uniqueUser() {
  const id = randomUUID().slice(0, 8);
  const email = `test_${id}@example.com`;
  createdEmails.push(email);
  return { email, username: `user_${id}`, password: 'supersecret123' };
}

async function registerUser(agent = request(app)) {
  const user = uniqueUser();
  const res = await agent.post('/api/auth/register').send(user);
  return { user, res };
}

after(async () => {
  for (const email of createdEmails) {
    await pool.query('DELETE FROM users WHERE email = $1', [email]).catch(() => {});
  }
  await closePool().catch(() => {});
  await closeRedis().catch(() => {});
});

describe('health', () => {
  it('GET /healthz reports ok when both stores are reachable', async () => {
    const res = await request(app).get('/healthz');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.checks.postgres, true);
    assert.equal(res.body.checks.redis, true);
  });
});

describe('auth', () => {
  it('registers a user, returns access token, sets refresh cookie', async () => {
    const { res } = await registerUser();
    assert.equal(res.status, 201);
    assert.ok(res.body.accessToken);
    assert.ok(res.body.user.id);
    assert.equal(res.body.user.password, undefined, 'must not leak password');
    const cookie = res.headers['set-cookie']?.[0] ?? '';
    assert.match(cookie, /refreshToken=/);
    assert.match(cookie, /HttpOnly/i);
  });

  it('rejects duplicate email with 409', async () => {
    const { user } = await registerUser();
    const res = await request(app).post('/api/auth/register').send(user);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  it('rejects invalid registration with 400 + field details', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'nope', username: 'x', password: 'short' });
    assert.equal(res.status, 400);
    assert.ok(Array.isArray(res.body.error.details));
  });

  it('logs in with correct credentials, 401 on wrong password', async () => {
    const { user } = await registerUser();
    const ok = await request(app).post('/api/auth/login').send(user);
    assert.equal(ok.status, 200);
    assert.ok(ok.body.accessToken);

    const bad = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpassword' });
    assert.equal(bad.status, 401);
  });

  it('GET /me requires a valid token', async () => {
    const { res } = await registerUser();
    const token = res.body.accessToken;

    const authed = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(authed.status, 200);
    assert.ok(authed.body.user.id);

    const anon = await request(app).get('/api/auth/me');
    assert.equal(anon.status, 401);
  });

  it('refreshes the access token using the cookie', async () => {
    const agent = request.agent(app);
    await registerUser(agent);
    const res = await agent.post('/api/auth/refresh').send();
    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken);
  });

  it('rotates the refresh token and detects reuse of the old one', async () => {
    const { res } = await registerUser();
    const oldCookie = res.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));

    // First refresh with the original cookie succeeds and rotates the token.
    const first = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);
    assert.equal(first.status, 200);

    // Reusing the now-rotated original cookie must fail (reuse detection).
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', oldCookie);
    assert.equal(reuse.status, 401);

    // And the session is revoked: the rotated cookie is now dead too.
    const newCookie = first.headers['set-cookie'].find((c) => c.startsWith('refreshToken='));
    const afterRevoke = await request(app).post('/api/auth/refresh').set('Cookie', newCookie);
    assert.equal(afterRevoke.status, 401);
  });
});

describe('documents', () => {
  it('creates, lists, fetches, renames and deletes an owned document', async () => {
    const { res } = await registerUser();
    const token = res.body.accessToken;
    const auth = (req) => req.set('Authorization', `Bearer ${token}`);

    const created = await auth(request(app).post('/api/documents').send({ title: 'My Doc' }));
    assert.equal(created.status, 201);
    const id = created.body.document.id;

    const listed = await auth(request(app).get('/api/documents'));
    assert.equal(listed.status, 200);
    assert.ok(listed.body.documents.some((d) => d.id === id));

    const renamed = await auth(request(app).patch(`/api/documents/${id}`).send({ title: 'Renamed' }));
    assert.equal(renamed.status, 200);
    assert.equal(renamed.body.document.title, 'Renamed');

    const removed = await auth(request(app).delete(`/api/documents/${id}`));
    assert.equal(removed.status, 204);
  });

  it('blocks access without a token (401)', async () => {
    const res = await request(app).get('/api/documents');
    assert.equal(res.status, 401);
  });

  it("forbids accessing another user's private document (403)", async () => {
    const a = await registerUser();
    const b = await registerUser();
    const created = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${a.res.body.accessToken}`)
      .send({ title: 'A private doc' });
    const id = created.body.document.id;

    const res = await request(app)
      .get(`/api/documents/${id}`)
      .set('Authorization', `Bearer ${b.res.body.accessToken}`);
    assert.equal(res.status, 403);
  });

  it('returns 404 for a missing document', async () => {
    const { res } = await registerUser();
    const missing = await request(app)
      .get(`/api/documents/${randomUUID()}`)
      .set('Authorization', `Bearer ${res.body.accessToken}`);
    assert.equal(missing.status, 404);
  });
});
