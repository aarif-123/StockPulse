// Product and Inventory controller — thin request/response layer.

import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  createStockMovementSchema,
  movementQuerySchema,
} from './product.schema';
import {
  createProduct,
  listProducts,
  getProductById,
  updateProduct,
  createStockMovement,
  listStockMovements,
} from './product.service';
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

/** POST /api/products */
export async function create(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createProductSchema.parse(req.body);
    const product = await createProduct(body);
    res.status(201).json({ data: product });
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** GET /api/products */
export async function list(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = productQuerySchema.parse(req.query);
    const result = await listProducts(query);
    res.status(200).json(result);
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** GET /api/products/:id */
export async function getOne(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const product = await getProductById(req.params['id'] as string);
    res.status(200).json({ data: product });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/products/:id */
export async function update(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = updateProductSchema.parse(req.body);
    const product = await updateProduct(req.params['id'] as string, body);
    res.status(200).json({ data: product });
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** POST /api/products/:id/stock-movements */
export async function createMovement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = createStockMovementSchema.parse(req.body);
    // createdBy is resolved securely from req.user (set by auth middleware)
    const userId = req.user!.userId;
    const result = await createStockMovement(req.params['id'] as string, userId, body);
    res.status(201).json({
      message: 'Stock movement recorded successfully.',
      data: result,
    });
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}

/** GET /api/products/:id/stock-movements */
export async function listMovements(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = movementQuerySchema.parse(req.query);
    const result = await listStockMovements(req.params['id'] as string, query);
    res.status(200).json(result);
  } catch (err) {
    next(err instanceof ZodError ? zodToBadRequest(err) : err);
  }
}
