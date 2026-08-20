import { z } from 'zod';

export const PlanTierEnum = z.enum(['BASIC', 'PREMIUM', 'STARTER', 'GROWTH', 'ENTERPRISE']);
export type PlanTier = z.infer<typeof PlanTierEnum>;

export const BillingCycleEnum = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ANNUAL']);
export type BillingCycle = z.infer<typeof BillingCycleEnum>;

export const createOrderSchema = z.object({
  planId: PlanTierEnum,
  billingCycle: BillingCycleEnum.default('MONTHLY'),
  customerName: z.string().min(2, 'Customer name is required').max(100),
  customerEmail: z.string().email('Valid email address is required'),
  customerPhone: z.string().min(10, 'Valid phone number is required').max(15).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const createTrialSchema = z.object({
  planId: PlanTierEnum.default('PREMIUM'),
  billingCycle: BillingCycleEnum.default('MONTHLY'),
  customerName: z.string().min(2, 'Customer name is required').max(100),
  customerEmail: z.string().email('Valid email address is required'),
  customerPhone: z.string().min(10, 'Valid phone number is required').max(15).optional(),
});

export type CreateTrialInput = z.infer<typeof createTrialSchema>;

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
  planId: PlanTierEnum,
  billingCycle: BillingCycleEnum.default('MONTHLY'),
  customerEmail: z.string().email('Customer email is required'),
  isTrial: z.boolean().optional(),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
