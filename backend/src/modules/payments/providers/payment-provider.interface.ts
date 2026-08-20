import { BillingCycle, PaymentMethod, PaymentRequestStatus } from '@prisma/client';

export interface CreatePaymentIntentParams {
  organizationId: string;
  planId: string;
  amountINR: number;
  billingCycle: BillingCycle;
  submittedByUserId: string;
  referenceNumber?: string;
  notes?: string;
  proofUrl?: string;
}

export interface PaymentIntentResult {
  paymentRequestId: string;
  status: PaymentRequestStatus;
  paymentMethod: PaymentMethod;
  amountINR: number;
  currency: string;
  upiQrData?: {
    upiId: string;
    payeeName: string;
    amountINR: number;
    transactionNote: string;
    qrString: string;
  };
  gatewayData?: Record<string, unknown>;
  message: string;
}

export interface PaymentVerificationResult {
  verified: boolean;
  paymentRequestId: string;
  organizationId: string;
  planId: string;
  billingCycle: BillingCycle;
  message: string;
}

export interface IPaymentProvider {
  readonly providerName: PaymentMethod;
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  verifyPayment(paymentRequestId: string, reviewerUserId: string, approved: boolean, rejectionReason?: string): Promise<PaymentVerificationResult>;
}
