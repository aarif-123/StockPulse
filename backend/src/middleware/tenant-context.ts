import { NextFunction, Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from './error-handler';
import { getRolePermissions } from '../config/permissions';

interface CachedTenantContext {
  organizationId: string;
  role: string;
  permissions: string[];
  isSuspended: boolean;
  subscriptionStatus: string;
  trialEndsAt: Date | null;
  cachedAt: number;
}

const TENANT_CACHE_TTL_MS = 30000; // 30 seconds
const tenantCache = new Map<string, CachedTenantContext>();

export function invalidateTenantCache(orgId?: string) {
  if (orgId) {
    for (const [key, val] of tenantCache.entries()) {
      if (val.organizationId === orgId) tenantCache.delete(key);
    }
  } else {
    tenantCache.clear();
  }
}

/**
 * Resolves and validates the active organization context for the authenticated user.
 * Reads 'x-organization-id' header or falls back to the user's first active organization membership.
 * Uses high-speed memory cache to avoid repetitive round-trip DB queries.
 */
export async function resolveTenantContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required to resolve organization context.'));
  }

  const requestedOrgId = req.headers['x-organization-id'] as string | undefined;
  const cacheKey = `${req.user.userId}:${requestedOrgId || 'default'}`;
  const now = Date.now();

  // Fast-path: Check memory cache
  const cached = tenantCache.get(cacheKey);
  if (cached && now - cached.cachedAt < TENANT_CACHE_TTL_MS && !req.user.supportSessionId) {
    if (cached.isSuspended) {
      return next(AppError.forbidden('This organization account is currently suspended. Please contact platform support.'));
    }

    req.tenant = {
      organizationId: cached.organizationId,
      role: cached.role as any,
      permissions: cached.permissions as any,
    };

    const isExemptRoute =
      req.baseUrl.includes('/payments') ||
      (req.baseUrl.includes('/organizations') && (req.path.includes('/subscription') || req.path === ''));

    if (!isExemptRoute && !req.user.isSuperAdmin) {
      const isTrialExpired =
        cached.subscriptionStatus === 'TRIAL' &&
        cached.trialEndsAt &&
        new Date() > new Date(cached.trialEndsAt);

      if (cached.subscriptionStatus === 'EXPIRED' || cached.subscriptionStatus === 'CANCELLED' || isTrialExpired) {
        return next(
          AppError.forbidden(
            'Your 7-day free trial or subscription has expired. Please upgrade on the Billing & Plans page to continue using StockPulse.'
          )
        );
      }
    }

    return next();
  }

  try {
    let membership = null;

    if (requestedOrgId) {
      membership = await prisma.organizationMembership.findUnique({
        where: {
          userId_organizationId: {
            userId: req.user.userId,
            organizationId: requestedOrgId,
          },
        },
        include: {
          organization: {
            include: {
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
    } else {
      membership = await prisma.organizationMembership.findFirst({
        where: {
          userId: req.user.userId,
          status: 'ACTIVE',
        },
        include: {
          organization: {
            include: {
              subscriptions: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });
    }

    // Special case: If user is SuperAdmin and no membership exists for requested org, check if SuperAdmin support session is active
    if (!membership && req.user.isSuperAdmin && requestedOrgId) {
      const org = await prisma.organization.findUnique({ where: { id: requestedOrgId } });
      if (org) {
        req.tenant = {
          organizationId: org.id,
          role: 'ORG_ADMIN',
          permissions: getRolePermissions('ORG_ADMIN'),
        };
        return next();
      }
    }

    if (!membership || membership.status !== 'ACTIVE') {
      return next(
        AppError.forbidden(
          'You do not have active membership access to the requested organization.'
        )
      );
    }

    if (membership.organization.status === 'SUSPENDED') {
      return next(
        AppError.forbidden(
          'This organization account is currently suspended. Please contact platform support.'
        )
      );
    }

    const permissions = getRolePermissions(
      req.user.supportSessionId ? 'ORG_ADMIN' : membership.role
    );

    req.tenant = {
      organizationId: membership.organizationId,
      role: req.user.supportSessionId ? 'ORG_ADMIN' : membership.role,
      permissions,
    };

    const latestSub = membership.organization.subscriptions?.[0];
    const subStatus = latestSub?.status || 'TRIAL';
    const trialEndsAt = latestSub?.trialEndsAt || null;

    // Cache the resolved result for 30s
    tenantCache.set(cacheKey, {
      organizationId: membership.organizationId,
      role: membership.role,
      permissions,
      isSuspended: String(membership.organization.status) === 'SUSPENDED',
      subscriptionStatus: subStatus,
      trialEndsAt,
      cachedAt: now,
    });

    // Strict Trial Expiration & Subscription Lock Enforcement
    const isExemptRoute =
      req.baseUrl.includes('/payments') ||
      (req.baseUrl.includes('/organizations') && (req.path.includes('/subscription') || req.path === ''));

    if (!isExemptRoute && !req.user.supportSessionId && !req.user.isSuperAdmin) {
      const isTrialExpired =
        subStatus === 'TRIAL' &&
        trialEndsAt &&
        new Date() > new Date(trialEndsAt);

      if (subStatus === 'EXPIRED' || subStatus === 'CANCELLED' || isTrialExpired) {
        if (isTrialExpired && latestSub && latestSub.status !== 'EXPIRED') {
          await prisma.subscription.update({
            where: { id: latestSub.id },
            data: { status: 'EXPIRED' },
          });
        }

        return next(
          AppError.forbidden(
            'Your 7-day free trial or subscription has expired. Please upgrade on the Billing & Plans page to continue using StockPulse.'
          )
        );
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}
