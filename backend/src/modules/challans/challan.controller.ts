// Sales Challan controller — request/response adapter.

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { createChallanSchema, listQuerySchema } from './challan.schema';
import {
  createChallan,
  listChallans,
  getChallanById,
  confirmChallan,
  cancelChallan,
} from './challan.service';
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

/** POST /api/challans */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createChallanSchema.parse(req.body);
    const userId = req.user!.userId;
    const challan = await createChallan(userId, body);
    res.status(201).json({ data: challan });
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** GET /api/challans */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listQuerySchema.parse(req.query);
    const result = await listChallans(query);
    res.status(200).json(result);
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** GET /api/challans/:id */
export async function getOne(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const challan = await getChallanById(req.params['id'] as string);
    res.status(200).json({ data: challan });
  } catch (err) {
    next(err);
  }
}

/** POST /api/challans/:id/confirm */
export async function confirm(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const challan = await confirmChallan(req.params['id'] as string, userId);
    res.status(200).json({
      message: 'Challan confirmed successfully.',
      data: challan,
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/challans/:id/cancel */
export async function cancel(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const challan = await cancelChallan(req.params['id'] as string);
    res.status(200).json({
      message: 'Challan cancelled successfully.',
      data: challan,
    });
  } catch (err) {
    next(err);
  }
}
