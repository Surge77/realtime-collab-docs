import { asyncHandler, forbidden, notFound } from '../utils/errors.js';
import { createDocumentSchema, parseOrThrow, updateDocumentSchema } from '../utils/validation.js';
import {
  createDocument,
  deleteById,
  findById,
  listForUser,
  updateTitle,
} from '../models/document.js';

const DEFAULT_TITLE = 'Untitled Document';

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
  if (document.ownerId !== req.user.id && !document.isPublic) {
    throw forbidden('You do not have access to this document');
  }
  res.json({ document });
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
