// Centralized Express error handler.
// Must be registered LAST in the middleware chain (4-argument signature).
// Never leaks stack traces or internal details to the caller.

import { NextFunction, Request, Response } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const isOperational = err.isOperational ?? false;

  // Log details internally — never send stack traces to the client
  if (statusCode >= 500) {
    console.error('[ErrorHandler]', {
      message: err.message,
      stack: err.stack,
    });
  }

  // Operational errors expose a safe message; programmer errors send a generic one
  const clientMessage = isOperational
    ? err.message
    : 'An unexpected error occurred. Please try again later.';

  res.status(statusCode).json({
    status: 'error',
    message: clientMessage,
  });
}
