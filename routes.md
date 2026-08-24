# StockPulse Complete Route & API Reference Documentation

This document provides a comprehensive reference of all **Backend REST API Endpoints** and **Frontend Web Application Routes** in StockPulse, detailing their descriptions, parameters, authentication requirements, header requirements, and Role-Based Access Control (RBAC).

---

## Architecture & Authentication Overview

### Base URLs & Prefix Standards

- **Backend API Base (Local)**: `http://localhost:5000` (or `process.env.BACKEND_URL`)
- **Backend API Base (Production Render)**: `https://stockpulse-5jbc.onrender.com`
- **API Versioning**: Endpoints support standard `/api` and versioned `/api/v1` aliases (e.g., `https://stockpulse-5jbc.onrender.com/api/products` and `https://stockpulse-5jbc.onrender.com/api/v1/products`).
- **Frontend SPA Base**: `http://localhost:5173` (Vite / React Router v6)

### Global Security Headers

| Header | Format | Required On | Description |
| :--- | :--- | :--- | :--- |
| `Authorization` | `Bearer <JWT_TOKEN>` | All protected endpoints | Contains the JWT identity token issued upon login. |
| `x-organization-id` or `X-Organization-Id` | UUID / CUID string | All tenant-scoped endpoints | Identifies the target tenant context for multi-tenant data isolation. |
| `Content-Type` | `application/json` | POST / PUT / PATCH | Payload content type header. |

---

## Role-Based Access Control (RBAC) & Permissions

### Tenant Roles (`OrgRole`)
1. **`ORG_ADMIN`**: Full administrative control over organization settings, members, billing, and all modules.
2. **`ADMIN`**: Managerial operations across business modules (Products, Customers, Challans, BOM).
3. **`SALES`**: CRM Customer management, sales quotes/orders, product catalog lookup, challan creation.
4. **`WAREHOUSE`**: Stock movements, stock adjustments, physical inventory audits, BOM assembly builds, challan delivery.
5. **`ACCOUNTS`**: Billing, payment history, customer invoices/challans, financial reporting.

### System Roles
- **`SUPER_ADMIN`**: Global SaaS platform owner/operator with full system governance across all tenants, user accounts, subscription plans, and audit logs.

---

## 1. System & Health Check API Endpoints

### `GET /api/health` / `GET /health`
- **Description**: Public health probe returning live system status, database connectivity latency, process uptime, environment, and version.
- **Access Control**: Public (No Authentication required)
- **Headers**: None
- **Parameters**: None
- **Response**: `200 OK` (Healthy) / `503 Service Unavailable` (Degraded DB connection)
  ```json
  {
    "status": "ok",
    "db": "connected",
    "dbLatencyMs": 12,
    "uptime": 3600,
    "version": "1.0.0",
    "environment": "development"
  }
  ```

---

## 2. Identity & Authentication API (`/api/auth`)

All auth endpoints are mounted under `/api/auth`, `/api/v1/auth`, and `/auth`.

### `POST /api/auth/login`
- **Description**: Authenticates user credentials, logs login metadata (IP & User-Agent), and returns a signed JWT token along with user profile and active organization memberships.
- **Access Control**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body**: 
  - `email` *(string, required)*: Valid email address.
  - `password` *(string, required)*: Account password.
- **Response**: `200 OK` with `{ token, user }`.

### `POST /api/auth/register`
- **Description**: Provisions a new tenant organization along with its initial `ORG_ADMIN` user account and trial subscription.
- **Access Control**: Public
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  - `name` *(string, min 2 chars)*: Admin user's full name.
  - `email` *(string, required)*: Admin user's email.
  - `password` *(string, min 6 chars)*: Admin account password.
  - `organizationName` *(string, min 2 chars)*: Company / Business name.
  - `organizationSlug` *(string, min 2 chars)*: Unique URL slug (`/^[a-z0-9-]+$/`).
- **Response**: `201 Created` with `{ token, user, organization }`.

### `GET /api/auth/me`
- **Description**: Retrieves current authenticated user profile, active session context, and organization memberships.
- **Access Control**: Authenticated User (`Bearer Token`)
- **Headers**: `Authorization: Bearer <token>`
- **Parameters**: None
- **Response**: `200 OK` with user details.

