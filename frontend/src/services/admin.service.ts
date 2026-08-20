import { api } from './api';
import type {
  User,
  AdminOverviewStats,
  BackdoorAuditLog,
  UserActivityLog,
  Role,
  UserStatus,
  LicenseTier,
  LicenseStatus
} from '../types/admin';

export async function getAdminOverview(): Promise<AdminOverviewStats> {
  const response = await api.get<AdminOverviewStats>('/admin/overview');
  return response.data;
}

export async function getUsersList(search?: string, role?: Role, status?: UserStatus): Promise<User[]> {
  const params: any = {};
  if (search) params.search = search;
  if (role) params.role = role;
  if (status) params.status = status;

  const response = await api.get<User[]>('/admin/users', { params });
  return response.data;
}

export async function createUser(data: {
  name: string;
  email: string;
  role: Role;
  status?: UserStatus;
  password?: string;
}): Promise<User> {
  const response = await api.post<User>('/admin/users', data);
  return response.data;
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    email?: string;
    role?: Role;
    status?: UserStatus;
    password?: string;
  }
): Promise<User> {
  const response = await api.put<User>(`/admin/users/${id}`, data);
  return response.data;
}

export async function allotSoftwareLicense(
  userId: string,
  data: {
    tier: LicenseTier;
    status: LicenseStatus;
    maxCustomers: number;
    maxTransactions: number;
    maxProducts: number;
    allowedFeatures: string[];
    expiresAt?: string | null;
    notes?: string;
  }
): Promise<any> {
  const response = await api.post(`/admin/users/${userId}/license`, data);
  return response.data;
}

export async function getUserActivityLogs(userId?: string): Promise<UserActivityLog[]> {
  const params: any = {};
  if (userId) params.userId = userId;

  const response = await api.get<UserActivityLog[]>('/admin/activities', { params });
  return response.data;
}

export async function startBackdoorSession(targetUserId: string, reason: string): Promise<{
  backdoorToken: string;
  backdoorLogId: string;
  targetUser: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}> {
  const response = await api.post('/admin/backdoor/start', { targetUserId, reason });
  return response.data;
}

export async function stopBackdoorSession(backdoorLogId: string): Promise<any> {
  const response = await api.post(`/admin/backdoor/stop/${backdoorLogId}`);
  return response.data;
}

export async function getBackdoorAuditLogs(): Promise<BackdoorAuditLog[]> {
  const response = await api.get<BackdoorAuditLog[]>('/admin/backdoor/logs');
  return response.data;
}
