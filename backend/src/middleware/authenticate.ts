// authenticate middleware
//
// Reads and verifies the Bearer token from the Authorization header,
// then attaches { userId, role } to req.user for downstream handlers.
//
// This middleware is stateless — it does NOT hit the database.
// Token integrity is guaranteed by the JWT signature alone.
// The /api/auth/me endpoint is the only one that queries the DB for
// fresh user data, and only because the client explicitly requested it.

import { NextFunction, Request, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { verifyToken } from '../utils/jwt';
import { AppError } from './error-handler';

/**
 * Protects a route by requiring a valid Bearer JWT.
 *
 * On success: sets req.user and calls next().
 * On failure: calls next() with a 401 AppError.
 */
export function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers['authorization'];

  // Header must be present and follow the "Bearer <token>" format.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(makeAuthError('Authentication token is required.'));
  }

  const token = authHeader.slice(7); // Strip the "Bearer " prefix

  try {
    const payload = verifyToken(token);
    req.user = { userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return next(makeAuthError('Token has expired. Please log in again.'));
    }
    if (err instanceof JsonWebTokenError) {
      return next(makeAuthError('Invalid token.'));
    }
    // Unexpected error — let the global handler deal with it
    next(err);
  }
}

/** Creates a 401 operational error for the centralized error handler. */
function makeAuthError(message: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = 401;
  err.isOperational = true;
  return err;
}
