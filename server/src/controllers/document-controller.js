import { asyncHandler, badRequest, forbidden, notFound } from '../utils/errors.js';
import {
  createDocumentSchema,
  parseOrThrow,
  shareSchema,
  updateDocumentSchema,
} from '../utils/validation.js';
import {
  createDocument,
  deleteById,
  findById,
  listForUser,
  updateTitle,
} from '../models/document.js';
import { findByEmail } from '../models/user.js';
import {
  getPermissionRole,
  listCollaborators,
  removePermission,
  upsertPermission,
} from '../models/permission.js';
import { createTicket } from '../services/ws-ticket.js';

const DEFAULT_TITLE = 'Untitled Document';

/** Resolve a user's role on a document: owner | editor | viewer | null. */
async function resolveRole(document, userId) {
  if (document.ownerId === userId) return 'owner';
  const role = await getPermissionRole(document.id, userId);
  if (role) return role;
  if (document.isPublic) return 'viewer';
  return null;
}

async function loadOwnedDocument(id, userId) {
  const document = await findById(id);
  if (!document) throw notFound('Document not found');
  if (document.ownerId !== userId) throw forbidden('You do not own this document');
  return document;
}

export const list = asyncHandler(async (req, res) => {
  const documents = await listForUser(req.user.id);
  res.json({ documents });
});

export const create = asyncHandler(async (req, res) => {
  const { title } = parseOrThrow(createDocumentSchema, req.body ?? {});
  const document = await createDocument({ title: title ?? DEFAULT_TITLE, ownerId: req.user.id });
  res.status(201).json({ document });
});

export const get = asyncHandler(async (req, res) => {
  const document = await findById(req.params.id);
  if (!document) throw notFound('Document not found');
  const role = await resolveRole(document, req.user.id);
  if (!role) throw forbidden('You do not have access to this document');
  res.json({ document, role });
});

export const updateTitleHandler = asyncHandler(async (req, res) => {
  await loadOwnedDocument(req.params.id, req.user.id);
  const { title } = parseOrThrow(updateDocumentSchema, req.body);
  const document = await updateTitle(req.params.id, title);
  res.json({ document });
});

export const remove = asyncHandler(async (req, res) => {
  await loadOwnedDocument(req.params.id, req.user.id);
  await deleteById(req.params.id);
  res.status(204).send();
});

// Mint a short-lived WS ticket carrying the user's role (drives read-only).
export const wsTicket = asyncHandler(async (req, res) => {
  const document = await findById(req.params.id);
  if (!document) throw notFound('Document not found');
  const role = await resolveRole(document, req.user.id);
  if (!role) throw forbidden('You do not have access to this document');
  const ticket = await createTicket(req.user.id, document.id, role);
  res.json({ ticket });
});

export const share = asyncHandler(async (req, res) => {
  await loadOwnedDocument(req.params.id, req.user.id);
  const { email, role } = parseOrThrow(shareSchema, req.body);

  const target = await findByEmail(email);
  if (!target) throw notFound('No user with that email');
  if (target.id === req.user.id) throw badRequest('You already own this document');

  await upsertPermission(req.params.id, target.id, role);
  res.status(201).json({
    collaborator: { userId: target.id, username: target.username, email: target.email, role },
  });
});

export const removeCollaborator = asyncHandler(async (req, res) => {
  await loadOwnedDocument(req.params.id, req.user.id);
  await removePermission(req.params.id, req.params.userId);
  res.status(204).send();
});

export const collaborators = asyncHandler(async (req, res) => {
  const document = await findById(req.params.id);
  if (!document) throw notFound('Document not found');
  if (!(await resolveRole(document, req.user.id))) {
    throw forbidden('You do not have access to this document');
  }
  res.json({ collaborators: await listCollaborators(req.params.id) });
});
