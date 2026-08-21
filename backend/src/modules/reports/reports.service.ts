import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import type { StockMovementsReportInput } from './reports.schema';

export async function getStockMovementsReport(organizationId: string, query: StockMovementsReportInput) {
  const { search, productId, type, dateFrom, dateTo, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.StockMovementWhereInput = {
    organizationId,
    ...(productId && { productId }),
    ...(type && { type }),
    ...((dateFrom || dateTo) && {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }),
    ...(search && search.trim() && {
      product: {
        OR: [
          { name: { contains: search.trim(), mode: 'insensitive' } },
          { sku: { contains: search.trim(), mode: 'insensitive' } },
        ],
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
            id: true,
            name: true,
            sku: true,
            category: true,
            unitPrice: true,
            currentStock: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
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

export async function getReportsAnalytics(organizationId: string, range = '30d') {
  let days = 30;
  if (range === '7d') days = 7;
  else if (range === '15d') days = 15;
  else if (range === '90d') days = 90;
  else if (range === '365d') days = 365;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // 1. High-Performance Parallelized Database Aggregations
  const [kpiRows, categoryRows, trendRows, topMovingRows, deadStockRows, abcProducts] = await Promise.all([
    // Core KPIs aggregated directly on DB
    prisma.$queryRaw<Array<{
      totalValuation: number;
      totalCostValuation: number;
      totalUnits: number;
      totalSkus: number;
      activeSkus: number;
      zeroStockSkus: number;
      lowStockSkus: number;
    }>>`
      SELECT 
        COALESCE(SUM("currentStock" * "unitPrice"), 0)::float as "totalValuation",
        COALESCE(SUM("currentStock" * CASE WHEN "costPrice" > 0 THEN "costPrice" ELSE "unitPrice" * 0.75 END), 0)::float as "totalCostValuation",
        COALESCE(SUM("currentStock"), 0)::int as "totalUnits",
        COUNT(id)::int as "totalSkus",
        COUNT(CASE WHEN "currentStock" > 0 THEN 1 END)::int as "activeSkus",
        COUNT(CASE WHEN "currentStock" = 0 THEN 1 END)::int as "zeroStockSkus",
        COUNT(CASE WHEN "currentStock" > 0 AND "currentStock" <= COALESCE("reorderPoint", "minimumStock", 10) THEN 1 END)::int as "lowStockSkus"
      FROM products
      WHERE "organizationId" = ${organizationId}
    `,

    // Valuation & Margin by Category
    prisma.$queryRaw<Array<{
      category: string;
      skuCount: number;
      totalUnits: number;
      retailValuation: number;
      costValuation: number;
    }>>`
      SELECT 
        COALESCE(category, 'General') as category,
        COUNT(id)::int as "skuCount",
        COALESCE(SUM("currentStock"), 0)::int as "totalUnits",
        COALESCE(SUM("currentStock" * "unitPrice"), 0)::float as "retailValuation",
        COALESCE(SUM("currentStock" * CASE WHEN "costPrice" > 0 THEN "costPrice" ELSE "unitPrice" * 0.75 END), 0)::float as "costValuation"
      FROM products
      WHERE "organizationId" = ${organizationId}
      GROUP BY category
      ORDER BY "costValuation" DESC
    `,

    // Stock Movement Volume Trend in selected time window
    prisma.$queryRaw<Array<{
      dayStr: string;
      type: string;
      totalQty: number;
    }>>`
      SELECT 
        TO_CHAR(date_trunc('day', "createdAt"), 'YYYY-MM-DD') as "dayStr",
        type::text as type,
        SUM(quantity)::int as "totalQty"
      FROM stock_movements
      WHERE "organizationId" = ${organizationId}
        AND "createdAt" >= ${startDate}
      GROUP BY date_trunc('day', "createdAt"), type
      ORDER BY date_trunc('day', "createdAt") ASC
    `,

    // Top Fast-Moving Leader Products
    prisma.$queryRaw<Array<{
      productId: string;
      name: string;
      sku: string;
      category: string;
      currentStock: number;
      unitPrice: number;
      totalOutQty: number;
    }>>`
      SELECT 
        p.id as "productId",
        p.name,
        p.sku,
        p.category,
        p."currentStock"::int,
        p."unitPrice"::float,
        SUM(sm.quantity)::int as "totalOutQty"
      FROM stock_movements sm
      JOIN products p ON sm."productId" = p.id
      WHERE sm."organizationId" = ${organizationId}
        AND sm.type = 'OUT'
        AND sm."createdAt" >= ${startDate}
      GROUP BY p.id, p.name, p.sku, p.category, p."currentStock", p."unitPrice"
      ORDER BY "totalOutQty" DESC
      LIMIT 8
    `,

    // Dead Stock / Slow-Moving Capital Lock (Stock > 0 with NO movement in 45+ days)
    prisma.$queryRaw<Array<{
      productId: string;
      name: string;
      sku: string;
      category: string;
      currentStock: number;
      lockedCost: number;
      daysWithoutMovement: number;
    }>>`
      SELECT 
        p.id as "productId",
        p.name,
        p.sku,
        p.category,
        p."currentStock"::int,
        (p."currentStock" * CASE WHEN p."costPrice" > 0 THEN p."costPrice" ELSE p."unitPrice" * 0.75 END)::float as "lockedCost",
        COALESCE(EXTRACT(DAY FROM (NOW() - MAX(sm."createdAt")))::int, 90) as "daysWithoutMovement"
      FROM products p
      LEFT JOIN stock_movements sm ON sm."productId" = p.id AND sm.type = 'OUT' AND sm."organizationId" = ${organizationId}
      WHERE p."organizationId" = ${organizationId}
        AND p."currentStock" > 0
      GROUP BY p.id, p.name, p.sku, p.category, p."currentStock", p."costPrice", p."unitPrice"
      HAVING MAX(sm."createdAt") IS NULL OR MAX(sm."createdAt") < NOW() - INTERVAL '45 days'
      ORDER BY "lockedCost" DESC
      LIMIT 8
    `,

    // Top products by valuation for ABC analysis calculation
    prisma.$queryRaw<Array<{
      id: string;
      name: string;
      sku: string;
      costValuation: number;
    }>>`
      SELECT 
        id,
        name,
        sku,
        ("currentStock" * CASE WHEN "costPrice" > 0 THEN "costPrice" ELSE "unitPrice" * 0.75 END)::float as "costValuation"
      FROM products
      WHERE "organizationId" = ${organizationId}
        AND "currentStock" > 0
      ORDER BY "costValuation" DESC
      LIMIT 500
    `,
  ]);

  const kpis = kpiRows[0] || {
    totalValuation: 0,
    totalCostValuation: 0,
    totalUnits: 0,
    totalSkus: 0,
    activeSkus: 0,
    zeroStockSkus: 0,
    lowStockSkus: 0,
  };

  const totalValuation = Math.round(Number(kpis.totalValuation) || 0);
  const totalCostValuation = Math.round(Number(kpis.totalCostValuation) || 0);
  const totalUnits = Number(kpis.totalUnits) || 0;
  const totalSkus = Number(kpis.totalSkus) || 0;
  const activeSkusCount = Number(kpis.activeSkus) || 0;
  const outOfStockCount = Number(kpis.zeroStockSkus) || 0;
  const lowStockCount = Number(kpis.lowStockSkus) || 0;

  const grossMarginPercent =
    totalValuation > 0
      ? Math.max(0, Math.round(((totalValuation - totalCostValuation) / totalValuation) * 1000) / 10)
      : 25.0;

  // Build daily trend map
  const trendMap: Record<string, { date: string; stockIn: number; stockOut: number }> = {};
  const numDays = days <= 30 ? days : 30; // Granular day aggregation for charts
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const dateLabel = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    trendMap[dateKey] = { date: dateLabel, stockIn: 0, stockOut: 0 };
  }

  for (const row of trendRows) {
    if (trendMap[row.dayStr]) {
      if (row.type === 'IN') {
        trendMap[row.dayStr].stockIn += Number(row.totalQty) || 0;
      } else {
        trendMap[row.dayStr].stockOut += Number(row.totalQty) || 0;
      }
    }
  }

  const stockMovementTrend = Object.values(trendMap);

  // Category analysis
  const valuationByCategory = categoryRows.map((cat) => {
    const retail = Math.round(Number(cat.retailValuation) || 0);
    const cost = Math.round(Number(cat.costValuation) || 0);
    const margin = retail > 0 ? Math.round(((retail - cost) / retail) * 100) : 0;
    return {
      category: cat.category,
      skuCount: Number(cat.skuCount) || 0,
      totalUnits: Number(cat.totalUnits) || 0,
      totalValue: retail,
      totalCostValue: cost,
      marginPercent: margin,
    };
  });

  // ABC Analysis Calculation (80% / 15% / 5% Pareto rule)
  let accumulatedCapital = 0;
  let classACount = 0;
  let classACapital = 0;
  let classBCount = 0;
  let classBCapital = 0;
  let classCCount = 0;
  let classCCapital = 0;

  const totalActiveCapital = totalCostValuation || 1;
  for (const prod of abcProducts) {
    const val = Number(prod.costValuation) || 0;
    accumulatedCapital += val;
    const share = (accumulatedCapital / totalActiveCapital) * 100;

    if (share <= 80) {
      classACount++;
      classACapital += val;
    } else if (share <= 95) {
      classBCount++;
      classBCapital += val;
    } else {
      classCCount++;
      classCCapital += val;
    }
  }

  const abcAnalysis = {
    classA: {
      skuCount: classACount,
      capitalValue: Math.round(classACapital),
      percentage: totalCostValuation > 0 ? Math.round((classACapital / totalCostValuation) * 100) : 80,
      description: 'Top 80% capital value (High critical priority)',
    },
    classB: {
      skuCount: classBCount,
      capitalValue: Math.round(classBCapital),
      percentage: totalCostValuation > 0 ? Math.round((classBCapital / totalCostValuation) * 100) : 15,
      description: 'Next 15% capital value (Moderate turnover)',
    },
    classC: {
      skuCount: Math.max(classCCount, activeSkusCount - classACount - classBCount),
      capitalValue: Math.round(classCCapital),
      percentage: totalCostValuation > 0 ? Math.round((classCCapital / totalCostValuation) * 100) : 5,
      description: 'Lowest 5% capital value (Bulk low-cost items)',
    },
  };

  // Fast moving products
  const topMovingProducts = topMovingRows.map((r) => {
    const dailyVelocity = (Number(r.totalOutQty) || 0) / (days || 30);
    const runwayDays = dailyVelocity > 0 ? Math.round((Number(r.currentStock) || 0) / dailyVelocity) : 999;
    return {
      productId: r.productId,
      productName: r.name,
      sku: r.sku,
      category: r.category,
      currentStock: Number(r.currentStock) || 0,
      unitPrice: Number(r.unitPrice) || 0,
      totalQty: Number(r.totalOutQty) || 0,
      estimatedRunwayDays: runwayDays,
    };
  });

  // Dead stock / Slow moving products
  const deadStockProducts = deadStockRows.map((r) => ({
    productId: r.productId,
    productName: r.name,
    sku: r.sku,
    category: r.category,
    currentStock: Number(r.currentStock) || 0,
    lockedCost: Math.round(Number(r.lockedCost) || 0),
    daysWithoutMovement: Number(r.daysWithoutMovement) || 60,
  }));

  const totalDeadStockCapital = deadStockProducts.reduce((sum, p) => sum + p.lockedCost, 0);

  return {
    timeRange: range,
    totalValuation,
    totalCostValuation,
    totalUnits,
    totalSkus,
    activeSkusCount,
    lowStockCount,
    outOfStockCount,
    grossMarginPercent,
    totalDeadStockCapital,
    valuationByCategory,
    stockMovementTrend,
    topMovingProducts,
    deadStockProducts,
    abcAnalysis,
    stockoutRiskRunway: topMovingProducts.filter((p) => p.estimatedRunwayDays <= 15),
  };
}
