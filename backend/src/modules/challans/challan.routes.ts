// Sales Challan routes — mounted at /api/challans in app.ts.
//
// Authorization Matrix:
//   POST   /               → ADMIN, SALES            (create draft challan)
//   GET    /               → all authenticated roles (list challans)
//   GET    /:id            → all authenticated roles (get single challan)
//   POST   /:id/confirm    → ADMIN, SALES            (confirm challan)
//   POST   /:id/cancel     → ADMIN, SALES            (cancel challan)

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { create, list, getOne, confirm, cancel } from './challan.controller';

const router = Router();

const allRoles  = authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS');
const writeRoles = authorize('ADMIN', 'SALES');

// Challan Operations
router.post('/',              authenticate, writeRoles, create);
router.get('/',               authenticate, allRoles,   list);
router.get('/:id',            authenticate, allRoles,   getOne);
router.post('/:id/confirm',   authenticate, writeRoles, confirm);
router.post('/:id/cancel',    authenticate, writeRoles, cancel);

export default router;
