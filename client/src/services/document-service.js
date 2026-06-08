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
  return { document: data.document, role: data.role };
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

export async function shareDocument(id, email, role) {
  const { data } = await api.post(`/documents/${id}/share`, { email, role });
  return data.collaborator;
}

export async function listCollaborators(id) {
  const { data } = await api.get(`/documents/${id}/collaborators`);
  return data.collaborators;
}

export async function removeCollaborator(id, userId) {
  await api.delete(`/documents/${id}/collaborators/${userId}`);
}