### `PUT /api/auth/profile`
- **Description**: Updates current user's profile details (name, phone, avatar URL).
- **Access Control**: Authenticated User (`Bearer Token`)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  - `name` *(string, optional)*: User's updated name.
  - `phone` *(string, optional)*: Contact phone number.
  - `avatarUrl` *(string, optional)*: Profile picture URL.
- **Response**: `200 OK` with `{ data: updatedUser }`.

### `PUT /api/auth/password`
- **Description**: Changes authenticated user's account password.
- **Access Control**: Authenticated User (`Bearer Token`)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request Body**:
  - `currentPassword` *(string, required)*: Current active password.
  - `newPassword` *(string, required)*: New password (min 6 chars).
- **Response**: `200 OK` with success message.

---

## 3. Platform Super Admin API (`/api/platform`)

Global management endpoints mounted at `/api/platform` and `/api/v1/platform`. Requires `SUPER_ADMIN` privileges.

### `GET /api/platform/overview`
- **Description**: High-level platform analytics including total active organizations, monthly recurring revenue (MRR), total users, and system health.
- **Access Control**: Authenticated Super Admin (`requireSuperAdmin`)
- **Headers**: `Authorization: Bearer <token>`

### `GET /api/platform/organizations`
- **Description**: Paginated search and list of all registered tenant organizations.
- **Access Control**: Authenticated Super Admin (`requireSuperAdmin`)
- **Headers**: `Authorization: Bearer <token>`
- **Query Parameters**:
  - `search` *(string, optional)*: Filter by org name or slug.
  - `status` *(string, optional)*: Filter by `ACTIVE`, `TRIAL`, `SUSPENDED`, `CANCELLED`.
  - `page` *(number, optional, default: 1)*: Page number.
  - `limit` *(number, optional, default: 50)*: Items per page.

### `GET /api/platform/organizations/:id`
- **Description**: Detailed telemetry, member list, and subscription history for a single organization.
- **Access Control**: Authenticated Super Admin (`requireSuperAdmin`)
- **Path Parameters**:
  - `id` *(string, required)*: Organization CUID/UUID.

### `POST /api/platform/organizations`
- **Description**: Manually provisions an organization from the Super Admin panel.
- **Access Control**: Authenticated Super Admin (`requireSuperAdmin`)
- **Request Body**:
  - `name` *(string, min 2 chars)*: Organization name.
  - `slug` *(string, alphanumeric & hyphens)*: Unique slug.
  - `planCode` *(string, optional)*: Plan code to assign.
  - `adminName` *(string, min 2 chars)*: Admin user full name.
  - `adminEmail` *(string, email)*: Admin email address.
  - `adminPassword` *(string, optional)*: Admin password.
  - `businessGstin` *(string, optional)*: Tax GSTIN ID.
  - `businessPhone` *(string, optional)*: Business contact phone.
  - `businessAddress` *(string, optional)*: Address.
  - `city` *(string, optional)*: City.
  - `state` *(string, optional)*: State.
  - `pincode` *(string, optional)*: Postal code.

### `PATCH /api/platform/organizations/:id`
- **Description**: Updates organization details and settings from platform administration.
- **Path Parameters**: `id` *(string)*: Organization ID.
- **Request Body**: Fields from `UpdateOrganizationSchema` (name, address, status, GSTIN, etc.).

### `PUT /api/platform/organizations/:id/status` & `PATCH /api/platform/organizations/:id/status`
- **Description**: Updates tenant operational status (e.g., `ACTIVE`, `SUSPENDED`, `CANCELLED`).
- **Path Parameters**: `id` *(string)*: Organization ID.
- **Request Body**: `{ "status": "SUSPENDED" }`.

### `POST /api/platform/organizations/:id/extend-trial`
- **Description**: Extends an organization's free trial period.
- **Path Parameters**: `id` *(string)*: Organization ID.
- **Request Body**: `{ "days": 14 }` *(number, default: 7)*.

### `POST /api/platform/organizations/:id/assign-plan`
- **Description**: Directly assigns a commercial subscription plan to an organization.
- **Path Parameters**: `id` *(string)*: Organization ID.
- **Request Body**:
  - `planId` *(string, required)*: Target Subscription Plan ID.
  - `billingCycle` *(string, required)*: `MONTHLY` or `YEARLY`.
  - `status` *(string, optional)*: Subscription status (`ACTIVE`, `TRIAL`).

