import { api } from './api';
import type { ApiResponse } from '../types';

export interface BomComponentData {
  id?: string;
  productId: string;
  productName?: string;
  productSku?: string;
  unitPrice?: number;
  currentStock?: number;
  qtyRequired: number;
  hasEnoughStock?: boolean;
}

export interface BomAssembly {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  sellingPrice: number;
  totalComponentCost?: number;
  canAssembleQty: number;
  bottleneckProduct?: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    qtyRequired: number;
  };
  components: BomComponentData[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateBomInput {
  name: string;
  sku: string;
  category: string;
  description?: string;
  sellingPrice: number;
  components: {
    productId: string;
    qtyRequired: number;
  }[];
}

export interface BuildAssemblyResult {
  buildLog: any;
  assemblyName: string;
  sku: string;
  quantityBuilt: number;
  message: string;
}

export const bomService = {
  async getAssemblies(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
  }): Promise<ApiResponse<BomAssembly[]>> {
    const res = await api.get<ApiResponse<BomAssembly[]>>('/bom', { params });
    return res.data;
  },

  async getAssembly(id: string): Promise<ApiResponse<BomAssembly>> {
    const res = await api.get<ApiResponse<BomAssembly>>(`/bom/${id}`);
    return res.data;
  },

  async createAssembly(data: CreateBomInput): Promise<ApiResponse<BomAssembly>> {
    const res = await api.post<ApiResponse<BomAssembly>>('/bom', data);
    return res.data;
  },

  async updateAssembly(id: string, data: Partial<CreateBomInput>): Promise<ApiResponse<BomAssembly>> {
    const res = await api.put<ApiResponse<BomAssembly>>(`/bom/${id}`, data);
    return res.data;
  },

  async deleteAssembly(id: string): Promise<ApiResponse<{ message: string }>> {
    const res = await api.delete<ApiResponse<{ message: string }>>(`/bom/${id}`);
    return res.data;
  },

  async buildAssembly(
    id: string,
    data: { quantity: number; notes?: string }
  ): Promise<ApiResponse<BuildAssemblyResult>> {
    const res = await api.post<ApiResponse<BuildAssemblyResult>>(`/bom/${id}/build`, data);
    return res.data;
  },
};
