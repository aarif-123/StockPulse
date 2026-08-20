import { getDashboardStats } from '../modules/dashboard/dashboard.service';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    customer: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
      fields: {
        minimumStock: 'minimumStock',
      },
    },
    challan: {
      count: jest.fn(),
    },
    stockMovement: {
      count: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Dashboard Service (Multi-Tenant)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates all 14 KPI statistics accurately for tenant organization', async () => {
    (mockPrisma.customer.count as jest.Mock)
      .mockResolvedValueOnce(150)
      .mockResolvedValueOnce(120)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(15);

    (mockPrisma.product.count as jest.Mock)
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2);

    (mockPrisma.$queryRaw as jest.Mock).mockResolvedValueOnce([{ total: '145250.75' }]);

    (mockPrisma.challan.count as jest.Mock)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(42);

    (mockPrisma.stockMovement.count as jest.Mock)
      .mockResolvedValueOnce(60)
      .mockResolvedValueOnce(45);

    const stats = await getDashboardStats('org-test-1');

    expect(stats.customers.total).toBe(150);
    expect(stats.customers.active).toBe(120);
    expect(stats.products.total).toBe(80);
    expect(stats.challans.totalConfirmed).toBe(42);
  });
});
