import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { usePresence } from './use-presence.js';

afterEach(cleanup);

function makeProvider(states, clientID = 1) {
  return {
    awareness: {
      clientID,
      getStates: () => new Map(states),
      setLocalStateField: () => {},
      setLocalState: () => {},
      on: () => {},
      off: () => {},
    },
  };
}

function Harness({ provider, user }) {
  const { collaborators } = usePresence(provider, user);
  return <div data-testid="c">{collaborators.map((c) => c.userId).join(',')}</div>;
}

describe('usePresence', () => {
  it('excludes self and de-duplicates remotes by userId', () => {
    const provider = makeProvider([
      [1, { user: { userId: 'self', name: 'Me', color: '#fff' } }],
      [2, { user: { userId: 'bob', name: 'Bob', color: '#0f0' } }],
      [3, { user: { userId: 'bob', name: 'Bob (tab 2)', color: '#0f0' } }],
    ]);
    render(<Harness provider={provider} user={{ id: 'self', username: 'Me' }} />);
    expect(screen.getByTestId('c').textContent).toBe('bob');
  });

  it('renders no collaborators when alone', () => {
    const provider = makeProvider([[1, { user: { userId: 'self', name: 'Me' } }]]);
    render(<Harness provider={provider} user={{ id: 'self', username: 'Me' }} />);
    expect(screen.getByTestId('c').textContent).toBe('');
  });
});
