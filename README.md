# Mini ERP + CRM Operations Portal

A full-stack Operations Portal for managing customers, products, inventory, and delivery challans. Built as a modular monolith with a clean separation between the React frontend and the Express/Prisma backend.

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, React Router, Axios |
| Backend    | Node.js, TypeScript, Express.js                 |
| Validation | Zod                                             |
| ORM        | Prisma                                          |
| Database   | Supabase PostgreSQL                             |
| Auth       | JWT (`jsonwebtoken`) + bcrypt                   |

---

## Architecture

```
Frontend (React + Vite)
        │
        │  HTTP / REST
        ▼
Express Router
        │
        ▼
Controller  ─── validates request (Zod)
        │
        ▼
Service     ─── business logic
        │
        ▼
Prisma Client
        │
        ▼
Supabase PostgreSQL
```

No microservices. No message queues. No unnecessary abstraction layers.

---

## Folder Structure

```
StockPulse/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma       # Database schema (6 models, 5 enums)
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts           # Env validation (fail-fast via Zod)
│   │   │   └── database.ts      # Singleton PrismaClient
│   │   ├── middleware/
│   │   │   ├── error-handler.ts # Centralized error handler
│   │   │   └── not-found.ts     # 404 catch-all
│   │   ├── modules/
│   │   │   ├── auth/            # Phase 2
│   │   │   ├── customers/       # Phase 2
│   │   │   ├── products/        # Phase 2
│   │   │   └── challans/        # Phase 2
│   │   ├── utils/
│   │   ├── app.ts               # Express app setup
│   │   └── server.ts            # Entry point + graceful shutdown
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/            # Axios API clients
│   │   ├── hooks/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── postman/
│   └── Mini-ERP-CRM.postman_collection.json
└── README.md
```

---

## Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A **Supabase** project with a PostgreSQL database

---

## Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd StockPulse
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

---

## Environment Setup

### Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
JWT_SECRET=<generate-a-strong-random-secret>
JWT_EXPIRES_IN=1d
```

### Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

> ⚠️ **Never commit `.env` files.** They are listed in all `.gitignore` files.

---

## Supabase Database Setup

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Navigate to **Project Settings → Database → Connection string → URI**.
3. Copy the connection string and paste it as `DATABASE_URL` in `backend/.env`.
4. Make sure your Supabase project is not paused (free tier pauses after 7 days of inactivity).

---

## Prisma Setup

From the `backend/` directory:

```bash
# Generate the Prisma client (run after any schema change)
npm run prisma:generate

# Apply the initial migration to Supabase
npm run prisma:migrate
# When prompted, name the migration: init

# Optional: open Prisma Studio to browse your database
npm run prisma:studio
```

---

## Development Commands

### Backend

```bash
cd backend

npm run dev          # Start dev server with hot reload (ts-node-dev)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output from dist/
```

### Frontend

```bash
cd frontend

npm run dev          # Start Vite dev server (default: http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
```

---

## Health Endpoint

Verify the backend is running:

```bash
curl http://localhost:5000/api/health
```

Expected response (`HTTP 200`):

```json
{ "status": "ok" }
```

---

## Database Schema

| Model          | Description                                        |
|----------------|----------------------------------------------------|
| `User`         | Portal users with role-based access (Phase 2 auth) |
| `Customer`     | CRM customers/leads                                |
| `Product`      | Inventory items / SKUs                             |
| `StockMovement`| Audit log of stock changes (IN / OUT)              |
| `Challan`      | Delivery challan header                            |
| `ChallanItem`  | Challan line items with product snapshots          |

---

## Postman Collection

Import `postman/Mini-ERP-CRM.postman_collection.json` into Postman.

Set the `baseUrl` collection variable to `http://localhost:5000/api` for local development.

---

## Authentication (Phase 2)

### Architecture

Application-level JWT authentication — **no Supabase Auth**. Supabase is used only as the PostgreSQL provider.

