import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import * as controller from './notification.controller';

const router = Router();

router.use(authenticate);
router.use(resolveTenantContext);

router.get('/', controller.getNotifications);
router.patch('/:id/read', controller.markAsRead);
router.post('/read-all', controller.markAllAsRead);

export default router;
