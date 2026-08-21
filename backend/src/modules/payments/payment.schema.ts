import { z } from 'zod';

export const PlanTierEnum = z.enum(['BASIC', 'PREMIUM', 'STARTER', 'GROWTH', 'ENTERPRISE']);
export type PlanTier = z.infer<typeof PlanTierEnum>;

export const BillingCycleEnum = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'ANNUAL']);
export type BillingCycle = z.infer<typeof BillingCycleEnum>;
