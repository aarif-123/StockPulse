import { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';
import { StockMovementsReportSchema, ReportsAnalyticsQuerySchema } from './reports.schema';

export async function getStockMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const validated = StockMovementsReportSchema.parse(req.query);
    const result = await reportsService.getStockMovementsReport(orgId, validated);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const validated = ReportsAnalyticsQuerySchema.parse(req.query);
    const result = await reportsService.getReportsAnalytics(orgId, validated.range || '30d');
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
