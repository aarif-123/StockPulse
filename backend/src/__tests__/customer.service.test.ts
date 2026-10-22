/// <reference types="jest" />
import {
  createCustomer,
  listCustomers,
  getCustomerById,
} from '../modules/customers/customer.service';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb({
      customer: {
        create: jest.fn().mockResolvedValue({
          id: 'cust-1',
          organizationId: 'org-test-1',
          name: 'John Doe',
          mobile: '9876543210',
          email: 'john@example.com',
          businessName: 'Doe Enterprises',
          type: 'RETAIL',
          address: '456 Market St',
          status: 'LEAD',
          gstin: '29ABCDE1234F1Z5',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        count: jest.fn().mockResolvedValue(5),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue({
          plan: { maxCustomers: 500, allowedFeatures: ['customers'] },
        }),
      },
    })),
  },
}));

jest.mock('../modules/subscriptions/entitlement.service', () => ({
  entitlementService: {
    assertQuotaAvailable: jest.fn().mockResolvedValue(true),
    checkFeatureAccess: jest.fn().mockResolvedValue(true),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const sampleCustomer = {
  id: 'cust-1',
  organizationId: 'org-test-1',
  name: 'John Doe',
  mobile: '9876543210',
  email: 'john@example.com',
  businessName: 'Doe Enterprises',
  type: 'RETAIL' as const,
  address: '456 Market St',
  status: 'LEAD' as const,
  gstin: '29ABCDE1234F1Z5',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Customer Service (Multi-Tenant)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCustomer', () => {
    it('creates and returns mapped customer response shape for tenant', async () => {
      const result = await createCustomer('org-test-1', {
        name: 'John Doe',
        mobile: '9876543210',
        email: 'john@example.com',
        businessName: 'Doe Enterprises',
        customerType: 'RETAIL',
        address: '456 Market St',
        status: 'ACTIVE',
      });

      expect(result).toBeDefined();
      expect((result as unknown as { id: string }).id).toBe('cust-1');
    });
  });

  describe('getCustomerById', () => {
    it('returns customer scoped to tenant organization', async () => {
      (mockPrisma.customer.findFirst as jest.Mock).mockResolvedValue(sampleCustomer);

      const result = await getCustomerById('org-test-1', 'cust-1');
      expect(result).toBeDefined();
      expect((result as unknown as { id: string }).id).toBe('cust-1');
      expect(mockPrisma.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'cust-1', organizationId: 'org-test-1' }),
        })
      );
    });
  });

  describe('listCustomers', () => {
    it('paginates and filters by organizationId', async () => {
      (mockPrisma.customer.findMany as jest.Mock).mockResolvedValue([sampleCustomer]);
      (mockPrisma.customer.count as jest.Mock).mockResolvedValue(1);

      const result = await listCustomers('org-test-1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});
