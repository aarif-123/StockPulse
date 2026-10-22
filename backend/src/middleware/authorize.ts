import { NextFunction, Request, Response } from 'express';
import { OrgRole } from '@prisma/client';
import { AppError } from './error-handler';
import { PermissionCode } from '../config/permissions';

/**
 * Guards a route based on organization roles.
 * Must be used after authenticate and resolveTenantContext.
 */
export function authorize(...roles: (OrgRole | OrgRole[] | string | string[])[]) {
  const allowedRoles = (roles as unknown[]).flat().map((r) => String(r));
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required.'));
    }

    if (req.user.isSuperAdmin) {
      return next(); // Super Admins bypass organization role constraints
    }

    if (!req.tenant) {
      return next(AppError.forbidden('Organization tenant context required.'));
    }

    const userRole = String(req.tenant.role);
    const isAllowed =
      allowedRoles.includes(userRole) ||
      (userRole === 'ORG_ADMIN' && allowedRoles.includes('ADMIN')) ||
      (userRole === 'ADMIN' && allowedRoles.includes('ORG_ADMIN'));

    if (!isAllowed) {
      return next(
        AppError.forbidden(
          `Your role (${req.tenant.role}) does not have permission to perform this action.`
        )
      );
    }

    next();
  };
}

/**
 * Guards a route based on granular permission capabilities.
 * Must be used after authenticate and resolveTenantContext.
 */
export function requirePermission(...requiredPermissions: (PermissionCode | string)[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required.'));
    }

    if (req.user.isSuperAdmin) {
      return next(); // Super Admins bypass organization permission constraints
    }

    if (!req.tenant) {
      return next(AppError.forbidden('Organization tenant context required.'));
    }

    const hasAll = requiredPermissions.every((perm) =>
      req.tenant!.permissions.includes(perm)
    );

    if (!hasAll) {
      return next(
        AppError.forbidden(
          'You do not have the required permission capability to access this resource.'
        )
      );
    }

    next();
  };
}

/**
 * Guards a route based on plan-allowed commercial features.
 * Must be used after authenticate and resolveTenantContext.
 */
export function requireFeature(featureCode: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required.'));
    }

    if (req.user.isSuperAdmin || req.user.supportSessionId) {
      return next(); // Super Admins bypass commercial feature restrictions
    }

    if (!req.tenant) {
      return next(AppError.forbidden('Organization tenant context required.'));
    }

    try {
      const { entitlementService } = await import('../modules/subscriptions/entitlement.service');
      await entitlementService.assertFeature(req.tenant.organizationId, featureCode);
      next();
    } catch (err) {
      next(err);
    }
  };
}

