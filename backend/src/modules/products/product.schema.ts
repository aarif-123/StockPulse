import { z } from 'zod';
import { StockMovementType } from '@prisma/client';

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

export const updateProductSchema = createProductSchema.omit({ currentStock: true }).partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500, 'Limit cannot exceed 500.').default(10),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  lowStock: z
    .preprocess((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return val;
    }, z.boolean())
    .optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;

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

export const movementQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500, 'Limit cannot exceed 500.').default(10),
});

export type MovementQueryInput = z.infer<typeof movementQuerySchema>;

export const bulkImportItemSchema = createProductSchema.extend({
  unitPrice: z.coerce
    .number()
    .min(0, 'Unit price must be greater than or equal to 0.')
    .default(0),
  currentStock: z.coerce
    .number()
    .int('Current stock must be an integer.')
    .min(0, 'Current stock must be greater than or equal to 0.')
    .default(0),
  minimumStock: z.coerce
    .number()
    .int('Minimum stock must be an integer.')
    .min(0, 'Minimum stock must be greater than or equal to 0.')
    .default(10),
  warehouseLocation: z
    .string()
    .min(1, 'Warehouse location cannot be empty.')
    .default('Main Warehouse'),
});

export const DuplicateStrategySchema = z.enum(['MERGE_STOCK', 'SKIP_DUPLICATES', 'REPLACE_ALL', 'STRICT']);
export type DuplicateStrategy = z.infer<typeof DuplicateStrategySchema>;

export const bulkImportRequestSchema = z.object({
  items: z.array(bulkImportItemSchema).min(1, 'At least 1 product item is required for import.'),
  duplicateStrategy: DuplicateStrategySchema.default('MERGE_STOCK'),
});

export type BulkImportItemInput = z.infer<typeof bulkImportItemSchema>;
export type BulkImportRequestInput = z.infer<typeof bulkImportRequestSchema>;


export const ProductIdParamSchema = z.object({
  id: z.string().min(1, 'Product ID is required'),
});

export const CreateProductSchema = createProductSchema;
export const UpdateProductSchema = updateProductSchema;
export const ProductQuerySchema = productQuerySchema;
export const CreateStockMovementSchema = createStockMovementSchema;
export const MovementQuerySchema = movementQuerySchema;
export const BulkImportRequestSchema = bulkImportRequestSchema;

