// Customer controller — thin request/response layer.
//
// Each handler:
//   1. Parses and validates input with Zod.
//   2. Calls the service.
//   3. Sends the response.
//   4. Forwards errors to next() — never duplicates error formatting.

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listQuerySchema,
  followUpSchema,
} from './customer.schema';
import {
  createCustomer,
  listCustomers,
  getCustomerById,
  updateCustomer,
  addFollowUp,
} from './customer.service';
import { AppError } from '../../middleware/error-handler';

// ── Shared helper ─────────────────────────────────────────────────────────────

/** Converts a ZodError into a clean 400 AppError for the centralized handler. */
function zodToBadRequest(err: ZodError): AppError {
  const message = err.errors[0]?.message ?? 'Invalid request data.';
  const appErr: AppError = new Error(message);
  appErr.statusCode = 400;
  appErr.isOperational = true;
  return appErr;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/** POST /api/customers */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createCustomerSchema.parse(req.body);
    const customer = await createCustomer(body);
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** GET /api/customers */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await listCustomers(query);
    res.status(200).json(result);
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** GET /api/customers/:id */
export async function getOne(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const customer = await getCustomerById(req.params['id'] as string);
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/customers/:id */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = updateCustomerSchema.parse(req.body);
    const customer = await updateCustomer(req.params['id'] as string, body);
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** POST /api/customers/:id/follow-ups */
export async function followUp(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = followUpSchema.parse(req.body);
    const customer = await addFollowUp(req.params['id'] as string, body);
    res.status(200).json({ data: customer });
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}
