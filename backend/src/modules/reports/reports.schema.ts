import { z } from 'zod';

export const stockMovementsReportSchema = z.object({
  productId: z.string().optional(),
  type:      z.enum(['IN', 'OUT']).optional(),
  dateFrom:  z.string().datetime({ offset: true }).optional(),
  dateTo:    z.string().datetime({ offset: true }).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(500).default(25),
});

export type StockMovementsReportInput = z.infer<typeof stockMovementsReportSchema>;
export const StockMovementsReportSchema = stockMovementsReportSchema;
