import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { requireSuperAdmin } from '../../middleware/platform-guard';
import { platformController } from './platform.controller';

const router = Router();

// Enforce Platform Super Admin authorization on all platform endpoints
router.use(authenticate);
router.use(requireSuperAdmin);

// Platform Overview & System Telemetry
router.get('/overview', platformController.getOverview);

// Organization Lifecycle & Management
router.get('/organizations', platformController.listOrganizations);
router.get('/organizations/:id', platformController.getOrganizationDetails);
router.post('/organizations', platformController.createOrganization);
router.patch('/organizations/:id', platformController.updateOrganization);
router.put('/organizations/:id/status', platformController.updateOrganizationStatus);
router.patch('/organizations/:id/status', platformController.updateOrganizationStatus);

// Data-Driven Plans Configuration
router.get('/plans', platformController.listPlans);
router.post('/plans', platformController.createPlan);
router.put('/plans/:id', platformController.updatePlan);
router.patch('/plans/:id', platformController.updatePlan);

// Global Platform User Management
router.get('/users', platformController.listUsers);
router.post('/users', platformController.createUser);
router.delete('/users/:id', platformController.deleteUser);
router.patch('/users/:id/super-admin', platformController.updateSuperAdminStatus);
router.patch('/users/:id/status', platformController.updateUserStatus);

// Payment Requests Review & Subscription Activation
router.get('/payments', platformController.listPaymentRequests);
router.post('/payments/:id/review', platformController.reviewPaymentRequest);

// Audited Super Admin Support / Impersonation Sessions
router.get('/support/sessions', platformController.listSupportSessions);
router.get('/support-sessions', platformController.listSupportSessions);
router.post('/support/start', platformController.startSupportSession);
router.post('/support-session/start', platformController.startSupportSession);
router.post('/support/stop/:id', platformController.terminateSupportSession);
router.post('/support-session/stop/:id', platformController.terminateSupportSession);

// Immutable Platform Audit Logs
router.get('/audit', platformController.getPlatformAuditLogs);

export default router;
