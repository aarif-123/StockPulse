import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import { ManualUpiPaymentProvider } from './providers/manual-upi.provider';
import { BillingCycle } from '@prisma/client';

const manualProvider = new ManualUpiPaymentProvider();

export interface InitiateUpiPaymentInput {
  planId: string;
  billingCycle: BillingCycle;
  referenceNumber: string;
  notes?: string;
  proofUrl?: string;
}

export const paymentService = {
  /**
   * List all active plans for public pricing / upgrade modals.
   */
  async getAvailablePlans() {
    return prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPriceINR: 'asc' },
    });
  },

  /**
   * Submit a manual UPI payment request.
   */
  async submitManualUpiPayment(
    organizationId: string,
    userId: string,
    input: InitiateUpiPaymentInput
  ) {
    const plan = await prisma.plan.findUnique({
      where: { id: input.planId },
    });

    if (!plan || !plan.isActive) {
      throw AppError.notFound('Active Plan', input.planId);
    }

    let amount = Number(plan.monthlyPriceINR);
    if (input.billingCycle === BillingCycle.YEARLY) {
      amount = Number(plan.yearlyPriceINR);
    } else if (input.billingCycle === BillingCycle.QUARTERLY) {
      amount = Number(plan.monthlyPriceINR) * 3;
    }

    return manualProvider.createPaymentIntent({
      organizationId,
      planId: plan.id,
      amountINR: amount,
      billingCycle: input.billingCycle,
      submittedByUserId: userId,
      referenceNumber: input.referenceNumber,
      notes: input.notes,
      proofUrl: input.proofUrl,
    });
  },

  /**
   * Get payment request history for the tenant organization.
   */
  async getOrganizationPaymentHistory(organizationId: string) {
    return prisma.paymentRequest.findMany({
      where: { organizationId },
      include: {
        plan: { select: { id: true, name: true, code: true } },
        submitter: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
