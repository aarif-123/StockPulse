import { Request, Response, NextFunction } from 'express';
import * as customerService from './customer.service';
import {
  CreateCustomerSchema,
  UpdateCustomerSchema,
  ListQuerySchema,
  FollowUpSchema,
  CustomerIdParamSchema,
} from './customer.schema';

export async function createCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const validated = CreateCustomerSchema.parse(req.body);
    const result = await customerService.createCustomer(orgId, validated);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const validated = ListQuerySchema.parse(req.query);
    const result = await customerService.listCustomers(orgId, validated);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getCustomerById(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = CustomerIdParamSchema.parse(req.params);
    const result = await customerService.getCustomerById(orgId, id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateCustomer(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = CustomerIdParamSchema.parse(req.params);
    const validated = UpdateCustomerSchema.parse(req.body);
    const result = await customerService.updateCustomer(orgId, id, validated);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function addFollowUp(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = CustomerIdParamSchema.parse(req.params);
    const validated = FollowUpSchema.parse(req.body);
    const result = await customerService.addFollowUp(orgId, id, validated);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}
