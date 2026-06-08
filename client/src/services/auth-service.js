import { api } from './api.js';

export async function registerRequest({ email, username, password }) {
  const { data } = await api.post('/auth/register', { email, username, password });
  return data; // { user, accessToken }
}

export async function loginRequest({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data; // { user, accessToken }
}

export async function refreshRequest() {
  const { data } = await api.post('/auth/refresh');
  return data; // { accessToken }
}

export async function logoutRequest() {
  await api.post('/auth/logout');
}

export async function meRequest() {
  const { data } = await api.get('/auth/me');
  return data; // { user }
}
