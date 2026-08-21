import { api } from './api';
import type { ApiResponse } from '../types';

export type PlanTierType = 'BASIC' | 'PREMIUM' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';

export interface SaaSPlan {
  id: PlanTierType;
  name: string;
  monthlyPriceINR: number;
  quarterlyPriceINR: number;
  yearlyPriceINR: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

export type BillingCycleType = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'ANNUAL';

export const paymentService = {
  async getPlans(): Promise<ApiResponse<SaaSPlan[]>> {
    const res = await api.get<ApiResponse<SaaSPlan[]>>('/payments/plans');
    return res.data;
  },
};