```
POST /api/auth/login
        │
        ▼
Zod validates body
        │
        ▼
Prisma finds user by email
        │
        ▼
bcrypt compares password hash
        │
        ▼
jsonwebtoken signs JWT (userId + role)
        │
        ▼
Returns { token, user }  ← passwordHash never included
```

Protected routes use the `authenticate` middleware which verifies the JWT **without a database call** (stateless). The `authorize` middleware then checks the role.

### User Roles

| Role | Description |
|------|-------------|
| `ADMIN` | Full access — manages users and system configuration |
| `SALES` | Access to customers and challans |
| `WAREHOUSE` | Access to products and inventory |
| `ACCOUNTS` | Access to financial data and reports |

### Development Seed Credentials

> ⚠️ **DEVELOPMENT ONLY** — These credentials are for local development and testing. Never use them in production.

| Role | Email | Password |
|------|-------|----------|
| ADMIN | `admin@example.com` | `Password123!` |
| SALES | `sales@example.com` | `Password123!` |
| WAREHOUSE | `warehouse@example.com` | `Password123!` |
| ACCOUNTS | `accounts@example.com` | `Password123!` |

Seed the database:

```bash
cd backend
npx prisma db seed
```

The seed is idempotent — safe to run multiple times.

### Auth Endpoints

#### POST /api/auth/login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "Password123!"}'
```

Success (`200`):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cmsk48qjd0000dsy3rlp5qyqc",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

Invalid credentials (`401`):
```json
{ "status": "error", "message": "Invalid email or password." }
```

#### GET /api/auth/me

Returns the authenticated user's profile. Requires a valid Bearer token.

```bash
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <your-token>"
```

Success (`200`):
```json
{
  "user": {
    "id": "cmsk48qjd0000dsy3rlp5qyqc",
    "name": "Admin User",
    "email": "admin@example.com",
    "role": "ADMIN"
  }
}
```

### Authorization Header Format

All protected routes require:

```
Authorization: Bearer <jwt-token>
```

### 401 vs 403

| Code | Meaning | When |
|------|---------|------|
| `401 Unauthorized` | Not authenticated | Token missing, expired, malformed, or invalid |
| `403 Forbidden` | Authenticated but insufficient role | Valid token but role not in the allowed list |

---

## Postman Collection

Import `postman/Mini-ERP-CRM.postman_collection.json` into Postman.

1. Set the `baseUrl` collection variable to `http://localhost:5000/api`.
2. Run **POST /auth/login** — the test script automatically saves the token to `{{authToken}}`.
3. All subsequent requests use `{{authToken}}` automatically.

---

## Customer CRM Module (Phase 3)

### Endpoint Reference

All endpoints are prefixed with `/api`.

#### 1. POST /customers
Create a new customer profile.
*   **Authorization**: Requires `ADMIN` or `SALES` role.
*   **Request Body**:
    ```json
    {
      "name": "ABC Traders",
      "mobile": "9876543210",
      "email": "abc@example.com",
      "businessName": "ABC Traders Pvt Ltd",
      "gstNumber": "22AAAAA0000A1Z5", // Optional, unique
      "customerType": "WHOLESALE", // RETAIL, WHOLESALE, DISTRIBUTOR
      "address": "Ludhiana, Punjab",
      "status": "LEAD", // LEAD, ACTIVE, INACTIVE
      "followUpDate": "2026-08-15", // Optional, YYYY-MM-DD
      "notes": "Interested in monthly supply" // Optional
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "data": {
        "id": "cmsk48qjd0000dsy3rlp5qyqc",
        "name": "ABC Traders",
        "mobile": "9876543210",
        "email": "abc@example.com",
        "businessName": "ABC Traders Pvt Ltd",
        "customerType": "WHOLESALE",
        "gstNumber": "22AAAAA0000A1Z5",
        "address": "Ludhiana, Punjab",
        "status": "LEAD",
        "followUpDate": "2026-08-15T00:00:00.000Z",
        "notes": "Interested in monthly supply",
        "createdAt": "2026-08-08T09:00:12.000Z",
        "updatedAt": "2026-08-08T09:00:12.000Z"
      }
    }
    ```

