// 404 catch-all handler.
// Register this AFTER all routes so any unmatched request hits it.

import { NextFunction, Request, Response } from 'express';
import { AppError } from './error-handler';

export function notFound(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const err: AppError = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  err.isOperational = true;
  next(err);
}
