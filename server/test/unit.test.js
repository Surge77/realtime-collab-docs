import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loginSchema, parseOrThrow, registerSchema } from '../src/utils/validation.js';
import { signAccessToken, verifyAccessToken } from '../src/utils/jwt.js';
import { ApiError } from '../src/utils/errors.js';

describe('validation', () => {
  it('accepts a valid registration and lowercases the email', () => {
    const data = parseOrThrow(registerSchema, {
      email: 'User@Example.com',
      username: 'valid_user',
      password: 'supersecret',
    });
    assert.equal(data.email, 'user@example.com');
  });

  it('rejects a short password with field-level details', () => {
    try {
      parseOrThrow(registerSchema, { email: 'a@b.com', username: 'abc', password: 'short' });
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(err instanceof ApiError);
      assert.equal(err.statusCode, 400);
      assert.ok(err.details.some((d) => d.field === 'password'));
    }
  });

  it('rejects an invalid username charset', () => {
    assert.throws(
      () => parseOrThrow(registerSchema, { email: 'a@b.com', username: 'bad name!', password: 'longenough' }),
      ApiError,
    );
  });

  it('login requires a non-empty password', () => {
    assert.throws(() => parseOrThrow(loginSchema, { email: 'a@b.com', password: '' }), ApiError);
  });
});

describe('jwt', () => {
  it('signs and verifies an access token round-trip', () => {
    const token = signAccessToken({ sub: 'u1', email: 'a@b.com', username: 'u' });
    const payload = verifyAccessToken(token);
    assert.equal(payload.sub, 'u1');
    assert.equal(payload.email, 'a@b.com');
  });

  it('rejects a tampered token', () => {
    const token = signAccessToken({ sub: 'u1', email: 'a@b.com', username: 'u' });
    assert.throws(() => verifyAccessToken(token + 'x'));
  });
});
