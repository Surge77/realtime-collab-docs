import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { extractDocName, isAllowedUpgrade } from '../src/services/yjs-server.js';

describe('extractDocName', () => {
  it('pulls the documentId from a /yjs/<id> url', () => {
    assert.equal(extractDocName('/yjs/abc-123'), 'abc-123');
    assert.equal(extractDocName('/yjs/abc-123?token=x'), 'abc-123');
  });

  it('returns null for non-/yjs or empty paths', () => {
    assert.equal(extractDocName('/socket/abc'), null);
    assert.equal(extractDocName('/yjs/'), null);
    assert.equal(extractDocName(undefined), null);
  });
});

describe('isAllowedUpgrade', () => {
  const allowed = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

  it('accepts a /yjs path with a matching origin', () => {
    assert.equal(isAllowedUpgrade({ url: '/yjs/doc1', headers: { origin: allowed } }), true);
  });

  it('accepts a /yjs path with no origin (non-browser client)', () => {
    assert.equal(isAllowedUpgrade({ url: '/yjs/doc1', headers: {} }), true);
  });

  it('rejects a mismatched origin', () => {
    assert.equal(
      isAllowedUpgrade({ url: '/yjs/doc1', headers: { origin: 'http://evil.test' } }),
      false,
    );
  });

  it('rejects a non-/yjs path', () => {
    assert.equal(isAllowedUpgrade({ url: '/api/documents', headers: { origin: allowed } }), false);
  });
});
