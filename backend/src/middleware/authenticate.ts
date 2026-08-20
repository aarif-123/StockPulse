import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt';
import { AppError } from './error-handler';

/**
 * Protects a route by requiring a valid Bearer JWT.
 * Sets req.user = { userId, isSuperAdmin, supportSessionId?, impersonatedBy? }.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Authentication token is required.'));
  }

  const token = authHeader.slice(7).trim();

  try {
    const payload = verifyToken(token);
    req.user = {
      userId: payload.userId,
      isSuperAdmin: Boolean(payload.isSuperAdmin),
      supportSessionId: payload.supportSessionId,
      impersonatedBy: payload.impersonatedBy,
    };

    if (req.user.supportSessionId && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next(
        AppError.forbidden(
          'Read-only mode: Modifications are not permitted during a support session.'
        )
      );
    }

    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return next(AppError.unauthorized('Token has expired. Please log in again.'));
    }
    if (err instanceof JsonWebTokenError) {
      return next(AppError.unauthorized('Invalid authentication token.'));
    }
    next(err);
  }
}
