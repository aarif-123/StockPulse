import { Request, Response, NextFunction } from 'express';
import { bomService } from './bom.service';
import {
  createBomAssemblySchema,
  updateBomAssemblySchema,
  buildBomAssemblySchema,
  queryBomAssemblySchema,
} from './bom.schema';

export const bomController = {
  async listAssemblies(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.tenant!.organizationId;
      const query = queryBomAssemblySchema.parse(req.query);
      const result = await bomService.listAssemblies(organizationId, query);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async getAssemblyById(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const assembly = await bomService.getAssemblyById(organizationId, id);
      res.status(200).json({ success: true, data: assembly });
    } catch (err) {
      next(err);
    }
  },

  async createAssembly(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.tenant!.organizationId;
      const body = createBomAssemblySchema.parse(req.body);
      const assembly = await bomService.createAssembly(organizationId, body);
      res.status(201).json({ success: true, data: assembly, message: 'BOM Assembly created successfully' });
    } catch (err) {
      next(err);
    }
  },

  async updateAssembly(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const body = updateBomAssemblySchema.parse(req.body);
      const updated = await bomService.updateAssembly(organizationId, id, body);
      res.status(200).json({ success: true, data: updated, message: 'BOM Assembly updated successfully' });
    } catch (err) {
      next(err);
    }
  },

  async deleteAssembly(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.tenant!.organizationId;
      const { id } = req.params;
      const result = await bomService.deleteAssembly(organizationId, id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  },

  async buildAssembly(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.tenant!.organizationId;
      const userId = req.user!.userId;
      const { id } = req.params;
      const body = buildBomAssemblySchema.parse(req.body);
      const result = await bomService.buildAssembly(organizationId, userId, id, body);
      res.status(200).json({ success: true, data: result, message: result.message });
    } catch (err) {
      next(err);
    }
  },
};
