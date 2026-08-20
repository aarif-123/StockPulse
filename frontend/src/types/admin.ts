export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type LicenseTier = 'STARTER' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';
export type LicenseStatus = 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'REVOKED';

export interface SoftwareLicense {
  licenseKey: string;
  tier: LicenseTier;
  status: LicenseStatus;
  expiresAt: string | null;
  maxCustomers: number;
  maxTransactions: number;
  allowedFeatures: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  license?: SoftwareLicense | null;
}

export interface BackdoorAuditLog {
  id: string;
  adminId: string;
  targetUserId: string;
  action: string;
  reason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  startedAt: string;
  endedAt: string | null;
  admin: {
    id: string;
    name: string;
    email: string;
  };
  targetUser: {
    id: string;
    name: string;
    email: string;
  };
}

export interface UserActivityLog {
  id: string;
  userId: string;
  action: string;
  module: string;
  ipAddress: string | null;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}

export interface AdminOverviewStats {
  totalUsers: number;
  activeLicenses: number;
  expiringLicenses: number;
  totalBackdoorsInitiated: number;
  systemHealth: {
    dbStatus: string;
    dbLatencyMs?: number;
    uptime: number;
  };
}
