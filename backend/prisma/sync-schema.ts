import { Client } from 'pg';
import { env } from '../src/config/env';

async function syncSchemaWithPg() {
  console.log('🚀 Connecting to PostgreSQL via pg client for fast Multi-Tenant DDL migration...');

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  const fullDDL = `
    DROP TABLE IF EXISTS "backdoor_audit_logs" CASCADE;
    DROP TABLE IF EXISTS "software_licenses" CASCADE;
    DROP TABLE IF EXISTS "user_activity_logs" CASCADE;
    DROP TABLE IF EXISTS "support_sessions" CASCADE;
    DROP TABLE IF EXISTS "audit_logs" CASCADE;
    DROP TABLE IF EXISTS "payment_requests" CASCADE;
    DROP TABLE IF EXISTS "subscriptions" CASCADE;
    DROP TABLE IF EXISTS "plans" CASCADE;
    DROP TABLE IF EXISTS "organization_memberships" CASCADE;
    DROP TABLE IF EXISTS "challan_items" CASCADE;
    DROP TABLE IF EXISTS "challans" CASCADE;
    DROP TABLE IF EXISTS "transaction_items" CASCADE;
    DROP TABLE IF EXISTS "transactions" CASCADE;
    DROP TABLE IF EXISTS "customer_ledger" CASCADE;
    DROP TABLE IF EXISTS "customer_metrics" CASCADE;
    DROP TABLE IF EXISTS "customers" CASCADE;
    DROP TABLE IF EXISTS "stock_movements" CASCADE;
    DROP TABLE IF EXISTS "product_metrics" CASCADE;
    DROP TABLE IF EXISTS "products" CASCADE;
    DROP TABLE IF EXISTS "organizations" CASCADE;
    DROP TABLE IF EXISTS "users" CASCADE;

    DROP TYPE IF EXISTS "PlatformRole" CASCADE;
    DROP TYPE IF EXISTS "OrgRole" CASCADE;
    DROP TYPE IF EXISTS "Role" CASCADE;
    DROP TYPE IF EXISTS "UserStatus" CASCADE;
    DROP TYPE IF EXISTS "OrgStatus" CASCADE;
    DROP TYPE IF EXISTS "MembershipStatus" CASCADE;
    DROP TYPE IF EXISTS "SubscriptionStatus" CASCADE;
    DROP TYPE IF EXISTS "BillingCycle" CASCADE;
    DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
    DROP TYPE IF EXISTS "PaymentRequestStatus" CASCADE;
    DROP TYPE IF EXISTS "CustomerType" CASCADE;
    DROP TYPE IF EXISTS "CustomerStatus" CASCADE;
    DROP TYPE IF EXISTS "StockMovementType" CASCADE;
    DROP TYPE IF EXISTS "ChallanStatus" CASCADE;
    DROP TYPE IF EXISTS "WhatsAppTxStatus" CASCADE;
    DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
    DROP TYPE IF EXISTS "LedgerTxType" CASCADE;
    DROP TYPE IF EXISTS "RiskLevel" CASCADE;
    DROP TYPE IF EXISTS "VelocityTrend" CASCADE;
    DROP TYPE IF EXISTS "AuditScope" CASCADE;
    DROP TYPE IF EXISTS "SupportSessionStatus" CASCADE;

    CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'SUPPORT');
    CREATE TYPE "OrgRole" AS ENUM ('ORG_ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS', 'CUSTOM');
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING');
    CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED');
    CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
    CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'EXPIRED', 'CANCELLED');
    CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');
    CREATE TYPE "PaymentMethod" AS ENUM ('UPI_MANUAL', 'RAZORPAY', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'CREDIT');
    CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE', 'DISTRIBUTOR');
    CREATE TYPE "CustomerStatus" AS ENUM ('LEAD', 'ACTIVE', 'INACTIVE');
    CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');
    CREATE TYPE "ChallanStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');
    CREATE TYPE "WhatsAppTxStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'FAILED', 'CANCELLED');
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');
    CREATE TYPE "LedgerTxType" AS ENUM ('SALE', 'PAYMENT', 'CREDIT_NOTE', 'DEBIT_NOTE');
    CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
    CREATE TYPE "VelocityTrend" AS ENUM ('INCREASING', 'DECREASING', 'STABLE');
    CREATE TYPE "AuditScope" AS ENUM ('PLATFORM', 'ORGANIZATION', 'BUSINESS');
    CREATE TYPE "SupportSessionStatus" AS ENUM ('ACTIVE', 'TERMINATED', 'EXPIRED');

    CREATE TABLE "users" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "passwordHash" TEXT NOT NULL,
      "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
      "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
      "lastLoginAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "users_email_idx" ON "users"("email");
    CREATE INDEX "users_isSuperAdmin_idx" ON "users"("isSuperAdmin");

    CREATE TABLE "organizations" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL UNIQUE,
      "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
      "currency" TEXT NOT NULL DEFAULT 'INR',
      "businessGstin" TEXT,
      "businessPhone" TEXT,
      "businessEmail" TEXT,
      "businessAddress" TEXT,
      "city" TEXT,
      "state" TEXT,
      "pincode" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");
    CREATE INDEX "organizations_status_idx" ON "organizations"("status");

    CREATE TABLE "organization_memberships" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "role" "OrgRole" NOT NULL DEFAULT 'SALES',
      "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "organization_memberships_userId_organizationId_key" UNIQUE ("userId", "organizationId")
    );
    CREATE INDEX "organization_memberships_userId_idx" ON "organization_memberships"("userId");
    CREATE INDEX "organization_memberships_organizationId_idx" ON "organization_memberships"("organizationId");

    CREATE TABLE "plans" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "code" TEXT NOT NULL UNIQUE,
      "description" TEXT,
      "monthlyPriceINR" DECIMAL(10,2) NOT NULL,
      "yearlyPriceINR" DECIMAL(10,2) NOT NULL,
      "maxUsers" INTEGER NOT NULL DEFAULT 2,
      "maxProducts" INTEGER NOT NULL DEFAULT 500,
      "maxCustomers" INTEGER NOT NULL DEFAULT 200,
      "maxWarehouses" INTEGER NOT NULL DEFAULT 2,
      "maxTransactions" INTEGER NOT NULL DEFAULT 1000,
      "allowedFeatures" TEXT[] NOT NULL DEFAULT ARRAY['CORE_ERP', 'CRM', 'CHALLANS', 'BASIC_REPORTS']::TEXT[],
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "version" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "plans_code_idx" ON "plans"("code");

    CREATE TABLE "subscriptions" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "planId" TEXT NOT NULL REFERENCES "plans"("id"),
      "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
      "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
      "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
      "trialEndsAt" TIMESTAMP(3),
      "cancelledAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "subscriptions_organizationId_status_idx" ON "subscriptions"("organizationId", "status");

    CREATE TABLE "payment_requests" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "planId" TEXT NOT NULL REFERENCES "plans"("id"),
      "amountINR" DECIMAL(10,2) NOT NULL,
      "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
      "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI_MANUAL',
      "referenceNumber" TEXT NOT NULL,
      "proofUrl" TEXT,
      "status" "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
      "notes" TEXT,
      "rejectionReason" TEXT,
      "submittedBy" TEXT NOT NULL REFERENCES "users"("id"),
      "reviewedBy" TEXT REFERENCES "users"("id"),
      "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "payment_requests_organizationId_status_idx" ON "payment_requests"("organizationId", "status");
    CREATE INDEX "payment_requests_referenceNumber_idx" ON "payment_requests"("referenceNumber");

    CREATE TABLE "customers" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "mobile" TEXT,
      "email" TEXT,
      "businessName" TEXT,
      "phone" TEXT,
      "address" TEXT,
      "city" TEXT,
      "state" TEXT,
      "pincode" TEXT,
      "gstin" TEXT,
      "type" "CustomerType" NOT NULL DEFAULT 'RETAIL',
      "status" "CustomerStatus" NOT NULL DEFAULT 'LEAD',
      "followUpDate" TIMESTAMP(3),
      "notes" TEXT,
      "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 50000.00,
      "outstanding" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "customers_org_email_unique" UNIQUE ("organizationId", "email"),
      CONSTRAINT "customers_org_gstin_unique" UNIQUE ("organizationId", "gstin")
    );
    CREATE INDEX "customers_organizationId_status_idx" ON "customers"("organizationId", "status");
    CREATE INDEX "customers_organizationId_createdAt_idx" ON "customers"("organizationId", "createdAt");

    CREATE TABLE "products" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "unitPrice" DECIMAL(12,2) NOT NULL,
      "costPrice" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      "hsnCode" TEXT DEFAULT '8481',
      "gstRate" DECIMAL(4,2) NOT NULL DEFAULT 0.18,
      "currentStock" INTEGER NOT NULL DEFAULT 0,
      "minimumStock" INTEGER NOT NULL DEFAULT 0,
      "reorderPoint" INTEGER NOT NULL DEFAULT 50,
      "warehouseLocation" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "products_org_sku_unique" UNIQUE ("organizationId", "sku")
    );
    CREATE INDEX "products_organizationId_category_idx" ON "products"("organizationId", "category");
    CREATE INDEX "products_organizationId_currentStock_idx" ON "products"("organizationId", "currentStock");

    CREATE TABLE "stock_movements" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "productId" TEXT NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
      "quantity" INTEGER NOT NULL,
      "type" "StockMovementType" NOT NULL,
      "reason" TEXT,
      "createdBy" TEXT NOT NULL REFERENCES "users"("id"),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "stock_movements_organizationId_createdAt_idx" ON "stock_movements"("organizationId", "createdAt");
    CREATE INDEX "stock_movements_productId_idx" ON "stock_movements"("productId");

    CREATE TABLE "challans" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "challanNumber" TEXT NOT NULL,
      "customerId" TEXT NOT NULL REFERENCES "customers"("id"),
      "status" "ChallanStatus" NOT NULL DEFAULT 'DRAFT',
      "totalQuantity" INTEGER NOT NULL DEFAULT 0,
      "createdBy" TEXT NOT NULL REFERENCES "users"("id"),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "challans_org_challanNumber_unique" UNIQUE ("organizationId", "challanNumber")
    );
    CREATE INDEX "challans_organizationId_status_idx" ON "challans"("organizationId", "status");
    CREATE INDEX "challans_customerId_idx" ON "challans"("customerId");

    CREATE TABLE "challan_items" (
      "id" TEXT PRIMARY KEY,
      "challanId" TEXT NOT NULL REFERENCES "challans"("id") ON DELETE CASCADE,
      "productId" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "unitPrice" DECIMAL(12,2) NOT NULL,
      "quantity" INTEGER NOT NULL
    );
    CREATE INDEX "challan_items_challanId_idx" ON "challan_items"("challanId");

    CREATE TABLE "transactions" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "customerId" TEXT NOT NULL REFERENCES "customers"("id"),
      "invoiceNumber" TEXT NOT NULL,
      "parsedInput" TEXT,
      "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "subtotal" DECIMAL(12,2) NOT NULL,
      "gstAmount" DECIMAL(12,2) NOT NULL,
      "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      "totalAmount" DECIMAL(12,2) NOT NULL,
      "status" "WhatsAppTxStatus" NOT NULL DEFAULT 'DRAFT',
      "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI_MANUAL',
      "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
      "whatsappMessageId" TEXT,
      "createdByWhatsappId" TEXT,
      "createdBy" TEXT NOT NULL REFERENCES "users"("id"),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "transactions_org_invoiceNumber_unique" UNIQUE ("organizationId", "invoiceNumber")
    );
    CREATE INDEX "transactions_organizationId_createdAt_idx" ON "transactions"("organizationId", "createdAt");

    CREATE TABLE "transaction_items" (
      "id" TEXT PRIMARY KEY,
      "transactionId" TEXT NOT NULL REFERENCES "transactions"("id") ON DELETE CASCADE,
      "productId" TEXT NOT NULL REFERENCES "products"("id"),
      "productName" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "hsnCode" TEXT DEFAULT '8481',
      "quantity" INTEGER NOT NULL,
      "unitRate" DECIMAL(12,2) NOT NULL,
      "gstRate" DECIMAL(4,2) NOT NULL DEFAULT 0.18,
      "lineTotal" DECIMAL(12,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "transaction_items_transactionId_idx" ON "transaction_items"("transactionId");

    CREATE TABLE "customer_ledger" (
      "id" TEXT PRIMARY KEY,
      "organizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "customerId" TEXT NOT NULL REFERENCES "customers"("id"),
      "transactionId" TEXT REFERENCES "transactions"("id") ON DELETE SET NULL,
      "transactionType" "LedgerTxType" NOT NULL,
      "amount" DECIMAL(12,2) NOT NULL,
      "balanceAfter" DECIMAL(12,2) NOT NULL,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "customer_ledger_org_customer_idx" ON "customer_ledger"("organizationId", "customerId");

    CREATE TABLE "customer_metrics" (
      "id" TEXT PRIMARY KEY,
      "customerId" TEXT NOT NULL UNIQUE REFERENCES "customers"("id") ON DELETE CASCADE,
      "totalPurchases" INTEGER NOT NULL DEFAULT 0,
      "lifetimeValue" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
      "avgOrderValue" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      "lastPurchaseDate" TIMESTAMP(3),
      "totalOutstanding" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 50000.00,
      "onTimeCount" INTEGER NOT NULL DEFAULT 0,
      "lateCount" INTEGER NOT NULL DEFAULT 0,
      "avgLateDays" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "churnRisk" "RiskLevel" NOT NULL DEFAULT 'LOW',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "product_metrics" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL UNIQUE REFERENCES "products"("id") ON DELETE CASCADE,
      "sales30Days" INTEGER NOT NULL DEFAULT 0,
      "avgDailySales" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
      "sales90Days" INTEGER NOT NULL DEFAULT 0,
      "trend" "VelocityTrend" NOT NULL DEFAULT 'STABLE',
      "daysToStockout" INTEGER,
      "reorderRecommended" BOOLEAN NOT NULL DEFAULT false,
      "suggestedOrderQty" INTEGER,
      "avgMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 20.0,
      "marginTrend" "VelocityTrend" NOT NULL DEFAULT 'STABLE',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE "audit_logs" (
      "id" TEXT PRIMARY KEY,
      "scope" "AuditScope" NOT NULL DEFAULT 'BUSINESS',
      "organizationId" TEXT REFERENCES "organizations"("id") ON DELETE CASCADE,
      "actorUserId" TEXT NOT NULL REFERENCES "users"("id"),
      "action" TEXT NOT NULL,
      "resource" TEXT NOT NULL,
      "resourceId" TEXT,
      "metadata" TEXT,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "audit_logs_scope_createdAt_idx" ON "audit_logs"("scope", "createdAt");
    CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

    CREATE TABLE "support_sessions" (
      "id" TEXT PRIMARY KEY,
      "superAdminId" TEXT NOT NULL REFERENCES "users"("id"),
      "targetOrganizationId" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
      "targetUserId" TEXT NOT NULL REFERENCES "users"("id"),
      "reason" TEXT NOT NULL,
      "status" "SupportSessionStatus" NOT NULL DEFAULT 'ACTIVE',
      "tokenHash" TEXT,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endedAt" TIMESTAMP(3),
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX "support_sessions_superAdminId_idx" ON "support_sessions"("superAdminId");
    CREATE INDEX "support_sessions_targetOrg_idx" ON "support_sessions"("targetOrganizationId");
  `;

  await client.query(fullDDL);
  console.log('🎉 Multi-Tenant PostgreSQL Schema DDL executed successfully via pg client!');
  await client.end();
}

syncSchemaWithPg()
  .catch((err) => {
    console.error('Fatal schema sync error:', err);
    process.exit(1);
  });
