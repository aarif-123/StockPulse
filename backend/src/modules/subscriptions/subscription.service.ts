import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import { auditService } from '../audit/audit.service';

export const subscriptionService = {
  /**
   * Retrieves active subscription and quota utilization for an organization.
   */
  async getOrganizationSubscription(organizationId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw AppError.notFound('Subscription for organization', organizationId);
    }

    let status = subscription.status;
    const isTrialExpired =
      subscription.status === SubscriptionStatus.TRIAL &&
      subscription.trialEndsAt &&
      new Date() > new Date(subscription.trialEndsAt);

    if (isTrialExpired && subscription.status !== SubscriptionStatus.EXPIRED) {
      status = SubscriptionStatus.EXPIRED;
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.EXPIRED },
      });
    }

    const [userCount, productCount, customerCount, transactionCount] = await Promise.all([
      prisma.organizationMembership.count({
        where: { organizationId, status: 'ACTIVE' },
      }),
      prisma.product.count({ where: { organizationId } }),
      prisma.customer.count({ where: { organizationId } }),
      prisma.transaction.count({ where: { organizationId } }),
    ]);

    return {
      subscription: {
        id: subscription.id,
        status,
        billingCycle: subscription.billingCycle,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialEndsAt: subscription.trialEndsAt,
      },
      plan: {
        id: subscription.plan.id,
        name: subscription.plan.name,
        code: subscription.plan.code,
        monthlyPriceINR: Number(subscription.plan.monthlyPriceINR),
        yearlyPriceINR: Number(subscription.plan.yearlyPriceINR),
        allowedFeatures: subscription.plan.allowedFeatures,
      },
      usage: {
        users: { current: userCount, limit: subscription.plan.maxUsers },
        products: { current: productCount, limit: subscription.plan.maxProducts },
        customers: { current: customerCount, limit: subscription.plan.maxCustomers },
        transactions: { current: transactionCount, limit: subscription.plan.maxTransactions },
        warehouses: { current: 1, limit: subscription.plan.maxWarehouses },
      },
    };
  },

  /**
   * Activates or extends a subscription after successful payment verification.
   */
  async activateSubscription(
    organizationId: string,
    planId: string,
    billingCycle: BillingCycle,
    actorUserId: string
  ) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) {
      throw AppError.notFound('Plan', planId);
    }

    const now = new Date();
    const periodEnd = new Date();
    if (billingCycle === BillingCycle.YEARLY) {
      periodEnd.setFullYear(now.getFullYear() + 1);
    } else if (billingCycle === BillingCycle.QUARTERLY) {
      periodEnd.setMonth(now.getMonth() + 3);
    } else {
      periodEnd.setMonth(now.getMonth() + 1);
    }

    // Check for existing active subscription
    const existing = await prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    let subscription;
    if (existing) {
      subscription = await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });
    } else {
      subscription = await prisma.subscription.create({
        data: {
          organizationId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        include: { plan: true },
      });
    }

    await auditService.log({
      scope: 'ORGANIZATION',
      organizationId,
      actorUserId,
      action: 'SUBSCRIPTION_ACTIVATED',
      resource: 'Subscription',
      resourceId: subscription.id,
      metadata: {
        planName: plan.name,
        planCode: plan.code,
        billingCycle,
        periodEnd,
      },
    });

    return subscription;
  },

  /**
   * Starts a 14-day free trial for a new organization.
   */
  async createTrialSubscription(organizationId: string, planId?: string) {
    let targetPlan = null;
    if (planId) {
      targetPlan = await prisma.plan.findUnique({ where: { id: planId } });
    }
    if (!targetPlan) {
      targetPlan = await prisma.plan.findFirst({
        where: { code: 'growth_v1', isActive: true },
      }) || await prisma.plan.findFirst({ where: { isActive: true } });
    }

    if (!targetPlan) {
      throw AppError.badRequest('No active commercial plan available for trial.');
    }

    const now = new Date();
    const trialEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return prisma.subscription.create({
      data: {
        organizationId,
        planId: targetPlan.id,
        status: SubscriptionStatus.TRIAL,
        billingCycle: BillingCycle.MONTHLY,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        trialEndsAt: trialEnd,
      },
      include: { plan: true },
    });
  },
};
