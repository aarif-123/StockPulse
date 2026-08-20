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
  product: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export interface ReportQueryParams {
  productId?: string;
  type?: 'IN' | 'OUT';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface ValuationByCategoryItem {
  category: string;
  totalValue: number;
  totalCostValue: number;
  totalStock: number;
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
  totalQty: number;
}

export interface StockoutRiskRunwayItem {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  avgDailySales: number;
  daysRunway: number;
}

export interface ReportsAnalyticsData {
  totalValuation: number;
  totalCostValuation: number;
  activeSkusCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  valuationByCategory: ValuationByCategoryItem[];
  stockMovementTrend: StockMovementTrendItem[];
  topMovingProducts: TopMovingProductItem[];
  stockoutRiskRunway: StockoutRiskRunwayItem[];
}

export const reportService = {
  async getStockMovements(params: ReportQueryParams = {}): Promise<ApiResponse<StockMovementReportItem[]>> {
    const response = await api.get<ApiResponse<StockMovementReportItem[]>>('/reports/stock-movements', {
      params,
    });
    return response.data;
  },

  async getAnalytics(): Promise<ApiResponse<ReportsAnalyticsData>> {
    const response = await api.get<ApiResponse<ReportsAnalyticsData>>('/reports/analytics');
    return response.data;
  },
};
