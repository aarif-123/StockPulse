import { api } from './api';
import type { ApiResponse } from '../types';

export interface DashboardStatsData {
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

export const dashboardService = {
  async getStats(): Promise<DashboardStatsData> {
    const response = await api.get<ApiResponse<DashboardStatsData>>('/dashboard/stats');
    return response.data.data;
  },
};
