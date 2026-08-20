import bcrypt from 'bcrypt';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import { auditService } from '../audit/audit.service';
import { ManualUpiPaymentProvider } from '../payments/providers/manual-upi.provider';
import { signToken } from '../../utils/jwt';
import { OrgRole, OrgStatus, Prisma, UserStatus, SubscriptionStatus, BillingCycle } from '@prisma/client';

const manualPaymentProvider = new ManualUpiPaymentProvider();

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  planCode?: string;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
  businessGstin?: string;
  businessPhone?: string;
  businessAddress?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CreatePlanInput {
  name: string;
  code: string;
  description?: string;
  monthlyPriceINR: number;
  yearlyPriceINR: number;
  maxUsers?: number;
  maxProducts?: number;
  maxCustomers?: number;
  maxWarehouses?: number;
  maxTransactions?: number;
  allowedFeatures?: string[];
}

export interface StartSupportSessionInput {
  targetOrganizationId: string;
  targetUserId?: string;
  reason: string;
  durationMinutes?: number;
}

export const platformService = {
  /**
   * Super Admin Overview & Platform Health Metrics.
   */
  async getOverview() {
    const [
      totalOrganizations,
      activeOrganizations,
      totalUsers,
      activeSubscriptions,
      pendingPaymentRequests,
      totalAuditLogs,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organization.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.paymentRequest.count({ where: { status: 'PENDING' } }),
      prisma.auditLog.count(),
    ]);

    let dbLatencyMs = 0;
    let dbStatus = 'ok';
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch {
      dbStatus = 'degraded';
    }

    return {
      metrics: {
        totalOrganizations,
        activeOrganizations,
        totalUsers,
        activeSubscriptions,
        pendingPaymentRequests,
        totalAuditLogs,
      },
      systemHealth: {
        dbStatus,
        dbLatencyMs,
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
      },
    };
  },

  /**
   * List all organizations with search, status filter, and pagination.
   */
  async listOrganizations(search?: string, status?: OrgStatus, page = 1, limit = 50) {
    const where: Prisma.OrganizationWhereInput = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { businessEmail: { contains: search, mode: 'insensitive' } },
        { businessGstin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        include: {
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              memberships: true,
              customers: true,
              products: true,
              challans: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.organization.count({ where }),
    ]);

    const items = organizations.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      currency: org.currency,
      businessGstin: org.businessGstin,
      businessEmail: org.businessEmail,
      createdAt: org.createdAt,
      activeSubscription: org.subscriptions[0]
        ? {
            id: org.subscriptions[0].id,
            status: org.subscriptions[0].status,
            planName: org.subscriptions[0].plan.name,
            planCode: org.subscriptions[0].plan.code,
            currentPeriodEnd: org.subscriptions[0].currentPeriodEnd,
          }
        : null,
      counts: org._count,
    }));

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Retrieve full organization details and member roster.
   */
  async getOrganizationDetails(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        memberships: {
          include: {
            user: { select: { id: true, name: true, email: true, status: true, isSuperAdmin: true } },
          },
        },
        _count: {
          select: {
            memberships: true,
            customers: true,
            products: true,
            challans: true,
            transactions: true,
          },
        },
      },
    });

    if (!org) {
      throw AppError.notFound('Organization', organizationId);
    }

    return org;
  },

  /**
   * Partial update of organization metadata and status.
   */
  async updateOrganization(
    organizationId: string,
    input: {
      name?: string;
      businessGstin?: string;
      businessPhone?: string;
      businessEmail?: string;
      businessAddress?: string;
      city?: string;
      state?: string;
      pincode?: string;
      status?: OrgStatus;
    },
    superAdminUserId: string
  ) {
    const updated = await prisma.organization.update({
      where: { id: organizationId },
      data: input,
    });

    await auditService.log({
      scope: 'PLATFORM',
      organizationId,
      actorUserId: superAdminUserId,
      action: 'ORGANIZATION_UPDATED',
      resource: 'Organization',
      resourceId: organizationId,
      metadata: input,
    });

    return updated;
  },

  /**
   * Provision a new customer organization with an initial administrator and subscription.
   */
  async createOrganization(input: CreateOrganizationInput, superAdminUserId: string) {
    const existingSlug = await prisma.organization.findUnique({
      where: { slug: input.slug },
    });
    if (existingSlug) {
      throw AppError.conflict('An organization with this slug / URL identifier already exists.');
    }

    const adminPassword = input.adminPassword || 'StockPulseTemp123!';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const normalizedAdminEmail = input.adminEmail.toLowerCase().trim();

    return prisma.$transaction(
      async (tx) => {
        // 1. Create Organization
        const org = await tx.organization.create({
          data: {
            name: input.name.trim(),
            slug: input.slug.toLowerCase().trim(),
            businessGstin: input.businessGstin,
            businessPhone: input.businessPhone,
            businessAddress: input.businessAddress,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
            businessEmail: normalizedAdminEmail,
          },
        });

        // 2. Create or link Admin User
        let adminUser = await tx.user.findUnique({
          where: { email: normalizedAdminEmail },
        });

        if (!adminUser) {
          adminUser = await tx.user.create({
            data: {
              name: input.adminName.trim(),
              email: normalizedAdminEmail,
              passwordHash,
            },
          });
        }

        // 3. Create Org Admin Membership
        await tx.organizationMembership.create({
          data: {
            userId: adminUser.id,
            organizationId: org.id,
            role: OrgRole.ORG_ADMIN,
          },
        });

        // 4. Assign Plan Subscription (14-day trial or specified plan)
        let plan = null;
        if (input.planCode) {
          plan = await tx.plan.findUnique({ where: { code: input.planCode } });
        }
        if (!plan) {
          plan = (await tx.plan.findFirst({ where: { code: 'growth_v1' } })) || (await tx.plan.findFirst());
        }

        if (plan) {
          const now = new Date();
          const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          await tx.subscription.create({
            data: {
              organizationId: org.id,
              planId: plan.id,
              status: SubscriptionStatus.ACTIVE,
              billingCycle: BillingCycle.MONTHLY,
              currentPeriodStart: now,
              currentPeriodEnd: trialEnd,
              trialEndsAt: trialEnd,
            },
          });
        }

        await auditService.log({
          scope: 'PLATFORM',
          organizationId: org.id,
          actorUserId: superAdminUserId,
          action: 'ORGANIZATION_PROVISIONED',
          resource: 'Organization',
          resourceId: org.id,
          metadata: { name: org.name, slug: org.slug, adminEmail: adminUser.email },
        });

        return {
          organization: org,
          adminUser: { id: adminUser.id, name: adminUser.name, email: adminUser.email },
        };
      },
      { timeout: 15000, maxWait: 10000 }
    );
  },

  /**
   * Update organization status (e.g. SUSPENDED, ACTIVE, CANCELLED).
   */
  async updateOrganizationStatus(organizationId: string, status: OrgStatus, superAdminUserId: string) {
    const org = await prisma.organization.update({
      where: { id: organizationId },
      data: { status },
    });

    await auditService.log({
      scope: 'PLATFORM',
      organizationId,
      actorUserId: superAdminUserId,
      action: `ORGANIZATION_STATUS_${status}`,
      resource: 'Organization',
      resourceId: organizationId,
    });

    return org;
  },

  /**
   * Plans Management.
   */
  async listPlans() {
    return prisma.plan.findMany({
      orderBy: { createdAt: 'asc' },
    });
  },

  async createPlan(input: CreatePlanInput, superAdminUserId: string) {
    const existing = await prisma.plan.findUnique({ where: { code: input.code } });
    if (existing) {
      throw AppError.conflict(`A plan with code '${input.code}' already exists.`);
    }

    const plan = await prisma.plan.create({
      data: {
        name: input.name,
        code: input.code,
        description: input.description,
        monthlyPriceINR: new Prisma.Decimal(input.monthlyPriceINR),
        yearlyPriceINR: new Prisma.Decimal(input.yearlyPriceINR),
        maxUsers: input.maxUsers ?? 2,
        maxProducts: input.maxProducts ?? 500,
        maxCustomers: input.maxCustomers ?? 200,
        maxWarehouses: input.maxWarehouses ?? 2,
        maxTransactions: input.maxTransactions ?? 1000,
        allowedFeatures: input.allowedFeatures ?? ['CORE_ERP', 'CRM', 'CHALLANS', 'BASIC_REPORTS'],
      },
    });

    await auditService.log({
      scope: 'PLATFORM',
      actorUserId: superAdminUserId,
      action: 'PLAN_CREATED',
      resource: 'Plan',
      resourceId: plan.id,
      metadata: { name: plan.name, code: plan.code },
    });

    return plan;
  },

  /**
   * Update plan pricing, limits, allowed features, or active status.
   */
  async updatePlan(
    planId: string,
    input: Partial<CreatePlanInput> & { isActive?: boolean },
    superAdminUserId: string
  ) {
    const existing = await prisma.plan.findUnique({ where: { id: planId } });
    if (!existing) {
      throw AppError.notFound('Plan', planId);
    }

    const data: Prisma.PlanUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.monthlyPriceINR !== undefined) data.monthlyPriceINR = new Prisma.Decimal(input.monthlyPriceINR);
    if (input.yearlyPriceINR !== undefined) data.yearlyPriceINR = new Prisma.Decimal(input.yearlyPriceINR);
    if (input.maxUsers !== undefined) data.maxUsers = input.maxUsers;
    if (input.maxProducts !== undefined) data.maxProducts = input.maxProducts;
    if (input.maxCustomers !== undefined) data.maxCustomers = input.maxCustomers;
    if (input.maxWarehouses !== undefined) data.maxWarehouses = input.maxWarehouses;
    if (input.maxTransactions !== undefined) data.maxTransactions = input.maxTransactions;
    if (input.allowedFeatures !== undefined) data.allowedFeatures = input.allowedFeatures;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const updated = await prisma.plan.update({
      where: { id: planId },
      data,
    });

    await auditService.log({
      scope: 'PLATFORM',
      actorUserId: superAdminUserId,
      action: 'PLAN_UPDATED',
      resource: 'Plan',
      resourceId: planId,
      metadata: input,
    });

    return updated;
  },

  /**
   * List global users across all organizations with search, status filter, and pagination.
   */
  async listUsers(search?: string, status?: UserStatus, roleFilter?: string, page = 1, limit = 50) {
    const where: Prisma.UserWhereInput = {};
    if (status) where.status = status;
    if (roleFilter === 'SUPER_ADMIN') {
      where.isSuperAdmin = true;
    } else if (roleFilter) {
      where.memberships = {
        some: { role: roleFilter as OrgRole },
      };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          isSuperAdmin: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          memberships: {
            select: {
              id: true,
              role: true,
              status: true,
              organization: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Toggle Super Admin privilege for a platform user.
   */
  async updateSuperAdminStatus(targetUserId: string, isSuperAdmin: boolean, superAdminUserId: string) {
    if (targetUserId === superAdminUserId && !isSuperAdmin) {
      const superAdminCount = await prisma.user.count({ where: { isSuperAdmin: true } });
      if (superAdminCount <= 1) {
        throw AppError.badRequest('Cannot revoke your own Super Admin status when you are the sole Super Admin.');
      }
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { isSuperAdmin },
      select: { id: true, name: true, email: true, isSuperAdmin: true, status: true },
    });

    await auditService.log({
      scope: 'PLATFORM',
      actorUserId: superAdminUserId,
      action: isSuperAdmin ? 'SUPER_ADMIN_GRANTED' : 'SUPER_ADMIN_REVOKED',
      resource: 'User',
      resourceId: targetUserId,
      metadata: { targetUserEmail: user.email, isSuperAdmin },
    });

    return user;
  },

  /**
   * Toggle platform user account status (ACTIVE, SUSPENDED).
   */
  async updateUserStatus(targetUserId: string, status: UserStatus, superAdminUserId: string) {
    if (targetUserId === superAdminUserId && status === 'SUSPENDED') {
      throw AppError.badRequest('You cannot suspend your own Super Admin account.');
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { status },
      select: { id: true, name: true, email: true, isSuperAdmin: true, status: true },
    });

    await auditService.log({
      scope: 'PLATFORM',
      actorUserId: superAdminUserId,
      action: `USER_STATUS_${status}`,
      resource: 'User',
      resourceId: targetUserId,
      metadata: { targetUserEmail: user.email, status },
    });

    return user;
  },

  /**
   * Create a new platform user and assign them as ORG_ADMIN to a specified organization.
   */
  async createUser(input: { name: string; email: string; passwordHash: string; organizationId: string }, superAdminUserId: string) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw AppError.badRequest(`User with email '${input.email}' already exists.`);
    }

    const org = await prisma.organization.findUnique({ where: { id: input.organizationId } });
    if (!org) {
      throw AppError.notFound('Organization', input.organizationId);
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        status: 'ACTIVE',
      },
    });

    const membership = await prisma.organizationMembership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: 'ORG_ADMIN',
        status: 'ACTIVE',
      },
    });

    await auditService.log({
      scope: 'PLATFORM',
      actorUserId: superAdminUserId,
      action: 'USER_CREATED_BY_ADMIN',
      resource: 'User',
      resourceId: user.id,
      metadata: { targetUserEmail: user.email, organizationName: org.name, role: 'ORG_ADMIN' },
    });

    return { user, membership };
  },

  /**
   * Delete a platform user from the database.
   */
  async deleteUser(targetUserId: string, superAdminUserId: string) {
    if (targetUserId === superAdminUserId) {
      throw AppError.badRequest('You cannot delete your own Super Admin account.');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw AppError.notFound('User', targetUserId);
    }

    // Clean up dependent support sessions
    await prisma.supportSession.deleteMany({
      where: {
        OR: [
          { targetUserId },
          { superAdminId: targetUserId },
        ],
      },
    });

    // Clean up payment requests submitted by this user
    await prisma.paymentRequest.deleteMany({
      where: {
        submittedBy: targetUserId,
      },
    });

    // Clean up memberships
    await prisma.organizationMembership.deleteMany({
      where: {
        userId: targetUserId,
      },
    });

    // Finally delete user
    const deleted = await prisma.user.delete({
      where: { id: targetUserId },
    });

    await auditService.log({
      scope: 'PLATFORM',
      actorUserId: superAdminUserId,
      action: 'USER_DELETED_BY_ADMIN',
      resource: 'User',
      resourceId: targetUserId,
      metadata: { targetUserEmail: targetUser.email },
    });

    return deleted;
  },

  /**
   * Payment Verification Queue.
   */
  async listPaymentRequests(status?: string) {
    const where: Prisma.PaymentRequestWhereInput = {};
    if (status) {
      where.status = status as any;
    }

    return prisma.paymentRequest.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        plan: { select: { id: true, name: true, code: true } },
        submitter: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async reviewPaymentRequest(
    paymentRequestId: string,
    superAdminUserId: string,
    approved: boolean,
    rejectionReason?: string
  ) {
    return manualPaymentProvider.verifyPayment(
      paymentRequestId,
      superAdminUserId,
      approved,
      rejectionReason
    );
  },

  /**
   * Super Admin Support / Impersonation Session.
   */
  async startSupportSession(
    superAdminUserId: string,
    input: StartSupportSessionInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const durationMinutes = input.durationMinutes || 60;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    let targetUserId = input.targetUserId;

    if (!targetUserId || targetUserId.trim() === '') {
      const adminMembership = await prisma.organizationMembership.findFirst({
        where: {
          organizationId: input.targetOrganizationId,
          role: 'ORG_ADMIN',
          status: 'ACTIVE',
        },
      });

      if (adminMembership) {
        targetUserId = adminMembership.userId;
      } else {
        const anyMembership = await prisma.organizationMembership.findFirst({
          where: {
            organizationId: input.targetOrganizationId,
            status: 'ACTIVE',
          },
        });
        if (!anyMembership) {
          throw AppError.badRequest(
            'The target organization does not have any active member users to impersonate.'
          );
        }
        targetUserId = anyMembership.userId;
      }
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      throw AppError.notFound('Target User', targetUserId);
    }

    const membership = await prisma.organizationMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUser.id,
          organizationId: input.targetOrganizationId,
        },
      },
    });

    if (!membership) {
      throw AppError.badRequest('The target user does not belong to the target organization.');
    }

    const session = await prisma.supportSession.create({
      data: {
        superAdminId: superAdminUserId,
        targetOrganizationId: input.targetOrganizationId,
        targetUserId,
        reason: input.reason,
        expiresAt,
        ipAddress,
        userAgent,
      },
      include: {
        targetOrganization: { select: { id: true, name: true, slug: true } },
        targetUser: { select: { id: true, name: true, email: true } },
      },
    });

    // Generate impersonation token
    const token = signToken({
      userId: targetUser.id,
      isSuperAdmin: false,
      supportSessionId: session.id,
      impersonatedBy: superAdminUserId,
    });

    await auditService.log({
      scope: 'PLATFORM',
      organizationId: input.targetOrganizationId,
      actorUserId: superAdminUserId,
      action: 'SUPPORT_SESSION_STARTED',
      resource: 'SupportSession',
      resourceId: session.id,
      metadata: {
        targetUserId: targetUser.id,
        targetUserEmail: targetUser.email,
        reason: input.reason,
        expiresAt,
      },
      ipAddress,
      userAgent,
    });

    return {
      session,
      impersonationToken: token,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
      },
      targetOrganization: session.targetOrganization,
    };
  },

  async terminateSupportSession(sessionId: string, superAdminUserId: string) {
    const session = await prisma.supportSession.update({
      where: { id: sessionId },
      data: {
        status: 'TERMINATED',
        endedAt: new Date(),
      },
    });

    await auditService.log({
      scope: 'PLATFORM',
      organizationId: session.targetOrganizationId,
      actorUserId: superAdminUserId,
      action: 'SUPPORT_SESSION_TERMINATED',
      resource: 'SupportSession',
      resourceId: session.id,
    });

    return session;
  },

  async listSupportSessions() {
    return prisma.supportSession.findMany({
      include: {
        superAdmin: { select: { id: true, name: true, email: true } },
        targetOrganization: { select: { id: true, name: true, slug: true } },
        targetUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};
