import { api } from './api';
import type { Customer, ApiResponse } from '../types';

export interface CustomerFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  customerType?: string;
}

export const customerService = {
  async getCustomers(params?: CustomerFilterParams): Promise<ApiResponse<Customer[]>> {
    const response = await api.get<ApiResponse<Customer[]>>('/customers', { params });
    return response.data;
  },

  async getCustomer(id: string): Promise<ApiResponse<Customer>> {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data;
  },

  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Customer>> {
    const response = await api.post<ApiResponse<Customer>>('/customers', data);
    return response.data;
  },

  async updateCustomer(id: string, data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<Customer>> {
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
    return response.data;
  },

  async addFollowUp(id: string, data: { followUpDate: string; notes: string }): Promise<ApiResponse<Customer>> {
    const response = await api.post<ApiResponse<Customer>>(`/customers/${id}/follow-ups`, data);
    return response.data;
  },
};
