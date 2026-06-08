import { api } from './api.js';

export async function listDocuments() {
  const { data } = await api.get('/documents');
  return data.documents;
}

export async function createDocument(title) {
  const { data } = await api.post('/documents', title ? { title } : {});
  return data.document;
}

export async function getDocument(id) {
  const { data } = await api.get(`/documents/${id}`);
  return data.document;
}

export async function renameDocument(id, title) {
  const { data } = await api.patch(`/documents/${id}`, { title });
  return data.document;
}

export async function deleteDocument(id) {
  await api.delete(`/documents/${id}`);
}

export async function getWsTicket(id) {
  const { data } = await api.post(`/documents/${id}/ws-ticket`);
  return data.ticket;
}
