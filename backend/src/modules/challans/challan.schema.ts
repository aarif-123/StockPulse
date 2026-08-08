// Zod validation schemas for the Sales Challan module.

import { z } from 'zod';

// ── Create Challan ────────────────────────────────────────────────────────────

export const createChallanSchema = z.object({
  customerId: z
    .string({ required_error: 'Customer ID is required.' })
    .min(1, 'Customer ID cannot be empty.')
    .trim(),
  items: z
    .array(
      z.object({
        productId: z
          .string({ required_error: 'Product ID is required.' })
          .min(1, 'Product ID cannot be empty.')
          .trim(),
        quantity: z.coerce
          .number({ required_error: 'Quantity is required.' })
          .int('Quantity must be an integer.')
          .gt(0, 'Quantity must be greater than 0.'),
      }),
      { required_error: 'Challan items are required.' }
    )
    .min(1, 'Challan must contain at least one item.'),
});

export type CreateChallanInput = z.infer<typeof createChallanSchema>;

// ── Challan List Query ────────────────────────────────────────────────────────

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit cannot exceed 100.').default(10),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;
