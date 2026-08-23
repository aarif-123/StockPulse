import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { requirePermission } from '../../middleware/authorize';
import { PERMISSIONS } from '../../config/permissions';
import {
  createProduct,
  bulkImportProducts,
  listProducts,
  getProductById,
  updateProduct,
  createStockMovement,
  listStockMovements,
} from './product.controller';

const router = Router();

router.use(authenticate);
router.use(resolveTenantContext);

router.post('/', requirePermission(PERMISSIONS.PRODUCTS_CREATE), createProduct);
router.post('/bulk-import', requirePermission(PERMISSIONS.PRODUCTS_CREATE), bulkImportProducts);
router.get('/', requirePermission(PERMISSIONS.PRODUCTS_READ), listProducts);

router.get('/:id', requirePermission(PERMISSIONS.PRODUCTS_READ), getProductById);
router.put('/:id', requirePermission(PERMISSIONS.PRODUCTS_UPDATE), updateProduct);
router.patch('/:id', requirePermission(PERMISSIONS.PRODUCTS_UPDATE), updateProduct);

// Stock movements for a product
router.post('/:id/movements', requirePermission(PERMISSIONS.PRODUCTS_STOCK_ADJUST), createStockMovement);
router.post('/:id/stock-movements', requirePermission(PERMISSIONS.PRODUCTS_STOCK_ADJUST), createStockMovement);
router.get('/:id/movements', requirePermission(PERMISSIONS.PRODUCTS_READ), listStockMovements);
router.get('/:id/stock-movements', requirePermission(PERMISSIONS.PRODUCTS_READ), listStockMovements);

export default router;
