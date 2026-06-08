import { create } from 'zustand';

import { configureAuth } from '../services/api.js';
import {
  loginRequest,
  logoutRequest,
  meRequest,
  refreshRequest,
  registerRequest,
} from '../services/auth-service.js';

// status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  status: 'idle',

  setSession: ({ user, accessToken }) => set({ user, accessToken, status: 'authenticated' }),
  clearSession: () => set({ user: null, accessToken: null, status: 'unauthenticated' }),

  async login(email, password) {
    const data = await loginRequest({ email, password });
    get().setSession(data);
    return data.user;
  },

  async register(email, username, password) {
    const data = await registerRequest({ email, username, password });
    get().setSession(data);
    return data.user;
  },

  async logout() {
    // Always clear locally; a failed server call must not block sign-out.
    try {
      await logoutRequest();
    } catch {
      /* ignore — session is cleared regardless */
    }
    get().clearSession();
  },

  // Restore a session on app mount using the httpOnly refresh cookie.
  async initialize() {
    set({ status: 'loading' });
    try {
      const { accessToken } = await refreshRequest();
      set({ accessToken });
      const { user } = await meRequest();
      set({ user, status: 'authenticated' });
    } catch {
      get().clearSession();
    }
  },
}));

// Wire the API client to the store (token access, silent refresh, logout on failure).
configureAuth({
  getToken: () => useAuthStore.getState().accessToken,
  refresh: async () => {
    const { accessToken } = await refreshRequest();
    useAuthStore.setState({ accessToken });
    return accessToken;
  },
  onFailure: () => useAuthStore.getState().clearSession(),
});
