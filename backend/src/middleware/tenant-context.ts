import { NextFunction, Request, Response } from 'express';
import prisma from '../config/database';
import { AppError } from './error-handler';
import { getRolePermissions } from '../config/permissions';

/**
 * Resolves and validates the active organization context for the authenticated user.
 * Reads 'x-organization-id' header or falls back to the user's first active organization membership.
 * Populates req.tenant with { organizationId, role, permissions }.
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

  try {
    // If user is a Super Admin and explicitly acting without an org, they may proceed to platform routes
    // But for tenant-scoped business routes, an organization context is mandatory.
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
          organization: true,
        },
      });
    } else {
      // Find default / first active organization membership
      membership = await prisma.organizationMembership.findFirst({
        where: {
          userId: req.user.userId,
          status: 'ACTIVE',
        },
        include: {
          organization: true,
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

    req.tenant = {
      organizationId: membership.organizationId,
      role: req.user.supportSessionId ? 'ORG_ADMIN' : membership.role,
      permissions: getRolePermissions(
        req.user.supportSessionId ? 'ORG_ADMIN' : membership.role
      ),
    };

    next();
  } catch (err) {
    next(err);
  }
}
