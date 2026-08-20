import { PaymentMethod, PaymentRequestStatus, Prisma } from '@prisma/client';
import prisma from '../../../config/database';
import { AppError } from '../../../middleware/error-handler';
import { subscriptionService } from '../../subscriptions/subscription.service';
import { auditService } from '../../audit/audit.service';
import {
  IPaymentProvider,
  CreatePaymentIntentParams,
  PaymentIntentResult,
  PaymentVerificationResult,
} from './payment-provider.interface';

export class ManualUpiPaymentProvider implements IPaymentProvider {
  readonly providerName = PaymentMethod.UPI_MANUAL;
  private readonly defaultUpiId = 'stockpulse.saas@hdfcbank';
  private readonly payeeName = 'StockPulse Technologies';

  /**
   * Generates a UPI intent / QR string and persists a PENDING PaymentRequest.
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const plan = await prisma.plan.findUnique({ where: { id: params.planId } });
    if (!plan) {
      throw AppError.notFound('Plan', params.planId);
    }

    const refNumber = params.referenceNumber?.trim() || `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        organizationId: params.organizationId,
        planId: params.planId,
        amountINR: new Prisma.Decimal(params.amountINR),
        billingCycle: params.billingCycle,
        paymentMethod: PaymentMethod.UPI_MANUAL,
        referenceNumber: refNumber,
        proofUrl: params.proofUrl,
        status: PaymentRequestStatus.PENDING,
        notes: params.notes,
        submittedBy: params.submittedByUserId,
      },
    });

    const tn = encodeURIComponent(`Plan ${plan.name} Sub ${params.organizationId.slice(-6)}`);
    const qrString = `upi://pay?pa=${this.defaultUpiId}&pn=${encodeURIComponent(this.payeeName)}&am=${params.amountINR}&cu=INR&tn=${tn}`;

    await auditService.log({
      scope: 'ORGANIZATION',
      organizationId: params.organizationId,
      actorUserId: params.submittedByUserId,
      action: 'PAYMENT_REQUEST_SUBMITTED',
      resource: 'PaymentRequest',
      resourceId: paymentRequest.id,
      metadata: {
        amountINR: params.amountINR,
        referenceNumber: refNumber,
        planName: plan.name,
      },
    });

    return {
      paymentRequestId: paymentRequest.id,
      status: PaymentRequestStatus.PENDING,
      paymentMethod: PaymentMethod.UPI_MANUAL,
      amountINR: params.amountINR,
      currency: 'INR',
      upiQrData: {
        upiId: this.defaultUpiId,
        payeeName: this.payeeName,
        amountINR: params.amountINR,
        transactionNote: `StockPulse ${plan.name} Subscription`,
        qrString,
      },
      message: 'Manual UPI Payment Request created. Please scan the QR code and submit your UTR reference number for approval.',
    };
  }

  /**
   * Super Admin approves or rejects the manual payment request idempotently.
   */
  async verifyPayment(
    paymentRequestId: string,
    reviewerUserId: string,
    approved: boolean,
    rejectionReason?: string
  ): Promise<PaymentVerificationResult> {
    return prisma.$transaction(async (tx) => {
      const request = await tx.paymentRequest.findUnique({
        where: { id: paymentRequestId },
      });

      if (!request) {
        throw AppError.notFound('PaymentRequest', paymentRequestId);
      }

      // Idempotency: If already approved/rejected, return current status safely
      if (request.status !== PaymentRequestStatus.PENDING) {
        return {
          verified: request.status === PaymentRequestStatus.APPROVED,
          paymentRequestId: request.id,
          organizationId: request.organizationId,
          planId: request.planId,
          billingCycle: request.billingCycle,
          message: `Payment request has already been ${request.status.toLowerCase()}.`,
        };
      }

      if (!approved) {
        const rejected = await tx.paymentRequest.update({
          where: { id: paymentRequestId },
          data: {
            status: PaymentRequestStatus.REJECTED,
            reviewedBy: reviewerUserId,
            reviewedAt: new Date(),
            rejectionReason: rejectionReason || 'Payment verification could not be matched with bank ledger statement.',
          },
        });

        await auditService.log({
          scope: 'PLATFORM',
          organizationId: request.organizationId,
          actorUserId: reviewerUserId,
          action: 'PAYMENT_REQUEST_REJECTED',
          resource: 'PaymentRequest',
          resourceId: rejected.id,
          metadata: { reason: rejectionReason },
        });

        return {
          verified: false,
          paymentRequestId: rejected.id,
          organizationId: rejected.organizationId,
          planId: rejected.planId,
          billingCycle: rejected.billingCycle,
          message: 'Payment request rejected.',
        };
      }

      // Approve & update request
      const updated = await tx.paymentRequest.update({
        where: { id: paymentRequestId },
        data: {
          status: PaymentRequestStatus.APPROVED,
          reviewedBy: reviewerUserId,
          reviewedAt: new Date(),
        },
      });

      // Activate organization subscription
      await subscriptionService.activateSubscription(
        updated.organizationId,
        updated.planId,
        updated.billingCycle,
        reviewerUserId
      );

      await auditService.log({
        scope: 'PLATFORM',
        organizationId: request.organizationId,
        actorUserId: reviewerUserId,
        action: 'PAYMENT_REQUEST_APPROVED',
        resource: 'PaymentRequest',
        resourceId: updated.id,
        metadata: {
          amountINR: Number(updated.amountINR),
          referenceNumber: updated.referenceNumber,
        },
      });

      return {
        verified: true,
        paymentRequestId: updated.id,
        organizationId: updated.organizationId,
        planId: updated.planId,
        billingCycle: updated.billingCycle,
        message: 'Payment request approved and subscription activated successfully.',
      };
    });
  }
}
