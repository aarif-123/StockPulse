import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(statusCode: number, message: string, isOperational = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code?: string): AppError {
    return new AppError(400, message, true, code);
  }

  static unauthorized(message = 'Authentication required.', code = 'UNAUTHORIZED'): AppError {
    return new AppError(401, message, true, code);
  }

  static forbidden(message = 'You do not have permission to access this resource.', code = 'FORBIDDEN'): AppError {
    return new AppError(403, message, true, code);
  }

  static notFound(resource = 'Resource', id?: string): AppError {
    const message = id ? `${resource} with id "${id}" not found.` : `${resource} not found.`;
    return new AppError(404, message, true, 'NOT_FOUND');
  }

  static conflict(message: string, code = 'CONFLICT'): AppError {
    return new AppError(409, message, true, code);
  }

  static quotaExceeded(resource: string, limit: number, current: number): AppError {
    return new AppError(
      403,
      `Your organization has reached the ${resource} quota limit of ${limit} (current: ${current}). Please upgrade your plan.`,
      true,
      'QUOTA_EXCEEDED'
    );
  }

  static featureNotIncluded(feature: string): AppError {
    return new AppError(
      403,
      `Feature '${feature}' is not included in your active subscription plan. Please upgrade to access this module.`,
      true,
      'FEATURE_NOT_INCLUDED'
    );
  }

  static fromZod(err: ZodError): AppError {
    const message = err.errors[0]?.message ?? 'Invalid request data.';
    return new AppError(400, message, true, 'VALIDATION_ERROR');
  }
}

export function errorHandler(
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let statusCode = 500;
  let isOperational = false;
  let clientMessage = 'An unexpected error occurred. Please try again later.';
  let errorCode = 'INTERNAL_SERVER_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    isOperational = err.isOperational;
    clientMessage = err.message;
    errorCode = err.code ?? 'APP_ERROR';
  } else if (err instanceof ZodError) {
    statusCode = 400;
    isOperational = true;
    clientMessage = err.errors[0]?.message ?? 'Invalid request data.';
    errorCode = 'VALIDATION_ERROR';
  } else if ('statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number') {
    statusCode = (err as { statusCode: number }).statusCode;
    isOperational = (err as { isOperational?: boolean }).isOperational ?? false;
    clientMessage = isOperational ? err.message : clientMessage;
  }

  if (statusCode >= 500) {
    logger.error(
      {
        err,
        method: req.method,
        url: req.url,
        orgId: req.tenant?.organizationId,
        userId: req.user?.userId,
      },
      'Unhandled server error'
    );
  } else {
    logger.warn(
      {
        message: err.message,
        statusCode,
        code: errorCode,
        isOperational,
        method: req.method,
        url: req.url,
        orgId: req.tenant?.organizationId,
        userId: req.user?.userId,
      },
      'Operational request failure'
    );
  }

  res.status(statusCode).json({
    status: 'error',
    code: errorCode,
    message: clientMessage,
  });
}
