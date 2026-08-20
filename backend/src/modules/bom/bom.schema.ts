import { z } from 'zod';

export const createBomAssemblySchema = z.object({
  name: z.string().min(2, 'Assembly name must be at least 2 characters').max(100),
  sku: z.string().min(2, 'SKU must be at least 2 characters').max(50).toUpperCase(),
  category: z.string().default('Workstation Bundles'),
  description: z.string().max(500).optional(),
  sellingPrice: z.coerce.number().positive('Selling price must be greater than 0'),
  components: z
    .array(
      z.object({
        productId: z.string().min(1, 'Product ID is required'),
        qtyRequired: z.coerce.number().int().positive('Quantity required must be at least 1'),
      })
    )
    .min(1, 'Assembly recipe must include at least 1 component product'),
});

export const updateBomAssemblySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  category: z.string().optional(),
  description: z.string().max(500).optional(),
  sellingPrice: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional(),
  components: z
    .array(
      z.object({
        productId: z.string().min(1),
        qtyRequired: z.coerce.number().int().positive(),
      })
    )
    .optional(),
});

export const buildBomAssemblySchema = z.object({
  quantity: z.coerce.number().int().positive('Build quantity must be at least 1').default(1),
  notes: z.string().max(250).optional(),
});

export const queryBomAssemblySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
  search: z.string().optional(),
  category: z.string().optional(),
});

export type CreateBomAssemblyInput = z.infer<typeof createBomAssemblySchema>;
export type UpdateBomAssemblyInput = z.infer<typeof updateBomAssemblySchema>;
export type BuildBomAssemblyInput = z.infer<typeof buildBomAssemblySchema>;
export type QueryBomAssemblyInput = z.infer<typeof queryBomAssemblySchema>;
