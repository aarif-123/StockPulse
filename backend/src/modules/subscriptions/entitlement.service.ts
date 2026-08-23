import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';

export interface QuotaCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  resource: string;
}

const featureCache = new Map<string, { features: string[]; cachedAt: number }>();
const FEATURE_CACHE_TTL_MS = 30000; // 30 seconds

export function invalidateFeatureCache(orgId?: string) {
  if (orgId) featureCache.delete(orgId);
  else featureCache.clear();
}

export const entitlementService = {
  /**
   * Checks if an organization has a specific feature enabled in its active subscription plan.
   */
  async hasFeature(organizationId: string, featureCode: string): Promise<boolean> {
    const now = Date.now();
    const cached = featureCache.get(organizationId);
    if (cached && now - cached.cachedAt < FEATURE_CACHE_TTL_MS) {
      return cached.features.includes(featureCode);
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription || !subscription.plan) {
      featureCache.set(organizationId, { features: [], cachedAt: now });
      return false;
    }

    const allowed = subscription.plan.allowedFeatures || [];
    featureCache.set(organizationId, { features: allowed, cachedAt: now });
    return allowed.includes(featureCode);
  },

  /**
   * Asserts that an organization has a specific feature, throwing 403 AppError if missing.
   */
  async assertFeature(organizationId: string, featureCode: string): Promise<void> {
    const has = await this.hasFeature(organizationId, featureCode);
    if (!has) {
      throw AppError.featureNotIncluded(featureCode);
    }
  },

  /**
   * Checks current utilization against the active plan limit for a given resource.
   */
  async checkQuota(
    organizationId: string,
    resource: 'products' | 'customers' | 'transactions' | 'users' | 'warehouses'
  ): Promise<QuotaCheckResult> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription || !subscription.plan) {
      throw AppError.forbidden('No active subscription found for this organization. Please subscribe to a plan.');
    }

    const { plan } = subscription;
    let current = 0;
    let limit = 0;

    switch (resource) {
      case 'products':
        current = await prisma.product.count({ where: { organizationId } });
        limit = plan.maxProducts;
        break;
      case 'customers':
        current = await prisma.customer.count({ where: { organizationId } });
        limit = plan.maxCustomers;
        break;
      case 'transactions':
        current = await prisma.transaction.count({ where: { organizationId } });
        limit = plan.maxTransactions;
        break;
      case 'users':
        current = await prisma.organizationMembership.count({
          where: { organizationId, status: 'ACTIVE' },
        });
        limit = plan.maxUsers;
        break;
      case 'warehouses':
        current = 1; // Default single warehouse currently
        limit = plan.maxWarehouses;
        break;
    }

    return {
      allowed: current < limit,
      current,
      limit,
      resource,
    };
  },

  /**
   * Transaction-safe quota assertion before creating an entity.
   * Can be executed inside a Prisma transaction context.
   */
  async assertQuotaAvailable(
    tx: Prisma.TransactionClient,
    organizationId: string,
    resource: 'products' | 'customers' | 'transactions' | 'users',
    additionalCount: number = 1
  ): Promise<void> {
    const subscription = await tx.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'TRIAL'] },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription || !subscription.plan) {
      throw AppError.forbidden('No active subscription found. Please subscribe to a plan.');
    }

    const { plan } = subscription;
    let current = 0;
    let limit = 0;

    switch (resource) {
      case 'products':
        current = await tx.product.count({ where: { organizationId } });
        limit = plan.maxProducts;
        break;
      case 'customers':
        current = await tx.customer.count({ where: { organizationId } });
        limit = plan.maxCustomers;
        break;
      case 'transactions':
        current = await tx.transaction.count({ where: { organizationId } });
        limit = plan.maxTransactions;
        break;
      case 'users':
        current = await tx.organizationMembership.count({
          where: { organizationId, status: 'ACTIVE' },
        });
        limit = plan.maxUsers;
        break;
    }

    if (current + additionalCount > limit) {
      throw AppError.quotaExceeded(resource, limit, current);
    }
  },
};

