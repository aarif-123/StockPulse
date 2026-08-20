import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import type { StockMovementsReportInput } from './reports.schema';

export async function getStockMovementsReport(organizationId: string, query: StockMovementsReportInput) {
  const { productId, type, dateFrom, dateTo, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.StockMovementWhereInput = {
    organizationId,
    ...(productId && { productId }),
    ...(type      && { type }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo   && { lte: new Date(dateTo) }),
      },
    }),
  };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: {
            id:       true,
            name:     true,
            sku:      true,
            category: true,
          },
        },
        user: {
          select: {
            id:    true,
            name:  true,
            email: true,
          },
        },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data: movements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getReportsAnalytics(organizationId: string) {
  const products = await prisma.product.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      sku: true,
      category: true,
      unitPrice: true,
      costPrice: true,
      currentStock: true,
      reorderPoint: true,
    },
  });

  let totalValuation = 0;
  let totalCostValuation = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const categoryMap: Record<string, { totalValue: number; totalCostValue: number; totalStock: number }> = {};

  for (const p of products) {
    const stock = p.currentStock || 0;
    const price = Number(p.unitPrice || 0);
    const cost = Number(p.costPrice || 0) || Math.round(price * 0.75);
    const value = stock * price;
    const costValue = stock * cost;

    totalValuation += value;
    totalCostValuation += costValue;

    if (stock === 0) {
      outOfStockCount++;
    }
    if (stock <= (p.reorderPoint || 50)) {
      lowStockCount++;
    }

    const cat = p.category || 'Uncategorized';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { totalValue: 0, totalCostValue: 0, totalStock: 0 };
    }
    categoryMap[cat].totalValue += value;
    categoryMap[cat].totalCostValue += costValue;
    categoryMap[cat].totalStock += stock;
  }

  const valuationByCategory = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    totalValue: Math.round(data.totalValue),
    totalCostValue: Math.round(data.totalCostValue),
    totalStock: data.totalStock,
  }));

  const fifteenDaysAgo = new Date();
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
  fifteenDaysAgo.setHours(0, 0, 0, 0);

  const movements = await prisma.stockMovement.findMany({
    where: {
      organizationId,
      createdAt: { gte: fifteenDaysAgo },
    },
    select: {
      type: true,
      quantity: true,
      createdAt: true,
    },
  });

  const trendMap: Record<string, { date: string; stockIn: number; stockOut: number }> = {};
  for (let i = 14; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    trendMap[dateStr] = { date: dateStr, stockIn: 0, stockOut: 0 };
  }

  for (const m of movements) {
    const dateStr = new Date(m.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    if (trendMap[dateStr]) {
      if (m.type === 'IN') {
        trendMap[dateStr].stockIn += m.quantity;
      } else {
        trendMap[dateStr].stockOut += m.quantity;
      }
    }
  }

  const stockMovementTrend = Object.values(trendMap);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const outboundMovements = await prisma.stockMovement.groupBy({
    by: ['productId'],
    where: {
      organizationId,
      type: 'OUT',
      createdAt: { gte: thirtyDaysAgo },
    },
    _sum: {
      quantity: true,
    },
    orderBy: {
      _sum: {
        quantity: 'desc',
      },
    },
    take: 5,
  });

  const topMovingProducts = await Promise.all(
    outboundMovements.map(async (item) => {
      const prod = await prisma.product.findFirst({
        where: { id: item.productId, organizationId },
        select: { name: true, sku: true },
      });
      return {
        productId: item.productId,
        productName: prod?.name || 'Unknown Product',
        sku: prod?.sku || '—',
        totalQty: item._sum.quantity || 0,
      };
    })
  );

  const activeSkusCount = products.filter((p) => p.currentStock > 0).length;

  return {
    totalValuation,
    totalCostValuation,
    activeSkusCount,
    lowStockCount,
    outOfStockCount,
    valuationByCategory,
    stockMovementTrend,
    topMovingProducts,
    stockoutRiskRunway: [],
  };
}
