import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as encoding from 'lib0/encoding';

import { isReadOnlyAllowed } from '../src/services/yjs-server.js';

function msg(...varUints) {
  const e = encoding.createEncoder();
  for (const n of varUints) encoding.writeVarUint(e, n);
  return encoding.toUint8Array(e);
}

describe('isReadOnlyAllowed', () => {
  it('allows sync step1 (read request)', () => {
    assert.equal(isReadOnlyAllowed(msg(0, 0)), true);
  });
  it('blocks sync step2 (write) and updates', () => {
    assert.equal(isReadOnlyAllowed(msg(0, 1)), false);
    assert.equal(isReadOnlyAllowed(msg(0, 2)), false);
  });
  it('allows awareness messages', () => {
    assert.equal(isReadOnlyAllowed(msg(1)), true);
  });
});
