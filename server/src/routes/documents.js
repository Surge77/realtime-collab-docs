import { Router } from 'express';

import {
  collaborators,
  create,
  get,
  list,
  remove,
  removeCollaborator,
  share,
  updateTitleHandler,
  wsTicket,
} from '../controllers/document-controller.js';
import { authenticate } from '../middleware/authenticate.js';

export const documentsRouter = Router();

documentsRouter.use(authenticate);

documentsRouter.get('/', list);
documentsRouter.post('/', create);
documentsRouter.get('/:id', get);
documentsRouter.patch('/:id', updateTitleHandler);
documentsRouter.delete('/:id', remove);
documentsRouter.post('/:id/ws-ticket', wsTicket);
documentsRouter.post('/:id/share', share);
documentsRouter.get('/:id/collaborators', collaborators);
documentsRouter.delete('/:id/collaborators/:userId', removeCollaborator);
