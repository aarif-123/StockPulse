# ⚡ StockPulse — Enterprise Multi-Tenant Operations & B2B SaaS Platform

<div align="center">

![StockPulse Banner](https://img.shields.io/badge/StockPulse-Enterprise%20Operations%20Platform-7c3aed?style=for-the-badge&logo=shield)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2d3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.x-4169e1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

**A high-performance, multi-tenant B2B operations engine unifying CRM, multi-warehouse inventory control, BOM assemblies, statutory GST Rule 55 delivery challans, customer financial ledgers, and platform governance.**

[System Architecture](#-system-architecture) • [Key Capabilities](#-key-capabilities) • [Quick Start Guide](#-quick-start-guide) • [Security & RBAC](#-roles--permissions-matrix) • [API Guide](#-api-endpoints-reference) • [Test Credentials](#-pre-seeded-test-credentials)

</div>

---

## 🌟 Executive Overview

**StockPulse** is engineered as a production-grade multi-tenant B2B SaaS platform designed to eliminate operational friction across sales, warehousing, finance, and platform administration. Built on a clean **Modular Monolith** architecture with strict tenant isolation, it delivers sub-millisecond response times, ACID transaction safety, and a glassmorphism executive user experience.

### Core Value Pillars
1. **Multi-Tenant Foundation**: Organization partitioning with custom subdomain slugs, user memberships, plan quota limits (users, SKUs, warehouses, transactions), and automated subscription state machines.
2. **Platform Super Admin Command Center**: Centralized governance featuring tenant lifecycle controls, Org Admin provisioning, interactive **Organization Inspector** modal, commercial plan matrix configuration, manual UPI payment verification, and time-bounded impersonation support sessions.
3. **Statutory GST Delivery Challans (Rule 55)**: Sequential challan generation, automated state tax splits (CGST/SGST/IGST), customer credit checks, and pessimistic concurrency row locking (`SELECT ... FOR UPDATE`) preventing double-dispatch.
4. **Supply Chain & Inventory 360°**: Stock adjustments with full audit trails, multi-warehouse location tracking, stockout forecasting, BOM (Bill of Materials) production assemblies, and physical cycle-count stock takes.
5. **Customer Relationship Intelligence**: Lead-to-account lifecycle, GSTIN validation, follow-up scheduling, credit limits, running debit/credit financial ledgers, and customer risk scoring.

---

## 🏗️ System Architecture

StockPulse employs a **Modular Monolith** architecture. This avoids the latency, network unreliability, and deployment complexities of distributed microservices while enforcing clean domain boundaries and strict separation of concerns.

```mermaid
flowchart TB
    subgraph ClientLayer["🖥️ Frontend Client (React 19 + TypeScript + Vite)"]
        UI["Executive Dashboard & Tenant Console"]
        CMD["Command Palette (⌘K)"]
        AI["AI Copilot Widget"]
        HTTP["Axios Interceptor (Bearer JWT + Tenant Header)"]
        UI --> HTTP
        CMD --> HTTP
        AI --> HTTP
    end

    subgraph GatewayLayer["🛡️ HTTP Gateway & Security"]
        HELMET["Helmet CSP & Security Headers"]
        CORS["Strict CORS Policy"]
        RATE["Token Bucket Rate Limiter"]
        LOGGER["Pino Structured HTTP Logger"]
        HELMET --> CORS --> RATE --> LOGGER
    end

    subgraph AppLayer["⚙️ Express Modular Application Core"]
        AUTH_MW["Auth & Impersonation Middleware"]
        TENANT_MW["Tenant Context Resolver"]
        
        subgraph DomainModules["📦 Domain Modules"]
            MOD_AUTH["Auth Module"]
            MOD_PLATFORM["Platform Super Admin"]
            MOD_ORG["Tenant Settings & Members"]
            MOD_PAY["Plans & Payments"]
            MOD_CRM["Customer CRM 360"]
            MOD_INV["Inventory & AIM"]
            MOD_CHAL["Statutory Challans"]
            MOD_REP["Reports & Analytics"]
        end
        
        ZOD["Zod Schema Contract Validator"]
    end

    subgraph DataLayer["🗄️ Persistence & Database Layer"]
        PRISMA["Prisma ORM 5.x"]
        LOCK["Pessimistic Row Lock (SELECT FOR UPDATE)"]
        PG[("PostgreSQL Database (Supabase / RDS)")]
        
        PRISMA --> LOCK --> PG
    end

    HTTP --> GatewayLayer
    GatewayLayer --> AUTH_MW --> TENANT_MW --> ZOD --> DomainModules
    DomainModules --> PRISMA
```

---

## 🚀 Key Capabilities

### 1. Multi-Tenant Architecture & Commercial Entitlements
* **Tenant Isolation**: Every database query is scoped by `organizationId` with foreign-key cascading and indexed constraints.
* **Tiered Subscription Plans**: Starter, Growth Pro, and Enterprise tiers with configurable quotas for `maxUsers`, `maxProducts`, `maxCustomers`, `maxWarehouses`, and `maxTransactions`.
* **Flexible Billing Workflows**: Supports manual UPI payment QR verification (with UTR reference audit trail) and automated gateways.

### 2. Platform Super Admin Control Center
* **Enterprise Tenants Hub**: Monitor active subscriptions, plan allocations, tenant health, and toggle tenant statuses (`ACTIVE`, `TRIAL`, `SUSPENDED`, `CANCELLED`).
* **User Registry**: Unified identity management to inspect, provision, and remove Organization Administrators with zero UI clutter.
* **Interactive Organization Inspector**: Click on any tenant chip in the registry to launch a deep drill-down modal inspecting members, teams, credentials, commercial usage, and recent activity.
* **Support Session Impersonation**: Time-bounded, cryptographically signed impersonation sessions allowing Super Admins to troubleshoot tenant accounts with live floating banner indicators and full audit logging.

### 3. Inventory Intelligence & Operations
* **Concurrency-Safe Stock Deduction**: Challan confirmation utilizes database row locking (`SELECT ... FOR UPDATE`) to prevent race conditions during high-volume parallel dispatches.
* **BOM Production Assemblies**: Multi-component Bill of Materials recipes enabling one-click manufacturing assembly and component stock synchronization.
* **Stock Taking & Reconciliation**: Digital cycle counting tool to record physical counts, identify variance, and generate automatic reconciliation stock adjustments.
* **Product Historical Snapshots**: Line items capture point-in-time pricing, name, and SKU, ensuring future catalog edits never alter historical audit records.

### 4. CRM & Customer 360°
* **Financial Ledger**: Real-time double-entry ledger tracking `SALE`, `PAYMENT`, `CREDIT_NOTE`, and `DEBIT_NOTE` transactions with running balance history.
* **Credit Limit Enforcement**: Automatic credit utilization monitoring preventing dispatch approvals for over-limit customers.
* **Statutory Compliance**: GSTIN validation with automated state code resolution and intra-state vs inter-state tax split calculation (CGST + SGST vs IGST).

---

## 📊 Roles & Permissions Matrix

| Domain / Resource | SUPER_ADMIN | ORG_ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Platform Console & Tenants** | ⚡ Full Access | 🚫 No Access | 🚫 No Access | 🚫 No Access | 🚫 No Access |
| **Plan Matrix & UTR Approvals** | ⚡ Full Access | 🚫 No Access | 🚫 No Access | 🚫 No Access | 🚫 No Access |
| **Support Impersonation Mode** | ⚡ Full Access | 🚫 No Access | 🚫 No Access | 🚫 No Access | 🚫 No Access |
| **Org Settings & Team Members** | ⚡ Platform Level | ✏️ Full CRUD | 👁️ Read-Only | 👁️ Read-Only | 👁️ Read-Only |
| **Customer CRM & Ledgers** | ⚡ Platform Level | ✏️ Full CRUD | ✏️ Full CRUD | 🚫 No Access | 👁️ Read-Only |
| **Product Catalog & Stock** | ⚡ Platform Level | ✏️ Full CRUD | 👁️ Read-Only | ✏️ Full CRUD | 👁️ Read-Only |
| **Stock Adjustments (IN/OUT)** | ⚡ Platform Level | ✏️ Create/Audit | 🚫 No Access | ✏️ Create/Audit | 🚫 No Access |
| **BOM Production Assemblies** | ⚡ Platform Level | ✏️ Full CRUD | 🚫 No Access | ✏️ Full CRUD | 🚫 No Access |
| **Delivery Challans (Rule 55)** | ⚡ Platform Level | ✏️ Full CRUD | ✏️ Full CRUD | 👁️ Read-Only | 👁️ Read-Only |
| **Executive Reports & Analytics** | ⚡ Platform Level | 👁️ Full Access | 👁️ Sales KPIs | 👁️ Stock KPIs | 👁️ Financials |

---

## 🛠️ Technology Stack

```text
Frontend Architecture                   Backend Architecture
─────────────────────                   ────────────────────
• React 19 (Hooks, Context, Suspense)   • Node.js 20+ (LTS)
• TypeScript (Strict Mode)              • Express.js (RESTful Core)
• Vite 8 (Ultra-fast HMR Bundler)       • Prisma ORM 5.x (PostgreSQL)
• React Router DOM 7                    • Zod (Strict Runtime Validation)
• Axios (Interceptors & Auth Tokens)    • Pino + Pino-Http (High-speed Logging)
• Pure Vanilla CSS (Curated Tokens)     • Helmet & CORS (Security Hardening)
• Lucide-compatible Custom SVG Engine   • Bcrypt + JSONWebTokens (JWT Auth)
```

---

## 📂 Repository Structure

```text
StockPulse/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Complete schema (16 models, 17 enums, multi-indexes)
│   │   └── seed.ts              # Enterprise seed script with multi-org demo data
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts      # Prisma Client singleton
│   │   │   └── env.ts           # Zod validated environment loader
│   │   ├── middleware/
│   │   │   ├── authenticate.ts  # JWT verification & tenant context injection
│   │   │   ├── authorize.ts     # Role-based access control guard
│   │   │   ├── error-handler.ts # Centralized production error handler
│   │   │   ├── not-found.ts     # 404 handler
│   │   │   └── rate-limiter.ts  # Token-bucket rate limiting
│   │   ├── modules/
│   │   │   ├── auth/            # Authentication & session token management
│   │   │   ├── challans/        # Statutory delivery challan engine
│   │   │   ├── customers/       # CRM 360, ledger, and credit limits
│   │   │   ├── dashboard/       # Aggregated executive KPIs
│   │   │   ├── organizations/   # Tenant profile, members & invite system
│   │   │   ├── payments/        # Plan subscriptions & UTR approval workflows
│   │   │   ├── platform/        # Super Admin management, users, plans & support
│   │   │   ├── products/        # Inventory catalog, stock movements, and BOM
│   │   │   └── reports/         # Operational metrics & CSV export engine
│   │   ├── utils/
│   │   │   ├── app-error.ts     # Structured domain error class
│   │   │   └── logger.ts        # Pino logger configuration
│   │   ├── app.ts               # Express configuration, middlewares, router registry
│   │   └── server.ts            # Server bootstrap & graceful shutdown hooks
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/            # Floating AI Assistant chatbot widget
│   │   │   ├── common/          # SearchBar, Toast, Modal, CommandPalette, Icons
│   │   │   ├── layout/          # SidebarLayout, PlatformLayout, SupportBanner
│   │   │   └── platform/        # OrgInspectorModal, TenantCards, PlanEditor
│   │   ├── hooks/               # useAuth, useToast, useDebounce
│   │   ├── pages/
│   │   │   ├── platform/        # PlatformDashboard, Organizations, Users, Plans, Payments
│   │   │   ├── Dashboard.tsx    # Executive business overview
│   │   │   ├── Customers.tsx    # CRM Lead & Account manager
│   │   │   ├── Products.tsx     # Inventory catalog & Stock in/out
│   │   │   ├── Challans.tsx     # Delivery challan dispatch center
│   │   │   ├── StockTake.tsx    # Physical cycle-counting reconciliation
│   │   │   ├── ProductionAssemblies.tsx # BOM manufacturing assembly
│   │   │   ├── OrganizationSettings.tsx # Business GST profile & team members
│   │   │   ├── BillingSubscriptions.tsx # Plan upgrade & UPI payment portal
│   │   │   └── Reports.tsx      # Stock valuation & movement analytics
│   │   ├── services/            # Axios API wrappers (auth, platform, business)
│   │   ├── types/               # Strict TypeScript interfaces & enums
│   │   ├── index.css            # Complete HSL design token stylesheet
│   │   ├── App.tsx              # Application route tree
│   │   └── main.tsx             # Entry bootstrap
│   ├── .env.example
│   └── package.json
│
├── docker-compose.yml           # Production multi-container composition
├── Dockerfile.backend           # Multi-stage optimized Node.js container
├── Dockerfile.frontend          # Optimized Nginx + React static build
└── README.md                    # System documentation
```

---

## ⚡ Quick Start Guide

### Prerequisites
* **Node.js**: `v20.x` or later
* **npm**: `v10.x` or later
* **PostgreSQL**: `v15.x+` (or a free cloud database instance on [Supabase](https://supabase.com))

---

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/your-org/StockPulse.git
cd StockPulse

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Step 2: Configure Environment Variables

#### Backend (`backend/.env`):
```env
NODE_ENV=development
PORT=5000
DATABASE_URL="postgresql://postgres:your_db_password@db.example.supabase.co:5432/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:your_db_password@db.example.supabase.co:5432/postgres"
JWT_SECRET="super_secret_production_ready_crypto_key_32_bytes"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
```

#### Frontend (`frontend/.env`):
```env
VITE_API_URL="http://localhost:5000/api"
```

---

### Step 3: Database Setup & Enterprise Demo Seeding

From the `backend/` directory, run the automated Prisma migration and seed pipeline:

```bash
cd backend

# Generate Prisma client definitions
npm run prisma:generate

# Push schema directly or apply migrations
npx prisma db push

# Populate with real-world enterprise tenants, products, customers, and challans
npm run seed
```

---

### Step 4: Launch Development Servers

#### Terminal 1 — Backend API Server:
```bash
cd backend
npm run dev
# Server running at: http://localhost:5000
# Health check: http://localhost:5000/api/health
```

#### Terminal 2 — React Frontend:
```bash
cd frontend
npm run dev
# Application accessible at: http://localhost:5173
```

---

### Step 5: Run via Docker (Production Composition)

You can launch the entire stack (Node.js API + Nginx Static Server) using Docker Compose:

```bash
# Build and start all services
docker-compose up --build -d

# Verify container status
docker-compose ps
```
The application will be available at `http://localhost:80` with API traffic automatically proxied to the backend container.

---

## 🔑 Pre-Seeded Test Credentials

All accounts in the development seed are initialized with the default password: **`Admin@123`**

### 1. Platform Super Admin (Global Platform Scope)
| Role | Email | Password | Access Level |
|:---|:---|:---|:---|
| **Platform Super Admin** | `superadmin@stockpulse.io` | `Admin@123` | Global Platform Governance, Tenant Provisioning, Support Impersonation, Plan Matrix |

### 2. Tenant Enterprise: Apex Logistics & Tech Solutions Pvt Ltd
| Role | Name | Email | Password | Primary Workflow |
|:---|:---|:---|:---|:---|
| **ORG_ADMIN** | Mohammed Aarif | `admin@example.com` | `Admin@123` | Organization Management, Member Roles, Billing & Plans |
| **SALES** | Priya Sharma | `sales@example.com` | `Admin@123` | CRM Lead Management, Create Delivery Challans |
| **WAREHOUSE** | Rajesh Verma | `warehouse@example.com` | `Admin@123` | Stock Inward/Outward, BOM Assemblies, Cycle Counts |
| **ACCOUNTS** | Sneha Patel | `accounts@example.com` | `Admin@123` | Customer Ledgers, Financial Reports, Tax Invoices |

### 3. Additional Multi-Tenant Organizations
* **Trident Infotech & Hardware Hub**: `sales@example.com` (Multi-membership user test)
* **Zenith Electronics & Retail Corp**: `amit@zenith.com` (`ORG_ADMIN`)

---

## 🧪 Comprehensive Testing & Verification Workflow

Follow this step-by-step sequence to verify the end-to-end capabilities of StockPulse:

### 1. Platform Super Admin Governance
1. Log in as `superadmin@stockpulse.io` with password `Admin@123`.
2. Navigate to **Enterprise Tenants** (`/platform/organizations`) to inspect active tenants, quotas, and health status.
3. Open the **User Registry** (`/platform/users`) to review all Organization Administrators. Click any organization chip to trigger the **Organization Inspector Modal**.
4. Test the **Support Impersonation Mode** by clicking *Start Support Session* for `Apex Logistics`. Notice the prominent floating session banner, and click *End Support Session* when done.

### 2. Statutory Challan Dispatch & Atomic Stock Locking
1. Log in as `sales@example.com` (Sales Executive).
2. Go to **Customers (CRM)** (`/customers`) and verify customer outstanding balance and credit limits.
3. Navigate to **Delivery Challans** (`/challans`) and click **+ New Challan**.
4. Select a customer and add line items (e.g., *Logitech MX Master 3S*, Quantity: `5`).
5. Save as `DRAFT`. Notice that catalog stock remains unchanged.
6. Click **Confirm Dispatch**. The backend initiates a transaction with row-level locks (`SELECT ... FOR UPDATE`), decrements inventory, captures historical item snapshots, and updates the status to `CONFIRMED`.

### 3. Concurrency & Over-Allocation Safety Test
1. Create a draft challan requesting `500` units of an item with only `20` units in stock.
2. Click **Confirm Dispatch**.
3. The system rejects the transaction with a clear error notification and safely rolls back all operations, ensuring zero data corruption.

### 4. Warehouse Stock Inward & BOM Production
1. Log in as `warehouse@example.com` (Warehouse Supervisor).
2. Go to **Product Catalog** (`/products`) and perform a **Quick Stock Inward** (`+ Inward`).
3. Navigate to **BOM Assemblies** (`/assemblies`) and assemble a finished good bundle. Verify that child component stocks automatically decrement while the finished SKU stock increments.

---

## 📡 API Endpoints Reference

### Identity & Authentication (`/api/auth`)
* `POST /api/auth/login` — Authenticate user and return JWT with tenant memberships.
* `GET /api/auth/me` — Retrieve active session user profile and active organization context.
* `POST /api/auth/switch-org` — Switch active organization context token.

### Platform Super Admin (`/api/platform`)
* `GET /api/platform/overview` — High-level platform KPIs (MRR, total tenants, active users).
* `GET /api/platform/organizations` — List all commercial tenants with plan quotas.
* `POST /api/platform/organizations` — Provision new enterprise organization and Org Admin.
* `PATCH /api/platform/organizations/:id/status` — Update organization lifecycle status.
* `GET /api/platform/users` — List platform users with role filters.
* `POST /api/platform/users` — Provision platform user as Organization Admin.
* `DELETE /api/platform/users/:id` — Permanently delete user and cascade memberships.
* `GET /api/platform/plans` — Commercial plan matrix configuration.
* `POST /api/platform/support/session` — Initiate audited time-bounded impersonation session.

### Organization Management (`/api/organizations`)
* `GET /api/organizations/settings` — Get legal business profile, GSTIN, and contact details.
* `PUT /api/organizations/settings` — Update business profile information.
* `GET /api/organizations/members` — List all team members with assigned roles.
* `POST /api/organizations/members` — Invite new team member with specific role.
* `DELETE /api/organizations/members/:id` — Remove member (self-deletion blocked).

### Statutory Challans (`/api/challans`)
* `GET /api/challans` — List delivery challans with search and status filters.
* `POST /api/challans` — Create new delivery challan in `DRAFT` status.
* `GET /api/challans/:id` — Retrieve full challan details with line item snapshots.
* `POST /api/challans/:id/confirm` — Atomic transaction confirmation & stock deduction.
* `POST /api/challans/:id/cancel` — Cancel delivery challan.

### Inventory & Catalog (`/api/products`)
* `GET /api/products` — List catalog SKUs with stock level indicators.
* `POST /api/products` — Create new inventory product SKU.
* `POST /api/products/:id/stock-movements` — Record manual Stock IN / OUT adjustment.
* `GET /api/products/reorder-warnings` — Products below safety reorder threshold.

---

## 🔒 Production Security & Hardening Guarantees

* **Fail-Fast Request Validation**: All incoming requests are validated against strict Zod schemas before reaching business logic controllers.
* **No Leaked Stack Traces**: Production error handlers sanitize error responses, logging detailed traces internally via Pino while returning safe messages to callers.
* **SQL Injection Immunity**: All queries leverage Prisma ORM with parameterized prepared statements.
* **Password Hashing**: Passwords stored using salted `bcrypt` hashes with cost factor 10.
* **Auditability**: Critical business actions emit structured events into the `AuditLog` collection with actor ID, IP address, user-agent, and payload metadata.

---

## 📄 License & Attribution

Distributed under the **MIT License**. Built with precision for modern B2B supply chain and operational excellence.
