import { render, cleanup, act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const instances = [];

vi.mock('y-websocket', () => {
  class FakeWebsocketProvider {
    constructor(url, room, doc, opts) {
      this.url = url;
      this.room = room;
      this.doc = doc;
      this.opts = opts;
      this.awareness = { setLocalStateField: vi.fn(), on: vi.fn(), off: vi.fn() };
      this.destroyed = false;
      instances.push(this);
    }
    on() {}
    off() {}
    destroy() {
      this.destroyed = true;
    }
  }
  return { WebsocketProvider: FakeWebsocketProvider };
});

vi.mock('../services/document-service.js', () => ({
  getWsTicket: vi.fn().mockResolvedValue('ticket-123'),
}));

import { useYjs } from './use-yjs.js';

function Harness({ documentId }) {
  const { yText } = useYjs(documentId);
  return <div data-testid="status">{yText ? 'ready' : 'pending'}</div>;
}

afterEach(() => {
  cleanup();
  instances.length = 0;
});

describe('useYjs', () => {
  it('fetches a ticket then creates exactly one provider with it', async () => {
    let utils;
    await act(async () => {
      utils = render(<Harness documentId="doc-1" />);
    });
    await waitFor(() => expect(instances).toHaveLength(1));
    expect(instances[0].room).toBe('doc-1');
    expect(instances[0].opts.params.ticket).toBe('ticket-123');
    await waitFor(() => expect(utils.getByTestId('status').textContent).toBe('ready'));
  });

  it('destroys the provider on unmount (no duplicate-provider leak)', async () => {
    let utils;
    await act(async () => {
      utils = render(<Harness documentId="doc-1" />);
    });
    await waitFor(() => expect(instances).toHaveLength(1));
    await act(async () => {
      utils.unmount();
    });
    expect(instances[0].destroyed).toBe(true);
  });
});
