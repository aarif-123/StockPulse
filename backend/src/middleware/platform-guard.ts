import { NextFunction, Request, Response } from 'express';
import { AppError } from './error-handler';

/**
 * Ensures that the authenticated user is a verified Platform Super Administrator.
 * Must run AFTER authenticate middleware.
 */
export function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required.'));
  }

  if (!req.user.isSuperAdmin) {
    return next(
      AppError.forbidden('Access denied. This endpoint requires Platform Super Administrator authority.')
    );
  }

  next();
}
