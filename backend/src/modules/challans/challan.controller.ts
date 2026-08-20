import { Request, Response, NextFunction } from 'express';
import * as challanService from './challan.service';
import {
  CreateChallanSchema,
  ListQuerySchema,
  ChallanIdParamSchema,
} from './challan.schema';

export async function createChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const validated = CreateChallanSchema.parse(req.body);
    const result = await challanService.createChallan(orgId, req.user!.userId, validated);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listChallans(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const validated = ListQuerySchema.parse(req.query);
    const result = await challanService.listChallans(orgId, validated);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getChallanById(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = ChallanIdParamSchema.parse(req.params);
    const result = await challanService.getChallanById(orgId, id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function confirmChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = ChallanIdParamSchema.parse(req.params);
    const result = await challanService.confirmChallan(orgId, id, req.user!.userId);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function cancelChallan(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = ChallanIdParamSchema.parse(req.params);
    const result = await challanService.cancelChallan(orgId, id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
