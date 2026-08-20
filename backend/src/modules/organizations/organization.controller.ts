import { Request, Response, NextFunction } from 'express';
import { organizationService } from './organization.service';
import { subscriptionService } from '../subscriptions/subscription.service';
import { auditService } from '../audit/audit.service';
import { z } from 'zod';
import { OrgRole } from '@prisma/client';

const UpdateSettingsSchema = z.object({
  name: z.string().min(2).optional(),
  businessGstin: z.string().optional(),
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional(),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

const InviteMemberSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.nativeEnum(OrgRole),
  password: z.string().min(6).optional(),
});

const UpdateRoleSchema = z.object({
  role: z.nativeEnum(OrgRole),
});

export const organizationController = {
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const data = await organizationService.getSettings(orgId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const parsed = UpdateSettingsSchema.parse(req.body);
      const data = await organizationService.updateSettings(orgId, parsed, req.user!.userId);
      res.status(200).json({ data, message: 'Organization settings updated successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const data = await organizationService.listMembers(orgId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const parsed = InviteMemberSchema.parse(req.body);
      const data = await organizationService.addMember(orgId, parsed, req.user!.userId);
      res.status(201).json({ data, message: 'Member added to organization successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const membershipId = req.params['membershipId']!;
      const parsed = UpdateRoleSchema.parse(req.body);
      const data = await organizationService.updateMemberRole(
        orgId,
        membershipId,
        parsed.role,
        req.user!.userId
      );
      res.status(200).json({ data, message: 'Member role updated successfully.' });
    } catch (err) {
      next(err);
    }
  },

  async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const membershipId = req.params['membershipId']!;
      const result = await organizationService.removeMember(
        orgId,
        membershipId,
        req.user!.userId
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async getSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const data = await subscriptionService.getOrganizationSubscription(orgId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const data = await auditService.getOrganizationLogs(orgId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
};
