import { Router } from 'express';
import { paymentController } from './payment.controller';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { authorize } from '../../middleware/authorize';
import { OrgRole } from '@prisma/client';

const router = Router();

// Public plan catalog for pricing
router.get('/plans', paymentController.getPlans);

// Protected Tenant Payment routes
router.use(authenticate);
router.use(resolveTenantContext);

router.post('/manual-upi', authorize(OrgRole.ORG_ADMIN), paymentController.submitManualUpiPayment);
router.get('/history', authorize(OrgRole.ORG_ADMIN), paymentController.getHistory);

export default router;
