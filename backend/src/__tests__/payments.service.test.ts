import { ManualUpiPaymentProvider } from '../modules/payments/providers/manual-upi.provider';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    plan: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'growth_v1',
        name: 'Growth Pro',
        monthlyPriceINR: 499,
      }),
    },
    paymentRequest: {
      create: jest.fn().mockResolvedValue({
        id: 'pay-req-123',
        organizationId: 'org-test-1',
        planId: 'growth_v1',
        amountINR: 499,
        referenceNumber: 'UTR-123456789012',
        status: 'PENDING',
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'pay-req-123',
        organizationId: 'org-test-1',
        planId: 'growth_v1',
        amountINR: 499,
        billingCycle: 'MONTHLY',
        referenceNumber: 'UTR-123456789012',
        status: 'PENDING',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'pay-req-123',
        status: 'APPROVED',
        organizationId: 'org-test-1',
        planId: 'growth_v1',
        billingCycle: 'MONTHLY',
        referenceNumber: 'UTR-123456789012',
      }),
    },
    organization: {
      update: jest.fn().mockResolvedValue({ id: 'org-test-1', status: 'ACTIVE' }),
    },
    $transaction: jest.fn((cb) => cb({
      paymentRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'pay-req-123',
          organizationId: 'org-test-1',
          planId: 'growth_v1',
          amountINR: 499,
          billingCycle: 'MONTHLY',
          referenceNumber: 'UTR-123456789012',
          status: 'PENDING',
        }),
        update: jest.fn().mockResolvedValue({
          id: 'pay-req-123',
          status: 'APPROVED',
          organizationId: 'org-test-1',
          planId: 'growth_v1',
          billingCycle: 'MONTHLY',
          referenceNumber: 'UTR-123456789012',
        }),
      },
    })),
  },
}));

jest.mock('../modules/audit/audit.service', () => ({
  auditService: {
    log: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('../modules/subscriptions/subscription.service', () => ({
  subscriptionService: {
    activateSubscription: jest.fn().mockResolvedValue(true),
    upgradePlan: jest.fn().mockResolvedValue(true),
  },
}));

describe('Manual UPI Payment Provider Tests', () => {
  const provider = new ManualUpiPaymentProvider();

  it('generates a valid UPI transaction intent with QR string', async () => {
    const result = await provider.createPaymentIntent({
      organizationId: 'org-test-1',
      planId: 'growth_v1',
      billingCycle: 'MONTHLY',
      amountINR: 499,
      referenceNumber: 'UTR-123456789012',
      submittedByUserId: 'user-1',
    });

    expect(result.paymentRequestId).toBe('pay-req-123');
    expect(result.upiQrData?.upiId).toBe('vyaaparsync.saas@hdfcbank');
    expect(result.upiQrData?.qrString).toContain('upi://pay');
    expect(result.amountINR).toBe(499);
  });

  it('verifies and approves manual UPI payment request', async () => {
    const verified = await provider.verifyPayment('pay-req-123', 'admin-user-1', true);

    expect(verified.verified).toBe(true);
    expect(verified.paymentRequestId).toBe('pay-req-123');
  });
});
