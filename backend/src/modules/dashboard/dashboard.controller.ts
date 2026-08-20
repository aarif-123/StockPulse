import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';

export async function getStats(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const stats = await dashboardService.getDashboardStats(orgId);
    res.status(200).json({ data: stats });
  } catch (err) {
    next(err);
  }
}