### `GET /api/platform/plans`
- **Description**: Lists all platform subscription plans with pricing, quotas, and feature flags.

### `POST /api/platform/plans`
- **Description**: Creates a new commercial plan.
- **Request Body**:
  - `name` *(string, required)*: Plan display name.
  - `code` *(string, required)*: Unique plan code (e.g. `STARTER`, `ENTERPRISE`).
  - `description` *(string, optional)*: Plan description.
  - `monthlyPriceINR` *(number, non-negative)*: Price per month in INR.
  - `yearlyPriceINR` *(number, non-negative)*: Price per year in INR.
  - `maxUsers` *(number, optional)*: User limit quota.
  - `maxProducts` *(number, optional)*: Product catalog quota.
  - `maxCustomers` *(number, optional)*: Customer quota.
  - `maxWarehouses` *(number, optional)*: Warehouse quota.
  - `maxTransactions` *(number, optional)*: Monthly transaction limit.
  - `allowedFeatures` *(array of strings, optional)*: Feature keys (e.g., `["BOM_ASSEMBLIES", "ADVANCED_ANALYTICS"]`).
  - `isActive` *(boolean, optional)*: Active status flag.

### `PUT /api/platform/plans/:id` & `PATCH /api/platform/plans/:id`
- **Description**: Modifies an existing subscription plan configuration.

### `GET /api/platform/users`
- **Description**: Global list of users across all tenant organizations.
- **Query Parameters**: `search`, `status`, `role`, `page`, `limit`.

### `POST /api/platform/users`
- **Description**: Creates a new user account under a target organization.
- **Request Body**: `{ name, email, password, organizationId }`.

### `DELETE /api/platform/users/:id`
- **Description**: Permanently removes a user account.

### `PATCH /api/platform/users/:id/super-admin`
- **Description**: Grants or revokes global `SUPER_ADMIN` status for a user.
- **Request Body**: `{ "isSuperAdmin": true }`.

### `PATCH /api/platform/users/:id/status`
- **Description**: Updates user account status (`ACTIVE`, `INACTIVE`, `SUSPENDED`).
- **Request Body**: `{ "status": "INACTIVE" }`.

### `GET /api/platform/payments`
- **Description**: Lists manual UPI payment verification requests from tenants.
- **Query Parameters**: `status` *(string, optional)*: `PENDING`, `APPROVED`, `REJECTED`.

### `POST /api/platform/payments/:id/review`
- **Description**: Approves or rejects a tenant's manual payment submission.
- **Path Parameters**: `id` *(string)*: Payment request ID.
- **Request Body**:
  - `approved` *(boolean, required)*: `true` to activate subscription, `false` to reject.
  - `rejectionReason` *(string, optional)*: Explanation if rejected.

### `GET /api/platform/support/sessions` / `GET /api/platform/support-sessions`
- **Description**: Lists active and past super admin impersonation/support sessions.

### `POST /api/platform/support/start` / `POST /api/platform/support-session/start`
- **Description**: Initiates an audited support session to troubleshoot a tenant environment.
- **Request Body**:
  - `targetOrganizationId` *(string, required)*: Target tenant ID.
  - `targetUserId` *(string, optional)*: Specific user to act on behalf of.
  - `reason` *(string, min 5 chars)*: Justification for support access.
  - `durationMinutes` *(number, min 5, max 480)*: Session TTL.

### `POST /api/platform/support/stop/:id` / `POST /api/platform/support-session/stop/:id`
- **Description**: Immediately terminates an active support impersonation session.

### `GET /api/platform/audit`
- **Description**: System-wide immutable audit trail of super admin actions.
- **Query Parameters**: `search`, `scope`, `page`, `limit`.

---

## 4. Organization Settings & Team API (`/api/organizations`)

Tenant administration mounted at `/api/organizations` & `/api/v1/organizations`. Requires active Tenant Context (`x-organization-id`).

