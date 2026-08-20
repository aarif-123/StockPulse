import { bomService } from '../modules/bom/bom.service';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mBomAssembly = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  const mBomComponent = {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  };

  const mProduct = {
    findMany: jest.fn(),
    update: jest.fn(),
  };

  const mStockMovement = {
    create: jest.fn(),
  };

  const mBomBuildLog = {
    create: jest.fn(),
  };

  const mAuditLog = {
    create: jest.fn(),
  };

  const mClient = {
    bomAssembly: mBomAssembly,
    bomComponent: mBomComponent,
    product: mProduct,
    stockMovement: mStockMovement,
    bomBuildLog: mBomBuildLog,
    auditLog: mAuditLog,
    $transaction: jest.fn(async (cb) => {
      return cb(mClient);
    }),
  };

  return {
    PrismaClient: jest.fn(() => mClient),
  };
});

describe('BOM & Production Assemblies Service Unit Tests', () => {
  const prismaMock = new PrismaClient() as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list assemblies and dynamically compute build capacity and bottleneck', async () => {
    prismaMock.bomAssembly.findMany.mockResolvedValue([
      {
        id: 'bom-1',
        name: 'Dual-Screen Workstation Kit',
        sku: 'KIT-EXEC',
        category: 'Workstation Bundles',
        sellingPrice: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
        components: [
          {
            id: 'comp-1',
            productId: 'p-1',
            qtyRequired: 1,
            product: {
              id: 'p-1',
              name: '4K Monitor',
              sku: 'DEL-4K',
              unitPrice: 30000,
              currentStock: 10,
            },
          },
          {
            id: 'comp-2',
            productId: 'p-2',
            qtyRequired: 2,
            product: {
              id: 'p-2',
              name: 'NVMe SSD',
              sku: 'SAM-SSD',
              unitPrice: 8000,
              currentStock: 4, // Bottleneck: 4 / 2 = 2 kits max
            },
          },
        ],
      },
    ]);
    prismaMock.bomAssembly.count.mockResolvedValue(1);

    const res = await bomService.listAssemblies('org-1', { page: 1, limit: 10 });
    expect(res.data).toHaveLength(1);
    expect(res.data[0].canAssembleQty).toBe(2); // 4 / 2 = 2
    expect(res.data[0].totalComponentCost).toBe(46000); // 30000*1 + 8000*2 = 46000
    expect(res.pagination.total).toBe(1);
  });

  it('should create a new BOM assembly when SKU is unique and products exist', async () => {
    prismaMock.bomAssembly.findFirst.mockResolvedValue(null);
    prismaMock.product.findMany.mockResolvedValue([
      { id: 'p-1', name: 'Product 1' },
      { id: 'p-2', name: 'Product 2' },
    ]);
    prismaMock.bomAssembly.create.mockResolvedValue({
      id: 'bom-new',
      name: 'Custom Bundle',
      sku: 'KIT-CUSTOM-1',
      sellingPrice: 15000,
    });

    const res = await bomService.createAssembly('org-1', {
      name: 'Custom Bundle',
      sku: 'KIT-CUSTOM-1',
      category: 'Custom Bundles',
      sellingPrice: 15000,
      components: [
        { productId: 'p-1', qtyRequired: 1 },
        { productId: 'p-2', qtyRequired: 2 },
      ],
    });

    expect(res.sku).toBe('KIT-CUSTOM-1');
    expect(prismaMock.bomAssembly.create).toHaveBeenCalledTimes(1);
  });

  it('should execute atomic assembly build and deduct component stock', async () => {
    prismaMock.bomAssembly.findFirst.mockResolvedValue({
      id: 'bom-1',
      name: 'Dual-Screen Workstation Kit',
      sku: 'KIT-EXEC',
      components: [
        {
          productId: 'p-1',
          qtyRequired: 1,
          product: { id: 'p-1', name: '4K Monitor', sku: 'DEL-4K', currentStock: 10 },
        },
      ],
    });
    prismaMock.product.update.mockResolvedValue({});
    prismaMock.stockMovement.create.mockResolvedValue({});
    prismaMock.bomBuildLog.create.mockResolvedValue({ id: 'log-1' });
    prismaMock.auditLog.create.mockResolvedValue({});

    const res = await bomService.buildAssembly('org-1', 'user-1', 'bom-1', { quantity: 2 });
    expect(res.quantityBuilt).toBe(2);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { currentStock: { decrement: 2 } },
    });
    expect(prismaMock.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'OUT',
        quantity: 2,
      }),
    });
  });
});
