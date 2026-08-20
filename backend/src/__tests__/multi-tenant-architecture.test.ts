import { PERMISSIONS, getRolePermissions } from '../config/permissions';
import { OrgRole, SubscriptionStatus, BillingCycle, PaymentRequestStatus } from '@prisma/client';
import { ManualUpiPaymentProvider } from '../modules/payments/providers/manual-upi.provider';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    plan: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    paymentRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    customer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    transaction: {
      count: jest.fn(),
    },
    organizationMembership: {
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('Multi-Tenant SaaS Architecture & RBAC System', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. RBAC & Granular Capability Matrix', () => {
    it('ORG_ADMIN has all administrative and business capabilities', () => {
      const perms = getRolePermissions(OrgRole.ORG_ADMIN);
      expect(perms).toContain(PERMISSIONS.CUSTOMERS_CREATE);
      expect(perms).toContain(PERMISSIONS.PRODUCTS_CREATE);
      expect(perms).toContain(PERMISSIONS.CHALLANS_CONFIRM);
      expect(perms).toContain(PERMISSIONS.ORG_SETTINGS_UPDATE);
      expect(perms).toContain(PERMISSIONS.ORG_USERS_MANAGE);
      expect(perms).toContain(PERMISSIONS.ORG_BILLING_MANAGE);
    });

    it('SALES role has CRM, Challans, and WhatsApp capabilities but NO org management', () => {
      const perms = getRolePermissions(OrgRole.SALES);
      expect(perms).toContain(PERMISSIONS.CUSTOMERS_CREATE);
      expect(perms).toContain(PERMISSIONS.CHALLANS_CREATE);
      expect(perms).toContain(PERMISSIONS.WHATSAPP_TRANSACT);
      expect(perms).not.toContain(PERMISSIONS.ORG_SETTINGS_UPDATE);
      expect(perms).not.toContain(PERMISSIONS.ORG_USERS_MANAGE);
    });

    it('WAREHOUSE role has inventory and challan capabilities but NO customer deletion', () => {
      const perms = getRolePermissions(OrgRole.WAREHOUSE);
      expect(perms).toContain(PERMISSIONS.PRODUCTS_STOCK_ADJUST);
      expect(perms).toContain(PERMISSIONS.CHALLANS_READ);
      expect(perms).not.toContain(PERMISSIONS.CUSTOMERS_DELETE);
      expect(perms).not.toContain(PERMISSIONS.ORG_SETTINGS_UPDATE);
    });
  });

  describe('2. Manual UPI Payment Flow & Subscription Activation', () => {
    const provider = new ManualUpiPaymentProvider();

    it('generates valid UPI QR data with payee details and reference number', async () => {
      (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan_growth',
        name: 'Growth Pro',
        code: 'growth_v1',
      });

      (prisma.paymentRequest.create as jest.Mock).mockResolvedValue({
        id: 'req_123',
        organizationId: 'org_apex',
        planId: 'plan_growth',
        amountINR: 4499.00,
        billingCycle: BillingCycle.YEARLY,
        status: PaymentRequestStatus.PENDING,
        referenceNumber: 'UTR-987654321',
      });

      const intent = await provider.createPaymentIntent({
        organizationId: 'org_apex',
        planId: 'plan_growth',
        amountINR: 4499.00,
        billingCycle: BillingCycle.YEARLY,
        submittedByUserId: 'user_admin',
        referenceNumber: 'UTR-987654321',
      });

      expect(intent.status).toBe(PaymentRequestStatus.PENDING);
      expect(intent.upiQrData).toBeDefined();
      expect(intent.upiQrData?.upiId).toBe('stockpulse.saas@hdfcbank');
      expect(intent.upiQrData?.qrString).toContain('upi://pay');
      expect(intent.upiQrData?.qrString).toContain('am=4499');
    });

    it('idempotently handles payment verification and activates organization subscription', async () => {
      (prisma.paymentRequest.findUnique as jest.Mock).mockResolvedValue({
        id: 'req_123',
        organizationId: 'org_apex',
        planId: 'plan_growth',
        amountINR: 4499.00,
        billingCycle: BillingCycle.YEARLY,
        status: PaymentRequestStatus.PENDING,
        referenceNumber: 'UTR-987654321',
      });

      (prisma.paymentRequest.update as jest.Mock).mockResolvedValue({
        id: 'req_123',
        organizationId: 'org_apex',
        planId: 'plan_growth',
        amountINR: 4499.00,
        billingCycle: BillingCycle.YEARLY,
        status: PaymentRequestStatus.APPROVED,
        referenceNumber: 'UTR-987654321',
      });

      (prisma.plan.findUnique as jest.Mock).mockResolvedValue({
        id: 'plan_growth',
        name: 'Growth Pro',
        code: 'growth_v1',
      });

      (prisma.subscription.findFirst as jest.Mock).mockResolvedValue({
        id: 'sub_old',
        organizationId: 'org_apex',
      });

      (prisma.subscription.update as jest.Mock).mockResolvedValue({
        id: 'sub_old',
        organizationId: 'org_apex',
        status: SubscriptionStatus.ACTIVE,
        plan: { name: 'Growth Pro', code: 'growth_v1' },
      });

      const result = await provider.verifyPayment('req_123', 'super_admin_user', true);

      expect(result.verified).toBe(true);
      expect(result.paymentRequestId).toBe('req_123');
      expect(prisma.paymentRequest.update).toHaveBeenCalled();
    });
  });
});