#### 2. GET /customers
List customers with support for pagination, search, and filtering.
*   **Authorization**: Requires `ADMIN`, `SALES`, `WAREHOUSE`, or `ACCOUNTS` role.
*   **Query Parameters**:
    *   `page` (default: 1): Integer $\ge 1$
    *   `limit` (default: 10, max: 100): Integer $\ge 1$
    *   `search`: Search string matched case-insensitively across `name`, `mobile`, `email`, and `businessName`
    *   `status`: Filter by customer status (`LEAD`, `ACTIVE`, `INACTIVE`)
    *   `customerType`: Filter by customer type (`RETAIL`, `WHOLESALE`, `DISTRIBUTOR`)
*   **Success Response** (`200 OK`):
    ```json
    {
      "data": [
        {
          "id": "cmsk48qjd0000dsy3rlp5qyqc",
          "name": "ABC Traders",
          "mobile": "9876543210",
          "email": "abc@example.com",
          "businessName": "ABC Traders Pvt Ltd",
          "customerType": "WHOLESALE",
          "gstNumber": "22AAAAA0000A1Z5",
          "address": "Ludhiana, Punjab",
          "status": "LEAD",
          "followUpDate": "2026-08-15T00:00:00.000Z",
          "notes": "Interested in monthly supply",
          "createdAt": "2026-08-08T09:00:12.000Z",
          "updatedAt": "2026-08-08T09:00:12.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 1,
        "totalPages": 1
      }
    }
    ```

#### 3. GET /customers/:id
Retrieve details of a single customer.
*   **Authorization**: Requires `ADMIN`, `SALES`, `WAREHOUSE`, or `ACCOUNTS` role.
*   **Success Response** (`200 OK`):
    ```json
    {
      "data": {
        "id": "cmsk48qjd0000dsy3rlp5qyqc",
        "name": "ABC Traders",
        ...
      }
    }
    ```
*   **Error Response** (`404 Not Found`):
    ```json
    {
      "status": "error",
      "message": "Customer with id \"cmsk48qjd0000dsy3rlp5qyqc\" not found."
    }
    ```

#### 4. PUT /customers/:id
Update fields of an existing customer (partial updates are supported).
*   **Authorization**: Requires `ADMIN` or `SALES` role.
*   **Request Body**: (Any subset of validation fields, excluding `id` and `createdAt`)
*   **Success Response** (`200 OK`):
    ```json
    {
      "data": {
        "id": "cmsk48qjd0000dsy3rlp5qyqc",
        "name": "ABC Traders Updated",
        ...
      }
    }
    ```

#### 5. POST /customers/:id/follow-ups
Add or update follow-up date and notes for a customer.
*   **Authorization**: Requires `ADMIN` or `SALES` role.
*   **Request Body**:
    ```json
    {
      "followUpDate": "2026-08-20", // YYYY-MM-DD
      "notes": "Customer requested a quotation."
    }
    ```
*   **Success Response** (`200 OK`):
    ```json
    {
      "data": {
        "id": "cmsk48qjd0000dsy3rlp5qyqc",
        "name": "ABC Traders Updated",
        "followUpDate": "2026-08-20T00:00:00.000Z",
        "notes": "Customer requested a quotation.",
        ...
      }
    }
    ```

### Error Scenarios & Status Codes
*   `400 Bad Request`: Input validation failed (e.g., malformed email, invalid enum values, invalid date format) or duplicate unique keys (GST / Email).
*   `401 Unauthorized`: Missing or invalid bearer token.
*   `403 Forbidden`: Authenticated user does not have permissions (e.g. WAREHOUSE role trying to create/edit customer).
*   `404 Not Found`: Customer ID not found.

