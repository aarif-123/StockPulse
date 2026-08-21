import { z } from 'zod';

export const stockMovementsReportSchema = z.object({
  search:    z.string().optional(),
  productId: z.string().optional(),
  type:      z.enum(['IN', 'OUT']).optional(),
  dateFrom:  z.string().optional(),
  dateTo:    z.string().optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(500).default(25),
});

export const reportsAnalyticsQuerySchema = z.object({
  range: z.enum(['7d', '15d', '30d', '90d', '365d']).default('30d').optional(),
});

export type StockMovementsReportInput = z.infer<typeof stockMovementsReportSchema>;
export type ReportsAnalyticsQueryInput = z.infer<typeof reportsAnalyticsQuerySchema>;
export const StockMovementsReportSchema = stockMovementsReportSchema;
export const ReportsAnalyticsQuerySchema = reportsAnalyticsQuerySchema;
