import { render, cleanup, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Track provider instances to assert lifecycle.
const instances = [];

vi.mock('y-websocket', () => {
  class FakeWebsocketProvider {
    constructor(url, room, doc) {
      this.url = url;
      this.room = room;
      this.doc = doc;
      this.awareness = { setLocalStateField: vi.fn(), on: vi.fn(), off: vi.fn() };
      this.handlers = {};
      this.destroyed = false;
      instances.push(this);
    }
    on(event, cb) {
      this.handlers[event] = cb;
    }
    off() {}
    destroy() {
      this.destroyed = true;
    }
  }
  return { WebsocketProvider: FakeWebsocketProvider };
});

import { useYjs } from './use-yjs.js';

function Harness({ documentId }) {
  const { yText, status } = useYjs(documentId);
  return <div data-testid="status">{yText ? `ready:${status}` : 'pending'}</div>;
}

afterEach(() => {
  cleanup();
  instances.length = 0;
});

describe('useYjs', () => {
  it('creates exactly one provider and exposes yText', async () => {
    let utils;
    await act(async () => {
      utils = render(<Harness documentId="doc-1" />);
    });
    expect(instances).toHaveLength(1);
    expect(instances[0].room).toBe('doc-1');
    expect(utils.getByTestId('status').textContent).toMatch(/^ready:/);
  });

  it('destroys the provider on unmount (no duplicate-provider leak)', async () => {
    let utils;
    await act(async () => {
      utils = render(<Harness documentId="doc-1" />);
    });
    await act(async () => {
      utils.unmount();
    });
    expect(instances).toHaveLength(1);
    expect(instances[0].destroyed).toBe(true);
  });
});
