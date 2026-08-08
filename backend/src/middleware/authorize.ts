// authorize middleware
//
// Guards a route to specific roles. Must be used AFTER authenticate()
// because it reads req.user that authenticate() sets.
//
// Usage:
//   router.get('/admin-only', authenticate, authorize('ADMIN'), handler)
//   router.get('/sales-or-admin', authenticate, authorize('ADMIN', 'SALES'), handler)
//
// HTTP semantics:
//   401 — not authenticated (handled by authenticate)
//   403 — authenticated but role not permitted (handled here)

import { NextFunction, Request, Response } from 'express';
import { Role } from '@prisma/client';
import { AppError } from './error-handler';

/**
 * Returns a middleware that allows only the specified roles through.
 * Assumes authenticate() has already run and populated req.user.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Guard: authenticate() should always run first.
    if (!req.user) {
      const err: AppError = new Error('Authentication required.');
      err.statusCode = 401;
      err.isOperational = true;
      return next(err);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const err: AppError = new Error(
        'You do not have permission to access this resource.',
      );
      err.statusCode = 403;
      err.isOperational = true;
      return next(err);
    }

    next();
  };
}
