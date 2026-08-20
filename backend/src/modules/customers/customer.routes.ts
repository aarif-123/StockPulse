import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { requirePermission } from '../../middleware/authorize';
import { PERMISSIONS } from '../../config/permissions';
import {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  addFollowUp,
} from './customer.controller';

const router = Router();

router.use(authenticate);
router.use(resolveTenantContext);

router.post('/', requirePermission(PERMISSIONS.CUSTOMERS_CREATE), createCustomer);
router.get('/', requirePermission(PERMISSIONS.CUSTOMERS_READ), listCustomers);
router.get('/:id', requirePermission(PERMISSIONS.CUSTOMERS_READ), getCustomerById);
router.put('/:id', requirePermission(PERMISSIONS.CUSTOMERS_UPDATE), updateCustomer);
router.patch('/:id', requirePermission(PERMISSIONS.CUSTOMERS_UPDATE), updateCustomer);
router.post('/:id/follow-up', requirePermission(PERMISSIONS.CUSTOMERS_FOLLOWUP), addFollowUp);
router.post('/:id/follow-ups', requirePermission(PERMISSIONS.CUSTOMERS_FOLLOWUP), addFollowUp);

export default router;
