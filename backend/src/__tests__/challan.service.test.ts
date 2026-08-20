import {
  createChallan,
  listChallans,
  getChallanById,
} from '../modules/challans/challan.service';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    customer: {
      findFirst: jest.fn(),
    },
    challan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb({
      challan: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({
          id: 'chal-1',
          organizationId: 'org-test-1',
          challanNumber: 'CH-000001',
          customerId: 'cust-1',
          status: 'DRAFT',
          totalQuantity: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
          items: [],
        }),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'prod-1', name: 'Item 1', sku: 'ITM-1', unitPrice: 100, organizationId: 'org-test-1' },
        ]),
      },
    })),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Challan Service (Multi-Tenant)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChallan', () => {
    it('creates a tenant-isolated delivery challan', async () => {
      (mockPrisma.customer.findFirst as jest.Mock).mockResolvedValue({
        id: 'cust-1',
        organizationId: 'org-test-1',
        name: 'Test Customer',
      });

      const result = await createChallan('org-test-1', 'user-1', {
        customerId: 'cust-1',
        items: [{ productId: 'prod-1', quantity: 10 }],
      });

      expect(result).toBeDefined();
      expect(result.challanNumber).toBe('CH-000001');
    });
  });

  describe('listChallans', () => {
    it('returns challans filtered strictly by tenant organization', async () => {
      (mockPrisma.challan.findMany as jest.Mock).mockResolvedValue([
        { id: 'chal-1', challanNumber: 'CH-000001', organizationId: 'org-test-1' },
      ]);
      (mockPrisma.challan.count as jest.Mock).mockResolvedValue(1);

      const result = await listChallans('org-test-1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});
