// Zod validation schemas for the Product and Inventory module.

import { z } from 'zod';
import { StockMovementType } from '@prisma/client';

// ── Product Creation ─────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required.' })
    .min(1, 'Product name cannot be empty.')
    .trim(),
  sku: z
    .string({ required_error: 'SKU is required.' })
    .min(1, 'SKU cannot be empty.')
    .trim(),
  category: z
    .string({ required_error: 'Category is required.' })
    .min(1, 'Category cannot be empty.')
    .trim(),
  unitPrice: z.coerce
    .number({ required_error: 'Unit price is required.' })
    .min(0, 'Unit price must be greater than or equal to 0.'),
  currentStock: z.coerce
    .number({ required_error: 'Current stock is required.' })
    .int('Current stock must be an integer.')
    .min(0, 'Current stock must be greater than or equal to 0.'),
  minimumStock: z.coerce
    .number({ required_error: 'Minimum stock is required.' })
    .int('Minimum stock must be an integer.')
    .min(0, 'Minimum stock must be greater than or equal to 0.'),
  warehouseLocation: z
    .string({ required_error: 'Warehouse location is required.' })
    .min(1, 'Warehouse location cannot be empty.')
    .trim(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

// ── Product Update ───────────────────────────────────────────────────────────

// PUT /api/products/:id allows updating all fields EXCEPT:
// - id, currentStock, createdAt, updatedAt.
// We reuse the create schema fields by omitting currentStock.
export const updateProductSchema = createProductSchema.omit({ currentStock: true }).partial();

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

// ── Product List Query ────────────────────────────────────────────────────────

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100.').default(10),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  // Coerce lowStock string "true" / "false" or boolean
  lowStock: z
    .preprocess((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    }, z.boolean())
    .optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;

// ── Stock Movement ───────────────────────────────────────────────────────────

export const createStockMovementSchema = z.object({
  type: z.nativeEnum(StockMovementType, {
    errorMap: () => ({ message: `Movement type must be one of: ${Object.values(StockMovementType).join(', ')}.` }),
  }),
  quantity: z.coerce
    .number({ required_error: 'Quantity is required.' })
    .int('Quantity must be an integer.')
    .gt(0, 'Quantity must be greater than 0.'),
  reason: z
    .string({ required_error: 'Reason is required.' })
    .min(1, 'Reason cannot be empty.')
    .trim(),
});

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;

// ── Stock Movement List Query ────────────────────────────────────────────────

export const movementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100.').default(10),
});

export type MovementQueryInput = z.infer<typeof movementQuerySchema>;
