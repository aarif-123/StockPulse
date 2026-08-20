import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { resolveTenantContext } from '../../middleware/tenant-context';
import { authorize } from '../../middleware/authorize';
import { organizationController } from './organization.controller';
import { OrgRole } from '@prisma/client';

const router = Router();

// All organization routes require authentication and valid tenant context
router.use(authenticate);
router.use(resolveTenantContext);

// Organization Profile & Settings
router.get('/settings', organizationController.getSettings);
router.put('/settings', authorize(OrgRole.ORG_ADMIN), organizationController.updateSettings);
router.patch('/settings', authorize(OrgRole.ORG_ADMIN), organizationController.updateSettings);

// Team Members Management
router.get('/members', organizationController.listMembers);
router.post('/members', authorize(OrgRole.ORG_ADMIN), organizationController.addMember);
router.put('/members/:membershipId/role', authorize(OrgRole.ORG_ADMIN), organizationController.updateMemberRole);
router.patch('/members/:membershipId/role', authorize(OrgRole.ORG_ADMIN), organizationController.updateMemberRole);
router.delete('/members/:membershipId', authorize(OrgRole.ORG_ADMIN), organizationController.removeMember);

// Subscription & Quotas
router.get('/subscription', organizationController.getSubscription);

// Tenant Audit Logs
router.get('/audit', authorize(OrgRole.ORG_ADMIN), organizationController.getAuditLogs);

export default router;
