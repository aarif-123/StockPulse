import { OrgRole } from '@prisma/client';

export interface UserContext {
  userId: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  supportSessionId?: string;
  impersonatedBy?: string;
}

export interface TenantContext {
  organizationId: string;
  role: OrgRole;
  permissions: string[];
}

export interface AuthenticatedUserPayload {
  userId: string;
  isSuperAdmin: boolean;
  supportSessionId?: string;
  impersonatedBy?: string;
}

export interface UserOrganizationMembershipSummary {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrgRole;
  status: string;
  subscription?: {
    status: string;
    planName: string;
    planCode: string;
    allowedFeatures: string[];
  };
}
