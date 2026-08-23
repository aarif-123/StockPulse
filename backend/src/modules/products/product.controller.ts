import { Request, Response, NextFunction } from 'express';
import * as productService from './product.service';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
  ProductIdParamSchema,
  CreateStockMovementSchema,
  MovementQuerySchema,
  BulkImportRequestSchema,
} from './product.schema';

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const validated = CreateProductSchema.parse(req.body);
    const result = await productService.createProduct(orgId, validated);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function bulkImportProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const isWarehouse = req.tenant?.role === 'WAREHOUSE';
    const validated = BulkImportRequestSchema.parse(req.body);
    const result = await productService.bulkImportProducts(
      orgId,
      validated.items,
      isWarehouse,
      validated.duplicateStrategy
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}


export async function listProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const validated = ProductQuerySchema.parse(req.query);
    const result = await productService.listProducts(orgId, validated);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProductById(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = ProductIdParamSchema.parse(req.params);
    const result = await productService.getProductById(orgId, id);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = ProductIdParamSchema.parse(req.params);
    const validated = UpdateProductSchema.parse(req.body);
    const result = await productService.updateProduct(orgId, id, validated);
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function createStockMovement(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = ProductIdParamSchema.parse(req.params);
    const validated = CreateStockMovementSchema.parse(req.body);
    const result = await productService.createStockMovement(
      orgId,
      id,
      req.user!.userId,
      validated
    );
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

export async function listStockMovements(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.tenant!.organizationId;
    const { id } = ProductIdParamSchema.parse(req.params);
    const validated = MovementQuerySchema.parse(req.query);
    const result = await productService.listStockMovements(orgId, id, validated);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
