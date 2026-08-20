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

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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

    await auditService.log({
      scope: user.isSuperAdmin ? 'PLATFORM' : 'ORGANIZATION',
      organizationId: memberships[0]?.organizationId,
      actorUserId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

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

    const [existingUser, existingSlug] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.organization.findUnique({ where: { slug } }),
    ]);

    if (existingUser) {
      throw AppError.conflict('An account with this email address already exists.');
    }
    if (existingSlug) {
      throw AppError.conflict('An organization with this slug / URL identifier is already taken.');
    }

    const defaultPlan = await prisma.plan.findFirst({
      where: { code: 'growth_v1', isActive: true },
    }) || await prisma.plan.findFirst({ where: { isActive: true } });

    if (!defaultPlan) {
      throw AppError.badRequest('No default subscription plan found.');
    }

    return prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(input.password, 10);

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
        isSuperAdmin: user.isSuperAdmin,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
      },
      organizations: memberships,
    };
  },
};
