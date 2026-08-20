import { NextFunction, Request, Response } from 'express';
import { OrgRole } from '@prisma/client';
import { AppError } from './error-handler';
import { PermissionCode } from '../config/permissions';

/**
 * Guards a route based on organization roles.
 * Must be used after authenticate and resolveTenantContext.
 */
export function authorize(...allowedRoles: OrgRole[]) {
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

    if (!allowedRoles.includes(req.tenant.role)) {
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
