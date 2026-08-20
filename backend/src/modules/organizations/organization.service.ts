import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import { auditService } from '../audit/audit.service';
import { OrgRole, MembershipStatus } from '@prisma/client';
import { entitlementService } from '../subscriptions/entitlement.service';

export interface UpdateOrganizationSettingsInput {
  name?: string;
  businessGstin?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface InviteMemberInput {
  name: string;
  email: string;
  role: OrgRole;
  password?: string;
}

export const organizationService = {
  /**
   * Get organization profile and settings.
   */
  async getSettings(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw AppError.notFound('Organization', organizationId);
    }
    return org;
  },

  /**
   * Update organization profile and settings.
   */
  async updateSettings(
    organizationId: string,
    input: UpdateOrganizationSettingsInput,
    actorUserId: string
  ) {
    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: input,
    });

    await auditService.log({
      scope: 'ORGANIZATION',
      organizationId,
      actorUserId,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      resource: 'Organization',
      resourceId: organizationId,
      metadata: input as Record<string, unknown>,
    });

    return org;
  },

  /**
   * List all team members of the organization.
   */
  async listMembers(organizationId: string) {
    const members = await prisma.organizationMembership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((m) => ({
      membershipId: m.id,
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: m.status,
      lastLoginAt: m.user.lastLoginAt,
      joinedAt: m.createdAt,
    }));
  },

  /**
   * Add / invite a team member to the organization with seat quota enforcement.
   */
  async addMember(
    organizationId: string,
    input: InviteMemberInput,
    actorUserId: string
  ) {
    const password = input.password || 'StockPulse123!';
    const passwordHash = await bcrypt.hash(password, 10);
    const normalizedEmail = input.email.toLowerCase().trim();

    return prisma.$transaction(
      async (tx) => {
        // 1. Quota check for user seats
        await entitlementService.assertQuotaAvailable(tx, organizationId, 'users');

        // 2. Find or create user
        let user = await tx.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              name: input.name.trim(),
              email: normalizedEmail,
              passwordHash,
            },
          });
        }

        // 3. Check existing membership
        const existingMembership = await tx.organizationMembership.findUnique({
          where: {
            userId_organizationId: {
              userId: user.id,
              organizationId,
            },
          },
        });

        if (existingMembership) {
          throw AppError.conflict('This user is already a member of the organization.');
        }

        const membership = await tx.organizationMembership.create({
          data: {
            userId: user.id,
            organizationId,
            role: input.role,
            status: MembershipStatus.ACTIVE,
          },
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        await auditService.log({
          scope: 'ORGANIZATION',
          organizationId,
          actorUserId,
          action: 'MEMBER_ADDED',
          resource: 'OrganizationMembership',
          resourceId: membership.id,
          metadata: {
            invitedEmail: normalizedEmail,
            role: input.role,
          },
        });

        return membership;
      },
      { timeout: 15000, maxWait: 10000 }
    );
  },

  /**
   * Update a member's role within the organization.
   */
  async updateMemberRole(
    organizationId: string,
    membershipId: string,
    newRole: OrgRole,
    actorUserId: string
  ) {
    const membership = await prisma.organizationMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw AppError.notFound('Membership', membershipId);
    }

    const updated = await prisma.organizationMembership.update({
      where: { id: membershipId },
      data: { role: newRole },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await auditService.log({
      scope: 'ORGANIZATION',
      organizationId,
      actorUserId,
      action: 'MEMBER_ROLE_UPDATED',
      resource: 'OrganizationMembership',
      resourceId: membershipId,
      metadata: { oldRole: membership.role, newRole },
    });

    return updated;
  },

  /**
   * Remove a member from the organization.
   */
  async removeMember(
    organizationId: string,
    membershipId: string,
    actorUserId: string
  ) {
    const membership = await prisma.organizationMembership.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw AppError.notFound('Membership', membershipId);
    }

    if (membership.userId === actorUserId) {
      throw AppError.badRequest('You cannot remove yourself from the organization.');
    }

    await prisma.organizationMembership.delete({
      where: { id: membershipId },
    });

    await auditService.log({
      scope: 'ORGANIZATION',
      organizationId,
      actorUserId,
      action: 'MEMBER_REMOVED',
      resource: 'OrganizationMembership',
      resourceId: membershipId,
      metadata: { targetUserId: membership.userId },
    });

    return { success: true, message: 'Member removed from organization.' };
  },
};
