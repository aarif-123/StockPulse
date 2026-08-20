import { Request, Response, NextFunction } from 'express';
import * as reportsService from './reports.service';
import { StockMovementsReportSchema } from './reports.schema';

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
    const result = await reportsService.getReportsAnalytics(orgId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
