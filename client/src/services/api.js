import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send the httpOnly refresh cookie (D5)
});

// Lazily wired by the auth store to avoid an import cycle.
let getAccessToken = () => null;
let onRefresh = async () => null;
let onAuthFailure = () => {};

export function configureAuth({ getToken, refresh, onFailure }) {
  getAccessToken = getToken;
  onRefresh = refresh;
  onAuthFailure = onFailure;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Shared in-flight refresh so concurrent 401s trigger exactly one refresh.
let refreshPromise = null;

/**
 * Handle a 401 by refreshing once and retrying. Concurrent callers share the
 * same refresh promise. On refresh failure, trigger auth failure (logout).
 * Exported for unit testing the coordination logic.
 */
export async function handle401(error, deps) {
  const { refresh, retry, onFailure } = deps;
  if (!refreshPromise) {
    refreshPromise = refresh().finally(() => {
      refreshPromise = null;
    });
  }
  try {
    await refreshPromise;
  } catch {
    onFailure();
    throw error;
  }
  return retry(error.config);
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const original = error.config;
    const isAuthRoute = original?.url?.includes('/auth/');

    if (status === 401 && original && !original._retried && !isAuthRoute) {
      original._retried = true;
      return handle401(error, {
        refresh: onRefresh,
        retry: (config) => api(config),
        onFailure: onAuthFailure,
      });
    }
    return Promise.reject(error);
  },
);
