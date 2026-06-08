import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/auth-service.js', () => ({
  loginRequest: vi.fn(),
  registerRequest: vi.fn(),
  logoutRequest: vi.fn(),
  refreshRequest: vi.fn(),
  meRequest: vi.fn(),
}));

import {
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
} from '../services/auth-service.js';
import { useAuthStore } from './auth-store.js';

const reset = () => useAuthStore.setState({ user: null, accessToken: null, status: 'idle' });

beforeEach(() => {
  vi.clearAllMocks();
  reset();
});

describe('auth store', () => {
  it('login sets the session as authenticated', async () => {
    loginRequest.mockResolvedValue({ user: { id: 'u1', username: 'amy' }, accessToken: 'tok' });

    await useAuthStore.getState().login('a@b.com', 'pw');

    const s = useAuthStore.getState();
    expect(s.status).toBe('authenticated');
    expect(s.accessToken).toBe('tok');
    expect(s.user.username).toBe('amy');
  });

  it('logout clears the session even if the request fails', async () => {
    useAuthStore.setState({ user: { id: 'u1' }, accessToken: 'tok', status: 'authenticated' });
    logoutRequest.mockRejectedValue(new Error('network'));

    await useAuthStore.getState().logout();

    const s = useAuthStore.getState();
    expect(s.status).toBe('unauthenticated');
    expect(s.accessToken).toBeNull();
  });

  it('initialize restores a session from the refresh cookie', async () => {
    refreshRequest.mockResolvedValue({ accessToken: 'fresh' });
    meRequest.mockResolvedValue({ user: { id: 'u1', username: 'amy' } });

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe('authenticated');
    expect(useAuthStore.getState().accessToken).toBe('fresh');
  });

  it('initialize falls back to unauthenticated when refresh fails', async () => {
    refreshRequest.mockRejectedValue(new Error('no cookie'));

    await useAuthStore.getState().initialize();

    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
