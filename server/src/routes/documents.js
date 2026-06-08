import { Router } from 'express';

import {
  create,
  get,
  list,
  remove,
  updateTitleHandler,
} from '../controllers/document-controller.js';
import { authenticate } from '../middleware/authenticate.js';

export const documentsRouter = Router();

documentsRouter.use(authenticate);

documentsRouter.get('/', list);
documentsRouter.post('/', create);
documentsRouter.get('/:id', get);
documentsRouter.patch('/:id', updateTitleHandler);
documentsRouter.delete('/:id', remove);
