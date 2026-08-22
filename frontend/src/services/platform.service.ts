import { api } from './api';
import type { AuditLogItem, PaymentRequest, OrgStatus, ApiResponse } from '../types';

export interface PlatformOverview {
  metrics: {
    totalOrganizations: number;
    activeOrganizations: number;
    totalUsers: number;
    activeSubscriptions: number;
    pendingPaymentRequests: number;
    totalAuditLogs: number;
  };
  systemHealth: {
    dbStatus: string;
    dbLatencyMs: number;
    uptime: number;
    environment: string;
  };
}

export interface PlatformOrgListItem {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  currency: string;
  businessGstin?: string;
  businessEmail?: string;
  createdAt: string;
  activeSubscription?: {
    id: string;
    status: string;
    planName: string;
    planCode: string;
    currentPeriodEnd: string;
  } | null;
  counts: {
    memberships: number;
    customers: number;
    products: number;
    challans: number;
  };
}

export interface SupportSessionStartResult {
  session: {
    id: string;
    superAdminId: string;
    targetOrganizationId: string;
    targetUserId: string;
    reason: string;
    status: string;
    startedAt: string;
    expiresAt: string;
  };
  impersonationToken: string;
  targetUser: {
    id: string;
    name: string;
    email: string;
  };
  targetOrganization: {
    id: string;
    name: string;
    slug: string;
  };
}

export const platformService = {
  async getOverview(): Promise<ApiResponse<PlatformOverview>> {
    const response = await api.get<ApiResponse<PlatformOverview>>('/platform/overview');
    return response.data;
  },

  async getOrganizations(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<ApiResponse<PlatformOrgListItem[]>> {
    const response = await api.get<ApiResponse<PlatformOrgListItem[]>>('/platform/organizations', { params });
    return response.data;
  },

  async updateOrganizationStatus(
    id: string,
    status: 'ACTIVE' | 'SUSPENDED'
  ): Promise<ApiResponse<any>> {
    const response = await api.patch<ApiResponse<any>>(`/platform/organizations/${id}/status`, { status });
    return response.data;
  },

  async getPaymentRequests(): Promise<ApiResponse<PaymentRequest[]>> {
    const response = await api.get<ApiResponse<PaymentRequest[]>>('/platform/payments');
    return response.data;
  },

  async reviewPaymentRequest(
    id: string,
    approve: boolean
  ): Promise<ApiResponse<any>> {
    const response = await api.post<ApiResponse<any>>(`/platform/payments/${id}/review`, { approve });
    return response.data;
  },

  async startSupportSession(data: {
    targetOrganizationId: string;
    targetUserId: string;
    reason: string;
    durationMinutes: number;
  }): Promise<ApiResponse<SupportSessionStartResult>> {
    const response = await api.post<ApiResponse<SupportSessionStartResult>>('/platform/support-session/start', data);
    return response.data;
  },

  async getAuditLogs(): Promise<ApiResponse<AuditLogItem[]>> {
    const response = await api.get<ApiResponse<AuditLogItem[]>>('/platform/audit');
    return response.data;
  },
};
