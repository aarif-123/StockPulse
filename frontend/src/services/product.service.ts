import { api } from './api';
import type { Product, StockMovement, ApiResponse } from '../types';

export interface ProductFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export interface CreateStockMovementResponse {
  message: string;
  data: {
    product: Product;
    movement: StockMovement;
  };
}

export const productService = {
  async getProducts(params?: ProductFilterParams): Promise<ApiResponse<Product[]>> {
    const response = await api.get<ApiResponse<Product[]>>('/products', { params });
    return response.data;
  },

  async getProduct(id: string): Promise<ApiResponse<Product>> {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data;
  },

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Product>> {
    const response = await api.post<ApiResponse<Product>>('/products', data);
    return response.data;
  },

  async updateProduct(id: string, data: Partial<Omit<Product, 'id' | 'currentStock' | 'createdAt' | 'updatedAt'>>): Promise<ApiResponse<Product>> {
    // Note: API strips 'currentStock' to prevent direct edits as stock moves only via movements/challans.
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data;
  },

  async createStockMovement(id: string, data: { type: 'IN' | 'OUT'; quantity: number; reason: string }): Promise<CreateStockMovementResponse> {
    const response = await api.post<CreateStockMovementResponse>(`/products/${id}/stock-movements`, data);
    return response.data;
  },

  async getStockMovements(id: string, params?: { page?: number; limit?: number }): Promise<ApiResponse<StockMovement[]>> {
    const response = await api.get<ApiResponse<StockMovement[]>>(`/products/${id}/stock-movements`, { params });
    return response.data;
  },
};
