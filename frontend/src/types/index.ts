export type OrgRole = 'ORG_ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS' | 'CUSTOM';
export type PlatformRole = 'SUPER_ADMIN' | 'SUPPORT';
export type Role = OrgRole | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'PENDING';
export type OrgStatus = 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'SUSPENDED' | 'EXPIRED' | 'CANCELLED';
export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
export type PaymentMethod = 'UPI_MANUAL' | 'RAZORPAY' | 'BANK_TRANSFER' | 'CASH' | 'CHEQUE' | 'CREDIT';
export type PaymentRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface UserOrganizationSummary {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrgRole;
  status: string;
  subscription?: {
    status: SubscriptionStatus;
    planName: string;
    planCode: string;
    allowedFeatures: string[];
  };
}

export interface User {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  status?: UserStatus;
  lastLoginAt?: string | null;
  role: Role; // Contextual active role
}

export interface Plan {
  id: string;
  name: string;
  code: string;
  description?: string;
  monthlyPriceINR: number;
  yearlyPriceINR: number;
  maxUsers: number;
  maxProducts: number;
  maxCustomers: number;
  maxWarehouses: number;
  maxTransactions: number;
  allowedFeatures: string[];
  isActive: boolean;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string | null;
}

export interface OrganizationSettings {
  id: string;
  name: string;
  slug: string;
  status: OrgStatus;
  currency: string;
  businessGstin?: string | null;
  businessPhone?: string | null;
  businessEmail?: string | null;
  businessAddress?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  createdAt: string;
}

export interface OrganizationMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: OrgRole;
  status: string;
  lastLoginAt?: string | null;
  joinedAt: string;
}

export interface PaymentRequest {
  id: string;
  organizationId: string;
  planId: string;
  amountINR: number;
  billingCycle: BillingCycle;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  proofUrl?: string | null;
  status: PaymentRequestStatus;
  notes?: string | null;
  rejectionReason?: string | null;
  submittedAt: string;
  reviewedAt?: string | null;
  organization?: { id: string; name: string; slug: string };
  plan?: { id: string; name: string; code: string };
  submitter?: { id: string; name: string; email: string };
  reviewer?: { id: string; name: string; email: string };
}

export interface AuditLogItem {
  id: string;
  scope: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  metadata?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; email: string };
  organization?: { id: string; name: string; slug: string };
}

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  gstin?: string | null;
  customerType: CustomerType;
  type?: CustomerType;
  address: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  status: CustomerStatus;
  creditLimit?: number;
  outstanding?: number;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minimumStock: number;
  warehouseLocation: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  type: 'IN' | 'OUT';
  reason: string;
  createdAt: string;
  createdBy: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  customer?: {
    id: string;
    name: string;
    businessName: string;
    mobile?: string;
    email?: string;
    address?: string;
    gstNumber?: string | null;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  creator?: {
    id: string;
    name: string;
    email: string;
    role?: Role;
  };
  items?: ChallanItem[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: Pagination;
}
