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

export interface RazorpayOrderData {
  orderId: string;
  amountInPaise: number;
  currency: string;
  keyId: string;
  plan: SaaSPlan;
  billingCycle: BillingCycleType;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  isTrial?: boolean;
  trialDays?: number;
  autopayNextBillingDate?: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  planId: PlanTierType;
  billingCycle: BillingCycleType;
  customerEmail: string;
  isTrial?: boolean;
}

export interface SubscriptionActivationResult {
  verified: boolean;
  subscriptionId: string;
  plan: SaaSPlan;
  billingCycle: BillingCycleType;
  isTrial?: boolean;
  trialDays?: number;
  message: string;
}

export const paymentService = {
  async getPlans(): Promise<ApiResponse<SaaSPlan[]>> {
    const res = await api.get<ApiResponse<SaaSPlan[]>>('/payments/plans');
    return res.data;
  },

  async createOrder(data: {
    planId: PlanTierType;
    billingCycle: BillingCycleType;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
  }): Promise<ApiResponse<RazorpayOrderData>> {
    const res = await api.post<ApiResponse<RazorpayOrderData>>('/payments/create-order', data);
    return res.data;
  },

  async startTrial(data: {
    planId?: PlanTierType;
    billingCycle?: BillingCycleType;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
  }): Promise<ApiResponse<RazorpayOrderData>> {
    const res = await api.post<ApiResponse<RazorpayOrderData>>('/payments/start-trial', data);
    return res.data;
  },

  async verifyPayment(payload: VerifyPaymentPayload): Promise<ApiResponse<SubscriptionActivationResult>> {
    const res = await api.post<ApiResponse<SubscriptionActivationResult>>('/payments/verify', payload);
    return res.data;
  },
};
