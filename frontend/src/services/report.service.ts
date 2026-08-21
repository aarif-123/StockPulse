import { api } from './api';
import type { ApiResponse } from '../types';

export interface StockMovementReportItem {
  id: string;
  productId: string;
  quantity: number;
  type: 'IN' | 'OUT';
  reason: string;
  createdBy: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category: string;
    unitPrice?: number;
    currentStock?: number;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
  };
}

export interface ReportQueryParams {
  search?: string;
  productId?: string;
  type?: 'IN' | 'OUT';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ValuationByCategoryItem {
  category: string;
  skuCount: number;
  totalUnits: number;
  totalStock?: number;
  totalValue: number;
  totalCostValue: number;
  marginPercent: number;
}

export interface StockMovementTrendItem {
  date: string;
  stockIn: number;
  stockOut: number;
}

export interface TopMovingProductItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  currentStock: number;
  unitPrice: number;
  totalQty: number;
  estimatedRunwayDays: number;
}

export interface DeadStockProductItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  currentStock: number;
  lockedCost: number;
  daysWithoutMovement: number;
}

export interface AbcTierData {
  skuCount: number;
  capitalValue: number;
  percentage: number;
  description: string;
}

export interface ReportsAnalyticsData {
  timeRange: string;
  totalValuation: number;
  totalCostValuation: number;
  totalUnits: number;
  totalSkus: number;
  activeSkusCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  grossMarginPercent: number;
  totalDeadStockCapital: number;
  valuationByCategory: ValuationByCategoryItem[];
  stockMovementTrend: StockMovementTrendItem[];
  topMovingProducts: TopMovingProductItem[];
  deadStockProducts: DeadStockProductItem[];
  abcAnalysis: {
    classA: AbcTierData;
    classB: AbcTierData;
    classC: AbcTierData;
  };
  stockoutRiskRunway: TopMovingProductItem[];
}

export const reportService = {
  async getStockMovements(params: ReportQueryParams = {}): Promise<ApiResponse<StockMovementReportItem[]>> {
    const response = await api.get<ApiResponse<StockMovementReportItem[]>>('/reports/stock-movements', {
      params,
    });
    return response.data;
  },

  async getAnalytics(range: '7d' | '15d' | '30d' | '90d' | '365d' = '30d'): Promise<ApiResponse<ReportsAnalyticsData>> {
    const response = await api.get<ApiResponse<ReportsAnalyticsData>>('/reports/analytics', {
      params: { range },
    });
    return response.data;
  },
};
