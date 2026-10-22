/// <reference types="jest" />
import {
  createProduct,
  listProducts,
  getProductById,
} from '../modules/products/product.service';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb({
      product: {
        create: jest.fn().mockResolvedValue({
          id: 'prod-1',
          organizationId: 'org-test-1',
          name: 'Thermal Receipt Paper',
          sku: 'PAP-TH-80',
          category: 'Consumables',
          unitPrice: 120,
          currentStock: 50,
          minimumStock: 10,
          warehouseLocation: 'Bay-4',
          createdAt: new Date(),
          updatedAt: new Date(),
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

const sampleProduct = {
  id: 'prod-1',
  organizationId: 'org-test-1',
  name: 'Thermal Receipt Paper',
  sku: 'PAP-TH-80',
  category: 'Consumables',
  unitPrice: 120,
  currentStock: 50,
  minimumStock: 10,
  warehouseLocation: 'Bay-4',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Product Service (Multi-Tenant)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    it('creates a product with tenant organization isolation', async () => {
      const result = await createProduct('org-test-1', {
        name: 'Thermal Receipt Paper',
        sku: 'PAP-TH-80',
        category: 'Consumables',
        unitPrice: 120,
        currentStock: 50,
        minimumStock: 10,
        warehouseLocation: 'Bay-4',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('prod-1');
    });
  });

  describe('getProductById', () => {
    it('fetches a product scoped to organizationId', async () => {
      (mockPrisma.product.findFirst as jest.Mock).mockResolvedValue(sampleProduct);

      const result = await getProductById('org-test-1', 'prod-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('prod-1');
      expect(mockPrisma.product.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'prod-1', organizationId: 'org-test-1' }),
        })
      );
    });
  });

  describe('listProducts', () => {
    it('returns paginated products for the organization', async () => {
      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([sampleProduct]);
      (mockPrisma.product.count as jest.Mock).mockResolvedValue(1);

      const result = await listProducts('org-test-1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});
