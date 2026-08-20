import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { requirePermission } from '../../middleware/authorize';
import { PERMISSIONS } from '../../config/permissions';
import {
  createChallan,
  listChallans,
  getChallanById,
  confirmChallan,
  cancelChallan,
} from './challan.controller';

const router = Router();

router.use(authenticate);
router.use(resolveTenantContext);

router.post('/', requirePermission(PERMISSIONS.CHALLANS_CREATE), createChallan);
router.get('/', requirePermission(PERMISSIONS.CHALLANS_READ), listChallans);
router.get('/:id', requirePermission(PERMISSIONS.CHALLANS_READ), getChallanById);
router.post('/:id/confirm', requirePermission(PERMISSIONS.CHALLANS_CONFIRM), confirmChallan);
router.post('/:id/cancel', requirePermission(PERMISSIONS.CHALLANS_CANCEL), cancelChallan);

export default router;
