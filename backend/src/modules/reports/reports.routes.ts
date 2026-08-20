import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { requirePermission } from '../../middleware/authorize';
import { PERMISSIONS } from '../../config/permissions';
import { getStockMovements, getAnalytics } from './reports.controller';

const router = Router();

router.use(authenticate);
router.use(resolveTenantContext);

router.get('/stock-movements', requirePermission(PERMISSIONS.REPORTS_READ), getStockMovements);
router.get('/analytics', requirePermission(PERMISSIONS.REPORTS_ANALYTICS), getAnalytics);

export default router;
