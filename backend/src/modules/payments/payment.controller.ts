import { Request, Response, NextFunction } from 'express';
import { paymentService } from './payment.service';
import { z } from 'zod';
import { BillingCycle } from '@prisma/client';

const SubmitUpiPaymentSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  billingCycle: z.nativeEnum(BillingCycle),
  referenceNumber: z.string().min(4, 'Please enter a valid UPI reference / UTR number'),
  notes: z.string().optional(),
  proofUrl: z.string().optional(),
});

export const paymentController = {
  async getPlans(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await paymentService.getAvailablePlans();
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },

  async submitManualUpiPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const parsed = SubmitUpiPaymentSchema.parse(req.body);
      const data = await paymentService.submitManualUpiPayment(orgId, req.user!.userId, parsed);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  },

  async getHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.tenant!.organizationId;
      const data = await paymentService.getOrganizationPaymentHistory(orgId);
      res.status(200).json({ data });
    } catch (err) {
      next(err);
    }
  },
};