---

## Product & Inventory Module (Phase 4)

### Endpoint Reference

All endpoints are prefixed with `/api`.

#### 1. POST /products
Create a new product profile.
*   **Authorization**: Requires `ADMIN` or `WAREHOUSE` role.
*   **Request Body**:
    ```json
    {
      "name": "Wireless Mouse",
      "sku": "MOU-001",
      "category": "Computer Accessories",
      "unitPrice": 499.00,
      "currentStock": 50,
      "minimumStock": 10,
      "warehouseLocation": "WH-A-01"
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "data": {
        "id": "cmsk48qjd0000dsy3rlp5qyqd",
        "name": "Wireless Mouse",
        "sku": "MOU-001",
        "category": "Computer Accessories",
        "unitPrice": 499,
        "currentStock": 50,
        "minimumStock": 10,
        "warehouseLocation": "WH-A-01",
        "createdAt": "2026-08-08T10:40:00.000Z",
        "updatedAt": "2026-08-08T10:40:00.000Z"
      }
    }
    ```

#### 2. GET /products
List products with pagination, search, and filtering.
*   **Authorization**: Requires `ADMIN`, `SALES`, `WAREHOUSE`, or `ACCOUNTS` role.
*   **Query Parameters**:
    *   `page` (default: 1): Integer $\ge 1$
    *   `limit` (default: 10, max: 100): Integer $\ge 1$
    *   `search`: Case-insensitive match across `name`, `sku`, and `category`
    *   `category`: Filter by product category
    *   `lowStock`: Filter low-stock products (`currentStock <= minimumStock`) if set to `true`
*   **Success Response** (`200 OK`):
    ```json
    {
      "data": [...],
      "pagination": {
        "page": 1,
        "limit": 10,
        "total": 25,
        "totalPages": 3
      }
    }
    ```

#### 3. GET /products/:id
Retrieve single product details.
*   **Authorization**: Accessible to all authenticated roles.
*   **Success Response** (`200 OK`):
    ```json
    { "data": { "id": "...", "name": "Wireless Mouse", ... } }
    ```

#### 4. PUT /products/:id
Update product profile.
*   **Authorization**: Requires `ADMIN` or `WAREHOUSE` role.
*   **Important Rules**: Direct updates to `currentStock` are stripped and rejected. Stock can only be altered via stock movements or challan confirmation.
*   **Success Response** (`200 OK`):
    ```json
    { "data": { "id": "...", "name": "Wireless Mouse Premium", ... } }
    ```

#### 5. POST /products/:id/stock-movements
Create a stock movement (IN or OUT) and adjust product stock level.
*   **Authorization**: Requires `ADMIN` or `WAREHOUSE` role.
*   **Rules**:
    *   `type`: `IN` or `OUT`
    *   `quantity`: Integer $> 0$
    *   `reason`: Non-empty string
    *   If type is `OUT`, quantity must be $\le$ `currentStock`, otherwise fails with `400 Bad Request`.
*   **Success Response** (`201 Created`):
    ```json
    {
      "message": "Stock movement recorded successfully.",
      "data": {
        "product": { "id": "...", "currentStock": 45, ... },
        "movement": { "id": "...", "type": "OUT", "quantity": 5, "reason": "Damaged goods", "createdBy": "..." }
      }
    }
    ```

#### 6. GET /products/:id/stock-movements
List stock movements for a product, sorted newest first.
*   **Authorization**: Accessible to all authenticated roles.
*   **Success Response** (`200 OK`):
    ```json
    {
      "data": [
        {
          "id": "...",
          "quantity": 5,
          "type": "OUT",
          "reason": "Damaged goods",
          "createdAt": "...",
          "user": { "id": "...", "name": "Warehouse User", "email": "warehouse@example.com", "role": "WAREHOUSE" }
        }
      ],
      "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
    }
    ```

