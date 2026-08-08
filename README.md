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

## Roadmap

- **Phase 1** ✅ — Project foundation
- **Phase 2** ✅ — Authentication (JWT + bcrypt)
- **Phase 3** — Customer & Product CRUD
- **Phase 4** — Inventory management & stock movements
- **Phase 5** — Challan creation & management
- **Phase 6** — Reports & dashboard
