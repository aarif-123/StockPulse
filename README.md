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
| Auth       | JWT + bcrypt *(Phase 2)*                        |

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

## Roadmap

- **Phase 1** ✅ — Project foundation (this phase)
- **Phase 2** — Authentication (JWT + bcrypt)
- **Phase 3** — Customer & Product CRUD
- **Phase 4** — Inventory management & stock movements
- **Phase 5** — Challan creation & management
- **Phase 6** — Reports & dashboard
