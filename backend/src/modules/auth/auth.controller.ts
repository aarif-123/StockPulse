// Auth controller — thin request/response layer.
//
// Responsibilities:
//   1. Parse and validate the request body (via Zod).
//   2. Call the service function.
//   3. Send the response.
//   4. Forward errors to the centralized error handler via next().
//
// No business logic lives here. No try/catch wrappers around service
// calls that don't add value — errors thrown by the service are
// real AppErrors already shaped for the error handler.

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { loginSchema } from './auth.schema';
import { loginUser, getUserById } from './auth.service';
import { AppError } from '../../middleware/error-handler';

/**
 * POST /api/auth/login
 *
 * Validates the body, delegates to auth service, returns token + user.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Zod validates and strips unknown fields in one step
    const body = loginSchema.parse(req.body);
    const result = await loginUser(body.email, body.password);
    res.status(200).json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      // Surface the first validation issue as a readable 400 message
      const message = err.errors[0]?.message ?? 'Invalid request body.';
      const appErr: AppError = new Error(message);
      appErr.statusCode = 400;
      appErr.isOperational = true;
      return next(appErr);
    }
    next(err);
  }
}

/**
 * GET /api/auth/me
 *
 * Returns fresh user data for the currently authenticated user.
 * req.user is guaranteed to exist because authenticate() runs first.
 */
export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // req.user is set by the authenticate middleware — safe to assert here
    const user = await getUserById(req.user!.userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}
