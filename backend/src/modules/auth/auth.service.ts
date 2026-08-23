import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import { signToken } from '../../utils/jwt';
import { auditService } from '../audit/audit.service';
import { UserOrganizationMembershipSummary } from '../../types/auth';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  organizationSlug: string;
}

export const authService = {
  /**
   * Authenticates user and returns JWT + user's organization memberships.
   */
  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscriptions: {
                  include: { plan: true },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    if (user.status !== 'ACTIVE') {
      throw AppError.forbidden('Your user account is suspended or pending approval.');
    }

    const passwordMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatch) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    // Non-blocking background lastLogin update and audit log
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }).catch((err) => console.error('Background lastLogin update error:', err));

    const token = signToken({
      userId: user.id,
      isSuperAdmin: user.isSuperAdmin,
    });

    const memberships: UserOrganizationMembershipSummary[] = user.memberships.map((m) => {
      const activeSub = m.organization.subscriptions[0];
      return {
        organizationId: m.organization.id,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        role: m.role,
        status: m.status,
        subscription: activeSub
          ? {
              status: activeSub.status,
              planName: activeSub.plan.name,
              planCode: activeSub.plan.code,
              allowedFeatures: activeSub.plan.allowedFeatures,
            }
          : undefined,
      };
    });

    auditService.log({
      scope: user.isSuperAdmin ? 'PLATFORM' : 'ORGANIZATION',
      organizationId: memberships[0]?.organizationId,
      actorUserId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
    }).catch((err) => console.error('Background audit log error:', err));

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isSuperAdmin: user.isSuperAdmin,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
      organizations: memberships,
    };
  },

  /**
   * Self-serve registration for new tenant organization + initial admin user.
   */
  async register(input: RegisterInput) {
    const email = input.email.toLowerCase().trim();
    const slug = input.organizationSlug.toLowerCase().trim();

    // Parallelize validation checks, bcrypt hash, and plan fetch
    const [existingUser, existingSlug, defaultPlan, passwordHash] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.organization.findUnique({ where: { slug } }),
      prisma.plan.findFirst({ where: { code: 'growth_v1', isActive: true } }) ||
        prisma.plan.findFirst({ where: { isActive: true } }),
      bcrypt.hash(input.password, 10),
    ]);

    if (existingUser) {
      throw AppError.conflict('An account with this email address already exists.');
    }
    if (existingSlug) {
      throw AppError.conflict('An organization with this slug / URL identifier is already taken.');
    }

    if (!defaultPlan) {
      throw AppError.badRequest('No default subscription plan found.');
    }

    return prisma.$transaction(async (tx) => {

      const user = await tx.user.create({
        data: {
          name: input.name,
          email,
          passwordHash,
          isSuperAdmin: false,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug,
          businessEmail: email,
        },
      });

      await tx.organizationMembership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'ORG_ADMIN',
          status: 'ACTIVE',
        },
      });

      // 7-day Growth Pro Trial
      const now = new Date();
      const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await tx.subscription.create({
        data: {
          organizationId: organization.id,
          planId: defaultPlan.id,
          status: 'TRIAL',
          billingCycle: 'MONTHLY',
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialEndsAt: trialEnd,
        },
      });

      const token = signToken({
        userId: user.id,
        isSuperAdmin: false,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          isSuperAdmin: false,
        },
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          role: 'ORG_ADMIN',
        },
      };
    });
  },

  /**
   * Retrieves the current user's profile and latest organization memberships.
   */
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                subscriptions: {
                  include: { plan: true },
                  orderBy: { createdAt: 'desc' },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw AppError.notFound('User', userId);
    }

    const memberships: UserOrganizationMembershipSummary[] = user.memberships.map((m) => {
      const activeSub = m.organization.subscriptions[0];
      return {
        organizationId: m.organization.id,
        organizationName: m.organization.name,
        organizationSlug: m.organization.slug,
        role: m.role,
        status: m.status,
        subscription: activeSub
          ? {
              status: activeSub.status,
              planName: activeSub.plan.name,
              planCode: activeSub.plan.code,
              allowedFeatures: activeSub.plan.allowedFeatures,
            }
          : undefined,
      };
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: (user as any).phone || undefined,
        avatarUrl: (user as any).avatarUrl || undefined,
        isSuperAdmin: user.isSuperAdmin,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
      organizations: memberships,
    };
  },

  async updateProfile(userId: string, input: { name?: string; phone?: string; avatarUrl?: string }) {
    const data: any = {};
    if (input.name) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.avatarUrl !== undefined) data.avatarUrl = input.avatarUrl;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isSuperAdmin: true,
        status: true,
      },
    });


    return updatedUser;
  },

  async updatePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw AppError.notFound('User', userId);

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw AppError.badRequest('Current password is incorrect.');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { message: 'Password updated successfully.' };
  },
};