### `GET /api/organizations/settings`
- **Description**: Fetches current tenant organization profile and business details.
- **Access Control**: Authenticated Tenant Member (`ORG_ADMIN`, `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).

### `PUT /api/organizations/settings` & `PATCH /api/organizations/settings`
- **Description**: Updates organization profile (GSTIN, Address, Phone, Email, City, State, Pincode).
- **Access Control**: Requires `ORG_ADMIN` Role.
- **Request Body**: `UpdateSettingsSchema` fields.

### `GET /api/organizations/members`
- **Description**: Lists all team members enrolled in the active organization.
- **Access Control**: Authenticated Tenant Member.

### `POST /api/organizations/members`
- **Description**: Invites/adds a new team member to the organization.
- **Access Control**: Requires `ORG_ADMIN` Role.
- **Request Body**:
  - `name` *(string, required)*: User full name.
  - `email` *(string, email, required)*: User email.
  - `role` *(string, required)*: Enum `ORG_ADMIN`, `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`.
  - `password` *(string, optional)*: Initial password if creating a new user.

### `PUT /api/organizations/members/:membershipId/role` & `PATCH /api/organizations/members/:membershipId/role`
- **Description**: Updates team member role within the tenant.
- **Access Control**: Requires `ORG_ADMIN` Role.
- **Path Parameters**: `membershipId` *(string)*: Membership record ID.
- **Request Body**: `{ "role": "WAREHOUSE" }`.

### `DELETE /api/organizations/members/:membershipId`
- **Description**: Revokes a team member's access from the organization.
- **Access Control**: Requires `ORG_ADMIN` Role.

### `GET /api/organizations/subscription`
- **Description**: Retrieves active tenant plan, current usage, and quota limits.

### `GET /api/organizations/audit`
- **Description**: Tenant-specific audit log trail.
- **Access Control**: Requires `ORG_ADMIN` Role.

---

## 5. Commercial Subscription & Payments API (`/api/payments`)

Mounted at `/api/payments`, `/api/v1/payments`, and `/payments`.

### `GET /api/payments/plans`
- **Description**: Public plan pricing catalog for the SaaS subscription page.
- **Access Control**: Public.

### `POST /api/payments/manual-upi`
- **Description**: Submits a manual UPI payment reference (UTR) for plan upgrade/renewal.
- **Access Control**: Requires `ORG_ADMIN` Role & Tenant Context.
- **Request Body**:
  - `planId` *(string, required)*: Selected plan ID.
  - `billingCycle` *(string, required)*: `MONTHLY` or `YEARLY`.
  - `referenceNumber` *(string, min 4 chars)*: UPI Transaction Reference / UTR Number.
  - `notes` *(string, optional)*: Additional remarks.
  - `proofUrl` *(string, optional)*: Screenshot URL.

### `GET /api/payments/history`
- **Description**: Retrieves history of payment submissions and subscription invoices for the tenant.
- **Access Control**: Requires `ORG_ADMIN` Role & Tenant Context.

---

## 6. Customer CRM Module (`/api/customers`)

Mounted at `/api/customers` & `/customers`. Requires active Tenant Context (`x-organization-id`).

### `POST /api/customers`
- **Description**: Creates a new CRM customer profile.
- **Access Control**: Permission `CUSTOMERS_CREATE` (`ORG_ADMIN`, `ADMIN`, `SALES`).
- **Request Body**:
  - `name` *(string, required)*: Contact person name.
  - `mobile` *(string, 7-15 chars, required)*: Mobile phone number.
  - `email` *(string, email, required)*: Email address.
  - `businessName` *(string, required)*: Company / Business name.
  - `customerType` *(enum, required)*: `WHOLESALE`, `RETAIL`, `DISTRIBUTOR`, `DIRECT`.
  - `address` *(string, required)*: Delivery/Billing address.
  - `status` *(enum, required)*: `LEAD`, `ACTIVE`, `INACTIVE`, `BLOCKED`.
  - `gstNumber` *(string, optional)*: Customer GSTIN.
  - `followUpDate` *(YYYY-MM-DD, optional)*: Next follow-up schedule.
  - `notes` *(string, optional)*: Notes and context.

### `GET /api/customers`
- **Description**: Paginated list and search of customers.
- **Access Control**: Permission `CUSTOMERS_READ` (`ORG_ADMIN`, `ADMIN`, `SALES`, `ACCOUNTS`).
- **Query Parameters**:
  - `page` *(number, default: 1)*: Page number.
  - `limit` *(number, default: 10, max: 500)*: Items per page.
  - `search` *(string, optional)*: Filter by customer name, business name, phone, or email.
  - `status` *(enum, optional)*: Filter by status.
  - `customerType` *(enum, optional)*: Filter by type.

### `GET /api/customers/:id`
- **Description**: Retrieves single customer profile with full activity and order history.
- **Access Control**: Permission `CUSTOMERS_READ`.
- **Path Parameters**: `id` *(string)*: Customer ID.

### `PUT /api/customers/:id` & `PATCH /api/customers/:id`
- **Description**: Updates existing customer profile.
- **Access Control**: Permission `CUSTOMERS_UPDATE`.
- **Path Parameters**: `id` *(string)*: Customer ID.
- **Request Body**: Partial `createCustomerSchema` fields.

### `POST /api/customers/:id/follow-up` & `POST /api/customers/:id/follow-ups`
- **Description**: Adds a interaction log and schedules next follow-up date for a customer.
- **Access Control**: Permission `CUSTOMERS_FOLLOWUP` (`ORG_ADMIN`, `ADMIN`, `SALES`).
- **Request Body**:
  - `followUpDate` *(string, format: YYYY-MM-DD, required)*: Target follow-up date.
  - `notes` *(string, required)*: Interaction description.

---

## 7. Product Catalog & Stock Inventory API (`/api/products`)

Mounted at `/api/products` & `/products`. Requires Tenant Context (`x-organization-id`).

### `POST /api/products`
- **Description**: Registers a new product SKU into inventory.
- **Access Control**: Permission `PRODUCTS_CREATE` (`ORG_ADMIN`, `ADMIN`, `WAREHOUSE`).
- **Request Body**:
  - `name` *(string, required)*: Product name.
  - `sku` *(string, required)*: Unique Stock Keeping Unit code.
  - `category` *(string, required)*: Product category.
  - `unitPrice` *(number, >= 0, required)*: Base selling price per unit.
  - `currentStock` *(integer, >= 0, required)*: Initial stock count.
  - `minimumStock` *(integer, >= 0, required)*: Low-stock reorder threshold.
  - `warehouseLocation` *(string, required)*: Bin / Aisle / Warehouse location.

### `POST /api/products/bulk-import`
- **Description**: Bulk imports product catalog via CSV/Excel payload with customizable deduplication strategies.
- **Access Control**: Permission `PRODUCTS_CREATE`.
- **Request Body**:
  - `items` *(array of product objects, min 1 item, required)*
  - `duplicateStrategy` *(enum, default: `MERGE_STOCK`)*: `MERGE_STOCK`, `SKIP_DUPLICATES`, `REPLACE_ALL`, `STRICT`.

### `GET /api/products`
- **Description**: Paginated product list with search and low-stock filter flags.
- **Access Control**: Permission `PRODUCTS_READ` (`ORG_ADMIN`, `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS`).
- **Query Parameters**:
  - `page` *(number, default: 1)*
  - `limit` *(number, default: 10, max: 500)*
  - `search` *(string, optional)*: Filter by SKU or product name.
  - `category` *(string, optional)*: Filter by category.
  - `lowStock` *(boolean string `'true'`/`'false'`, optional)*: Filter products where `currentStock <= minimumStock`.

### `GET /api/products/:id`
- **Description**: Fetches single product details and current inventory levels.
- **Access Control**: Permission `PRODUCTS_READ`.
- **Path Parameters**: `id` *(string)*: Product ID.

### `PUT /api/products/:id` & `PATCH /api/products/:id`
- **Description**: Modifies product metadata (name, SKU, category, price, min stock, location). Stock levels cannot be edited directly here (must use movements).
- **Access Control**: Permission `PRODUCTS_UPDATE`.

### `POST /api/products/:id/movements` & `POST /api/products/:id/stock-movements`
- **Description**: Logs an audited stock movement (`IN` received stock, `OUT` dispatched stock, or `ADJUSTMENT`).
- **Access Control**: Permission `PRODUCTS_STOCK_ADJUST` (`ORG_ADMIN`, `ADMIN`, `WAREHOUSE`).
- **Path Parameters**: `id` *(string)*: Product ID.
- **Request Body**:
  - `type` *(enum, required)*: `IN`, `OUT`, `ADJUSTMENT`.
  - `quantity` *(integer, > 0, required)*: Number of units.
  - `reason` *(string, required)*: Audit explanation (e.g. "Restock shipment", "Damaged goods").

### `GET /api/products/:id/movements` & `GET /api/products/:id/stock-movements`
- **Description**: Fetches historical stock movement ledger for a product.
- **Access Control**: Permission `PRODUCTS_READ`.
- **Query Parameters**: `page`, `limit`.

---

## 8. Delivery Challans & Dispatch API (`/api/challans`)

Mounted at `/api/challans` & `/challans`. Manages delivery notes and stock reservation.

### `POST /api/challans`
- **Description**: Creates a new Draft Delivery Challan.
- **Access Control**: Permission `CHALLANS_CREATE` (`ORG_ADMIN`, `ADMIN`, `SALES`).
- **Request Body**:
  - `customerId` *(string, required)*: Destination customer ID.
  - `items` *(array, min 1 item, required)*:
    - `productId` *(string, required)*: Product ID.
    - `quantity` *(integer, > 0, required)*: Dispatched quantity.

### `GET /api/challans`
- **Description**: Lists delivery challans with status filtering.
- **Access Control**: Permission `CHALLANS_READ` (`ORG_ADMIN`, `ADMIN`, `SALES`, `ACCOUNTS`, `WAREHOUSE`).
- **Query Parameters**:
  - `page` *(number, default: 1)*
  - `limit` *(number, default: 10, max: 500)*
  - `status` *(enum, optional)*: `DRAFT`, `CONFIRMED`, `CANCELLED`.
  - `search` *(string, optional)*: Filter by challan number or customer name.

### `GET /api/challans/:id`
- **Description**: Retrieves single delivery challan record with item line details.
- **Path Parameters**: `id` *(string)*: Challan ID.

### `POST /api/challans/:id/confirm`
- **Description**: Confirms delivery challan, automatically deducting item quantities from active stock.
- **Access Control**: Permission `CHALLANS_CONFIRM` (`ORG_ADMIN`, `ADMIN`, `WAREHOUSE`, `SALES`).
- **Path Parameters**: `id` *(string)*: Challan ID.

### `POST /api/challans/:id/cancel`
- **Description**: Cancels a draft or confirmed challan (restoring stock if previously confirmed).
- **Access Control**: Permission `CHALLANS_CANCEL` (`ORG_ADMIN`, `ADMIN`).
- **Path Parameters**: `id` *(string)*: Challan ID.

---

## 9. Dashboard Analytics API (`/api/dashboard`)

Mounted at `/api/dashboard` & `/dashboard`.

### `GET /api/dashboard/stats`
- **Description**: Aggregates tenant KPI summary cards: total stock value, total SKUs, low stock count, pending challans, and customer counts.
- **Access Control**: Authenticated Tenant User (`Bearer Token` & `x-organization-id`).

---

## 10. Reports & Business Intelligence API (`/api/reports`)

Mounted at `/api/reports` & `/reports`.

### `GET /api/reports/stock-movements`
- **Description**: Comprehensive audit report of stock movements across all products.
- **Access Control**: Permission `REPORTS_READ` (`ORG_ADMIN`, `ADMIN`, `ACCOUNTS`).
- **Query Parameters**:
  - `search` *(string, optional)*: Search by SKU or product name.
  - `productId` *(string, optional)*: Filter by specific product ID.
  - `type` *(enum, optional)*: `IN` or `OUT`.
  - `dateFrom` *(ISO date string, optional)*: Start date.
  - `dateTo` *(ISO date string, optional)*: End date.
  - `page` *(number, default: 1)*
  - `limit` *(number, default: 25, max: 500)*

### `GET /api/reports/analytics`
- **Description**: Analytical trend data (stock turnover rates, top moving products, consumption charts).
- **Access Control**: Permission `REPORTS_ANALYTICS`.
- **Query Parameters**:
  - `range` *(enum, default: `'30d'`)*: Time window: `'7d'`, `'15d'`, `'30d'`, `'90d'`, `'365d'`.

---

## 11. Bill of Materials (BOM) & Manufacturing API (`/api/bom`)

Mounted at `/api/bom`, `/api/v1/bom`, and `/bom`. Requires subscription feature entitlement `BOM_ASSEMBLIES`.

### `GET /api/bom`
- **Description**: Lists BOM assembly recipes and multi-component products.
- **Access Control**: Authenticated Tenant Member (`ORG_ADMIN`, `ADMIN`, `WAREHOUSE`, `SALES`).
- **Query Parameters**:
  - `page` *(number, default: 1)*
  - `limit` *(number, default: 50, max: 500)*
  - `search` *(string, optional)*: Assembly name or SKU search.
  - `category` *(string, optional)*: Assembly category filter.

### `GET /api/bom/:id`
- **Description**: Retrieves single assembly recipe with component explosion list.
- **Path Parameters**: `id` *(string)*: Assembly ID.

### `POST /api/bom`
- **Description**: Creates a new BOM assembly recipe.
- **Access Control**: Requires Roles `ORG_ADMIN`, `ADMIN`, or `WAREHOUSE`.
- **Request Body**:
  - `name` *(string, 2-100 chars, required)*: Assembly name.
  - `sku` *(string, required, converted to uppercase)*: Composite SKU.
  - `category` *(string, default: `'Workstation Bundles'`)*: Category.
  - `description` *(string, max 500 chars, optional)*: Assembly notes.
  - `sellingPrice` *(number, > 0, required)*: Selling price.
  - `components` *(array of component objects, min 1 required)*:
    - `productId` *(string, required)*: Raw component product ID.
    - `qtyRequired` *(integer, > 0, required)*: Required units per assembly build.

### `PUT /api/bom/:id`
- **Description**: Updates an existing BOM assembly recipe structure.
- **Access Control**: Requires Roles `ORG_ADMIN`, `ADMIN`, or `WAREHOUSE`.
- **Path Parameters**: `id` *(string)*: Assembly ID.
- **Request Body**: `updateBomAssemblySchema` fields.

### `DELETE /api/bom/:id`
- **Description**: Deletes a BOM assembly recipe.
- **Access Control**: Requires Roles `ORG_ADMIN` or `ADMIN`.

### `POST /api/bom/:id/build`
- **Description**: Executes a production run: builds *N* assembly units, automatically deducting raw component inventory and increasing finished assembly inventory.
- **Access Control**: Requires Roles `ORG_ADMIN`, `ADMIN`, or `WAREHOUSE`.
- **Path Parameters**: `id` *(string)*: Assembly ID.
- **Request Body**:
  - `quantity` *(integer, > 0, default: 1)*: Build batch size.
  - `notes` *(string, max 250 chars, optional)*: Production batch notes.

---

## 12. In-App Notifications API (`/api/notifications`)

Mounted at `/api/notifications`, `/api/v1/notifications`, and `/notifications`.

### `GET /api/notifications`
- **Description**: Paginated notification alert inbox for the current user and organization.
- **Access Control**: Authenticated User & Tenant Context.
- **Query Parameters**:
  - `unreadOnly` *(boolean string `'true'`, optional)*: Filter for unread items only.
  - `page` *(number, default: 1)*
  - `limit` *(number, default: 25)*
  - `search` *(string, optional)*: Search title/message text.
  - `severity` *(enum, optional)*: `INFO`, `WARNING`, `CRITICAL`, `SUCCESS`.
  - `type` *(enum, optional)*: Notification category.
  - `startDate` / `endDate` *(ISO date string, optional)*: Date range filter.
  - `sortOrder` *(string `'asc'`/`'desc'`, default: `'desc'`)*: Sort direction.

### `PATCH /api/notifications/:id/read`
- **Description**: Marks a single notification as read.
- **Path Parameters**: `id` *(string)*: Notification ID.

### `POST /api/notifications/read-all`
- **Description**: Marks all unread notifications in the organization as read.

---

## 13. Frontend Web Application Routes (React Router v6)

### Public Routes

| Path | Component View | Description |
| :--- | :--- | :--- |
| `/` | `HomeOrDashboard` | Root redirect controller (redirects Super Admin to `/platform`, Tenant User to `/dashboard`, or guest to `/welcome`). |
| `/welcome` | `Landing` | SaaS Marketing & Product Feature Landing Page. |
| `/landing` | `Landing` | Alternate alias for SaaS Landing Page. |
| `/pricing` | `Landing` | Public subscription plans and pricing calculator view. |
| `/login` | `Login` | User & Super Admin authentication portal. |

---

### Platform Super Admin Suite (`/platform/*`)
Guarded by `<ProtectedRoute requireSuperAdmin>`. Rendered inside `PlatformLayout`.

| Route Path | Component View | Description |
| :--- | :--- | :--- |
| `/platform` | `PlatformDashboard` | Global system status, MRR charts, active tenants metric overview. |
| `/platform/organizations` | `PlatformOrganizations` | Organization tenant lifecycle, suspension, manual provisioning, and plan assignment. |
| `/platform/users` | `PlatformUsers` | Global user directory, role assignment, and super admin status toggles. |
| `/platform/payments` | `PlatformPayments` | Manual UPI transaction review and manual subscription approval portal. |
| `/platform/plans` | `PlatformPlans` | Pricing tier, feature flag, and quota limit configuration editor. |
| `/platform/support` | `PlatformSupport` | Support session management & tenant impersonation center. |
| `/platform/audit` | `PlatformAudit` | Global immutable platform audit log viewer. |

---

### Tenant Business Workspace
Guarded by `<ProtectedRoute>`. Rendered inside `SidebarLayout`.

| Route Path | Component View | Allowed Roles | Description |
| :--- | :--- | :--- | :--- |
| `/dashboard` | `Dashboard` | All Tenant Roles | Executive dashboard featuring live inventory KPIs and alert feed. |
| `/profile` | `ProfileSettings` | All Tenant Roles | User profile update (Name, Contact, Avatar, Password change). |
| `/notifications` | `NotificationHistory` | All Tenant Roles | Complete notification history with severity filters and mark-as-read. |
| `/org/settings` | `OrganizationSettings` | `ORG_ADMIN`, `ADMIN` | Business details, GSTIN, and team member invitation/role management. |
| `/org/billing` | `BillingSubscriptions` | `ORG_ADMIN`, `ADMIN` | Commercial plan subscription status, usage quotas, and UPI payment form. |
| `/customers` | `Customers` | `ORG_ADMIN`, `ADMIN`, `SALES`, `ACCOUNTS` | CRM customer directory, search, filter, and creation form. |
| `/customers/:id` | `CustomerDetails` | `ORG_ADMIN`, `ADMIN`, `SALES`, `ACCOUNTS` | Customer profile details, interaction timeline, and follow-up scheduler. |
| `/products` | `Products` | `ORG_ADMIN`, `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS` | Stock catalog table with search, low-stock alerts, CSV bulk import, & creation. |
| `/products/:id` | `ProductDetails` | `ORG_ADMIN`, `ADMIN`, `SALES`, `WAREHOUSE`, `ACCOUNTS` | Product details, stock location, and historical stock movement ledger. |
| `/reorder` | `ReorderReport` | `ORG_ADMIN`, `ADMIN`, `ACCOUNTS`, `SALES` | Automated replenishment purchasing suggestion report for low stock items. |
| `/aim` | `AdvancedInventoryManager` | `ORG_ADMIN`, `ADMIN`, `WAREHOUSE`, `ACCOUNTS` | Multi-location stock transfer and inventory allocation hub. |
| `/stock-take` | `StockTake` | `ORG_ADMIN`, `ADMIN`, `WAREHOUSE` | Physical inventory audit and manual stock count reconciliation tool. |
| `/assemblies` | `ProductionAssemblies` | `ORG_ADMIN`, `ADMIN`, `WAREHOUSE`, `SALES` | BOM multi-component assembly manager and batch build run execution. |
| `/challans` | `Challans` | `ORG_ADMIN`, `ADMIN`, `SALES`, `ACCOUNTS`, `WAREHOUSE` | Delivery challan dispatch management, status filter, and creation. |
| `/challans/new` | `CreateChallan` | `ORG_ADMIN`, `ADMIN`, `SALES` | Multi-item delivery challan draft generation wizard. |
| `/challans/:id` | `ChallanDetails` | `ORG_ADMIN`, `ADMIN`, `SALES`, `ACCOUNTS`, `WAREHOUSE` | Detailed delivery challan summary, confirmation, or cancellation. |
| `/reports` | `Reports` | `ORG_ADMIN`, `ADMIN`, `ACCOUNTS` | Inventory valuation, stock movement ledger reports, and analytics charts. |

---
