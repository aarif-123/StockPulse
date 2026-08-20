import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { getStats } from './dashboard.controller';

const router = Router();

router.use(authenticate);
router.use(resolveTenantContext);

router.get('/stats', getStats);

export default router;
