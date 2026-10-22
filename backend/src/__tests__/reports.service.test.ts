/// <reference types="jest" />
import { getStockMovementsReport } from '../modules/reports/reports.service';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    stockMovement: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Reports Service (Multi-Tenant)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retrieves filterable stock movements report scoped to tenant organization', async () => {
    const sampleMovement = {
      id: 'mov-1',
      organizationId: 'org-test-1',
      productId: 'prod-1',
      quantity: 50,
      type: 'IN',
      reason: 'Bulk intake',
      createdAt: new Date('2026-08-01T10:00:00Z'),
      product: {
        id: 'prod-1',
        name: 'Item A',
        sku: 'SKU-A',
        category: 'Electronics',
      },
      user: {
        id: 'user-1',
        name: 'Warehouse Admin',
        email: 'warehouse@example.com',
      },
    };

    (mockPrisma.stockMovement.findMany as jest.Mock).mockResolvedValue([sampleMovement]);
    (mockPrisma.stockMovement.count as jest.Mock).mockResolvedValue(1);

    const result = await getStockMovementsReport('org-test-1', {
      productId: 'prod-1',
      type: 'IN',
      dateFrom: '2026-08-01T00:00:00.000Z',
      dateTo: '2026-08-02T00:00:00.000Z',
      page: 1,
      limit: 25,
    });

    expect(mockPrisma.stockMovement.findMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.stockMovement.count).toHaveBeenCalledTimes(1);
    expect(result.data).toHaveLength(1);
  });
});