---

## Sales Challan Module (Phase 5)

### Endpoint Reference

All endpoints are prefixed with `/api`.

#### 1. POST /challans
Create a new sales challan in `DRAFT` status.
*   **Authorization**: Requires `ADMIN` or `SALES` role.
*   **Important Rules**:
    *   Does NOT reduce product stock or create stock movements.
    *   Copies current product name, SKU, and price snapshot into the items list to preserve historical invoice correctness.
    *   Generates a sequential readable challan number (e.g. `CH-000001`).
*   **Request Body**:
    ```json
    {
      "customerId": "cust-uuid-1234",
      "items": [
        { "productId": "prod-uuid-keyboard", "quantity": 5 },
        { "productId": "prod-uuid-mouse", "quantity": 2 }
      ]
    }
    ```
*   **Success Response** (`201 Created`):
    ```json
    {
      "data": {
        "id": "challan-uuid-9999",
        "challanNumber": "CH-000001",
        "status": "DRAFT",
        "totalQuantity": 7,
        "customerId": "cust-uuid-1234",
        "createdBy": "sales-uuid",
        "items": [
          {
            "id": "item-uuid-1",
            "productId": "prod-uuid-keyboard",
            "productName": "Wireless Keyboard",
            "sku": "KEY-123",
            "unitPrice": 1299.00,
            "quantity": 5
          },
          ...
        ]
      }
    }
    ```

#### 2. GET /challans
List all challans, sorted newest first.
*   **Authorization**: Accessible to all authenticated roles.
*   **Success Response** (`200 OK`):
    ```json
    {
      "data": [...],
      "pagination": { "page": 1, "limit": 10, "total": 20, "totalPages": 2 }
    }
    ```

#### 3. GET /challans/:id
Retrieve single challan details with snapshot items and customer info.
*   **Authorization**: Accessible to all authenticated roles.
*   **Success Response** (`200 OK`):
    ```json
    {
      "data": {
        "id": "...",
        "challanNumber": "CH-000001",
        "status": "DRAFT",
        "customer": { "id": "...", "name": "ABC Traders" },
        "items": [...]
      }
    }
    ```

#### 4. POST /challans/:id/confirm
Confirm a draft challan.
*   **Authorization**: Requires `ADMIN` or `SALES` role.
*   **Transactional stock check**:
    1. Re-locks and checks product stock inside an atomic transaction.
    2. If stock is sufficient, decrements product `currentStock` and creates one `OUT` stock movement per item.
    3. Status is updated to `CONFIRMED`.
    4. If stock is insufficient, the entire transaction rolls back.
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Challan confirmed successfully.",
      "data": {
        "id": "...",
        "status": "CONFIRMED",
        "totalQuantity": 7,
        "items": [...]
      }
    }
    ```
*   **Error Response** (`400 Bad Request`):
    ```json
    {
      "status": "error",
      "message": "Insufficient stock for product: Wireless Keyboard"
    }
    ```

#### 5. POST /challans/:id/cancel
Cancel a draft challan.
*   **Authorization**: Requires `ADMIN` or `SALES` role.
*   **Rules**: Only `DRAFT` challans can be cancelled. Does NOT modify stock or write stock movements. `CONFIRMED` challans cannot be cancelled.
*   **Success Response** (`200 OK`):
    ```json
    {
      "message": "Challan cancelled successfully.",
      "data": {
        "id": "...",
        "status": "CANCELLED"
      }
    }
    ```

---

## Roadmap

- **Phase 1** ✅ — Project foundation
- **Phase 2** ✅ — Authentication (JWT + bcrypt)
- **Phase 3** ✅ — Customer CRM Backend Module
- **Phase 4** ✅ — Product & Inventory modules
- **Phase 5** ✅ — Sales Challan Backend Module
- **Phase 6** — Reports & dashboard
