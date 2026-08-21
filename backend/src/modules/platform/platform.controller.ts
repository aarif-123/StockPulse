import { Request, Response, NextFunction } from 'express';
import { platformService } from './platform.service';
import { auditService } from '../audit/audit.service';
import { z } from 'zod';
import { UserStatus, OrgStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
  planCode: z.string().optional(),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6).optional().or(z.literal('')),
  businessGstin: z.string().optional(),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  businessGstin: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  status: z.nativeEnum(OrgStatus).optional(),
});

const CreatePlanSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
  monthlyPriceINR: z.number().nonnegative(),
  yearlyPriceINR: z.number().nonnegative(),
  maxUsers: z.number().int().positive().optional(),
  maxProducts: z.number().int().positive().optional(),
  maxCustomers: z.number().int().positive().optional(),
  maxWarehouses: z.number().int().positive().optional(),
  maxTransactions: z.number().int().positive().optional(),
  allowedFeatures: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const UpdatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  monthlyPriceINR: z.number().nonnegative().optional(),
  yearlyPriceINR: z.number().nonnegative().optional(),
  maxUsers: z.number().int().positive().optional(),
  maxProducts: z.number().int().positive().optional(),
  maxCustomers: z.number().int().positive().optional(),
  maxWarehouses: z.number().int().positive().optional(),
  maxTransactions: z.number().int().positive().optional(),
  allowedFeatures: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

const ReviewPaymentSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

const StartSupportSessionSchema = z.object({
  targetOrganizationId: z.string().min(1),
  targetUserId: z.string().optional().or(z.literal('')),
  reason: z.string().min(5, 'Reason must be at least 5 characters'),
  durationMinutes: z.number().int().min(5).max(480).optional(),
});

const UpdateSuperAdminSchema = z.object({
  isSuperAdmin: z.boolean(),
});

const UpdateUserStatusSchema = z.object({
  status: z.nativeEnum(UserStatus),
});

const CreateUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  organizationId: z.string().min(1, 'Organization ID is required'),
});

export const platformController = {
  async getOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.getOverview();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async listOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query['search'] as string | undefined;
      const status = req.query['status'] as any;
      const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;

      const result = await platformService.listOrganizations(search, status, page, limit);
      res.status(200).json({ data: result.items, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  },

  async getOrganizationDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params['id']!;
      const data = await platformService.getOrganizationDetails(orgId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = CreateOrganizationSchema.parse(req.body);
      const data = await platformService.createOrganization(parsed, req.user!.userId);
      res.status(201).json({ data, message: 'Organization provisioned successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async updateOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params['id']!;
      const parsed = UpdateOrganizationSchema.parse(req.body);
      const data = await platformService.updateOrganization(orgId, parsed, req.user!.userId);
      res.status(200).json({ data, message: 'Organization updated successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async updateOrganizationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params['id']!;
      const status = req.body.status;
      const data = await platformService.updateOrganizationStatus(orgId, status, req.user!.userId);
      res.status(200).json({ data, message: `Organization status updated to ${status}.` });
    } catch (err) {
      next(err);
    }
  },

  async listPlans(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listPlans();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = CreatePlanSchema.parse(req.body);
      const data = await platformService.createPlan(parsed, req.user!.userId);
      res.status(201).json({ data, message: 'Plan created successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async updatePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const planId = req.params['id']!;
      const parsed = UpdatePlanSchema.parse(req.body);
      const data = await platformService.updatePlan(planId, parsed, req.user!.userId);
      res.status(200).json({ data, message: 'Plan updated successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async listUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query['search'] as string | undefined;
      const status = req.query['status'] as any;
      const role = req.query['role'] as string | undefined;
      const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;

      const result = await platformService.listUsers(search, status, role, page, limit);
      res.status(200).json({ data: result.items, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  },

  async updateSuperAdminStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params['id']!;
      const parsed = UpdateSuperAdminSchema.parse(req.body);
      const data = await platformService.updateSuperAdminStatus(
        userId,
        parsed.isSuperAdmin,
        req.user!.userId
      );
      res.status(200).json({ data, message: 'Super admin status updated.' });
    } catch (err) {
      next(err);
    }
  },

  async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params['id']!;
      const parsed = UpdateUserStatusSchema.parse(req.body);
      const data = await platformService.updateUserStatus(
        userId,
        parsed.status,
        req.user!.userId
      );
      res.status(200).json({ data, message: `User status updated to ${parsed.status}.` });
    } catch (err) {
      next(err);
    }
  },

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = CreateUserSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(parsed.password, 10);
      const result = await platformService.createUser(
        {
          name: parsed.name,
          email: parsed.email,
          passwordHash,
          organizationId: parsed.organizationId,
        },
        req.user!.userId
      );
      res.status(201).json({ data: result.user, message: 'Org Admin user created and membership assigned successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params['id']!;
      const data = await platformService.deleteUser(userId, req.user!.userId);
      res.status(200).json({ data, message: 'User deleted successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async listPaymentRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query['status'] as string | undefined;
      const data = await platformService.listPaymentRequests(status);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async reviewPaymentRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id']!;
      const parsed = ReviewPaymentSchema.parse(req.body);
      const result = await platformService.reviewPaymentRequest(
        id,
        req.user!.userId,
        parsed.approved,
        parsed.rejectionReason
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async startSupportSession(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = StartSupportSessionSchema.parse(req.body);
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];
      const data = await platformService.startSupportSession(
        req.user!.userId,
        parsed,
        ipAddress,
        userAgent
      );
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async terminateSupportSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params['id']!;
      const data = await platformService.terminateSupportSession(id, req.user!.userId);
      res.status(200).json({ data, message: 'Support session terminated successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async listSupportSessions(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformService.listSupportSessions();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getPlatformAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query['search'] as string | undefined;
      const scope = req.query['scope'] as any;
      const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;

      const result = await auditService.getPlatformLogs(search, scope, page, limit);
      res.status(200).json({ data: result.items, pagination: result.pagination });
    } catch (err) {
      next(err);
    }
  },

  async extendTrial(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.params['id']!;
      const days = req.body.days ? parseInt(req.body.days, 10) : 7;
      const data = await platformService.extendTrial(organizationId, days, req.user!.userId);
      res.status(200).json({ data, message: `Free trial extended by ${days} days.` });
    } catch (err) {
      next(err);
    }
  },

  async assignPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.params['id']!;
      const { planId, billingCycle, status } = req.body;
      const data = await platformService.assignPlan(
        organizationId,
        planId,
        billingCycle,
        status,
        req.user!.userId
      );
      res.status(200).json({ data, message: 'Plan assigned directly to organization.' });
    } catch (err) {
      next(err);
    }
  },
};
