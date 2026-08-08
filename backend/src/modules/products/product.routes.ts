// Product and Inventory routes — mounted at /api/products in app.ts.
//
// Authorization Matrix:
//   POST   /                        → ADMIN, WAREHOUSE          (create product)
//   GET    /                        → all authenticated roles   (list/search products)
//   GET    /:id                     → all authenticated roles   (get product)
//   PUT    /:id                     → ADMIN, WAREHOUSE          (update product)
//   POST   /:id/stock-movements     → ADMIN, WAREHOUSE          (create stock movement)
//   GET    /:id/stock-movements     → all authenticated roles   (view movement history)

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import {
  create,
  list,
  getOne,
  update,
  createMovement,
  listMovements,
} from './product.controller';

const router = Router();

const allRoles  = authorize('ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS');
const writeRoles = authorize('ADMIN', 'WAREHOUSE');

// Products CRUD
router.post('/',               authenticate, writeRoles, create);
router.get('/',                authenticate, allRoles,   list);
router.get('/:id',             authenticate, allRoles,   getOne);
router.put('/:id',             authenticate, writeRoles, update);

// Inventory / Stock Movements
router.post('/:id/stock-movements', authenticate, writeRoles, createMovement);
router.get('/:id/stock-movements',  authenticate, allRoles,   listMovements);

export default router;
