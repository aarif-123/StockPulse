// Customer routes — mounted at /api/customers in app.ts.
//
// Authorization matrix:
//   POST   /          → ADMIN, SALES          (create)
//   GET    /          → all authenticated roles (list)
//   GET    /:id       → all authenticated roles (read)
//   PUT    /:id       → ADMIN, SALES          (update)
//   POST   /:id/follow-ups → ADMIN, SALES     (follow-up)

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { create, list, getOne, update, followUp } from './customer.controller';

const router = Router();

const allRoles  = authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS');
const writeRoles = authorize('ADMIN', 'SALES');

router.post('/',                   authenticate, writeRoles, create);
router.get('/',                    authenticate, allRoles,   list);
router.get('/:id',                 authenticate, allRoles,   getOne);
router.put('/:id',                 authenticate, writeRoles, update);
router.post('/:id/follow-ups',     authenticate, writeRoles, followUp);

export default router;
