import { Prisma } from '@prisma/client';
import prisma from '../../config/database';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export interface DashboardStats {
  customers: {
    total: number;
    active: number;
    leads: number;
    newThisMonth: number;
  };
  products: {
    total: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalStockValue: number;
  };
  challans: {
    totalDraft: number;
    confirmedToday: number;
    cancelledThisMonth: number;
    totalConfirmed: number;
  };
  stockMovements: {
    inLast7Days: number;
    outLast7Days: number;
  };
}

export async function getDashboardStats(organizationId: string): Promise<DashboardStats> {
  const now          = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startOfToday = daysAgo(0);
  const sevenDaysAgo = daysAgo(7);

  const [
    totalCustomers,
    activeCustomers,
    leadCustomers,
    newCustomersThisMonth,
    totalProducts,
    lowStockProducts,
    outOfStockProducts,
    stockValueResult,
    draftChallans,
    confirmedToday,
    cancelledThisMonth,
    totalConfirmed,
    stockIn7Days,
    stockOut7Days,
  ] = await Promise.all([
    prisma.customer.count({ where: { organizationId } }),
    prisma.customer.count({ where: { organizationId, status: 'ACTIVE' } }),
    prisma.customer.count({ where: { organizationId, status: 'LEAD' } }),
    prisma.customer.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),

    prisma.product.count({ where: { organizationId } }),
    prisma.product.count({
      where: {
        organizationId,
        currentStock: { lte: prisma.product.fields.minimumStock, gt: 0 },
      },
    }),
    prisma.product.count({ where: { organizationId, currentStock: 0 } }),
    prisma.$queryRaw<{ total: string }[]>(
      Prisma.sql`SELECT COALESCE(SUM("currentStock"::numeric * "unitPrice"), 0)::text AS total FROM products WHERE "organizationId" = ${organizationId}`
    ),

    prisma.challan.count({ where: { organizationId, status: 'DRAFT' } }),
    prisma.challan.count({
      where: { organizationId, status: 'CONFIRMED', updatedAt: { gte: startOfToday } },
    }),
    prisma.challan.count({
      where: { organizationId, status: 'CANCELLED', updatedAt: { gte: startOfMonth } },
    }),
    prisma.challan.count({ where: { organizationId, status: 'CONFIRMED' } }),

    prisma.stockMovement.count({
      where: { organizationId, type: 'IN', createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.stockMovement.count({
      where: { organizationId, type: 'OUT', createdAt: { gte: sevenDaysAgo } },
    }),
  ]);

  const totalStockValue = parseFloat(stockValueResult[0]?.total ?? '0');

  return {
    customers: {
      total:        totalCustomers,
      active:       activeCustomers,
      leads:        leadCustomers,
      newThisMonth: newCustomersThisMonth,
    },
    products: {
      total:           totalProducts,
      lowStockCount:   lowStockProducts,
      outOfStockCount: outOfStockProducts,
      totalStockValue,
    },
    challans: {
      totalDraft:         draftChallans,
      confirmedToday:     confirmedToday,
      cancelledThisMonth: cancelledThisMonth,
      totalConfirmed:     totalConfirmed,
    },
    stockMovements: {
      inLast7Days:  stockIn7Days,
      outLast7Days: stockOut7Days,
    },
  };
}
