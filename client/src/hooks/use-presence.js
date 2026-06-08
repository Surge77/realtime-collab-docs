import { useEffect, useState } from 'react';

/**
 * Publish the local user into Yjs awareness and track remote collaborators.
 * Self is excluded and remotes are de-duplicated by userId (two tabs of the
 * same user count once).
 *
 * @param {import('y-websocket').WebsocketProvider|null} provider
 * @param {{ id: string, username: string, avatarColor?: string }|null} user
 * @returns {{ collaborators: { userId: string, name: string, color: string }[] }}
 */
export function usePresence(provider, user) {
  const [collaborators, setCollaborators] = useState([]);

  useEffect(() => {
    if (!provider || !user) return undefined;
    const { awareness } = provider;

    awareness.setLocalStateField('user', {
      userId: user.id,
      name: user.username,
      color: user.avatarColor ?? '#6366f1',
    });

    const update = () => {
      const byUserId = new Map();
      for (const [clientId, state] of awareness.getStates()) {
        const u = state?.user;
        if (!u || clientId === awareness.clientID) continue;
        if (!byUserId.has(u.userId)) {
          byUserId.set(u.userId, { userId: u.userId, name: u.name, color: u.color });
        }
      }
      setCollaborators([...byUserId.values()]);
    };

    awareness.on('change', update);
    update();

    return () => {
      awareness.off('change', update);
      awareness.setLocalState(null);
    };
  }, [provider, user]);

  return { collaborators };
}
