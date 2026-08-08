import { api } from './api';
import type { Challan, ApiResponse } from '../types';

export interface CreateChallanInput {
  customerId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export const challanService = {
  async getChallans(params?: { page?: number; limit?: number }): Promise<ApiResponse<Challan[]>> {
    const response = await api.get<ApiResponse<Challan[]>>('/challans', { params });
    return response.data;
  },

  async getChallan(id: string): Promise<ApiResponse<Challan>> {
    const response = await api.get<ApiResponse<Challan>>(`/challans/${id}`);
    return response.data;
  },

  async createChallan(data: CreateChallanInput): Promise<ApiResponse<Challan>> {
    const response = await api.post<ApiResponse<Challan>>('/challans', data);
    return response.data;
  },

  async confirmChallan(id: string): Promise<ApiResponse<Challan>> {
    const response = await api.post<ApiResponse<Challan>>(`/challans/${id}/confirm`);
    return response.data;
  },

  async cancelChallan(id: string): Promise<ApiResponse<Challan>> {
    const response = await api.post<ApiResponse<Challan>>(`/challans/${id}/cancel`);
    return response.data;
  },
};
