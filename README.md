# Mini ERP + CRM Operations Portal

A complete, production-grade operations portal built for business workflow management. It integrates a customer relationship management (CRM) database, an inventory manager tracking stock adjustments, and a sales delivery challan generator running atomic transaction-safe operations.

---

## Technical Stack

*   **Frontend**: React 19, TypeScript, Vite, React Router, Axios, Plain CSS (Tailored HSL design system).
*   **Backend**: Node.js, Express, TypeScript, REST API.
*   **Validation**: Zod (Fail-fast request contracts).
*   **ORM**: Prisma.
*   **Database**: Supabase PostgreSQL.
*   **Authentication**: JSON Web Tokens (JWT) + Bcrypt password hashing.

---

## System Architecture

The application is structured as a **Modular Monolith** to maximize maintenance simplicity, speed development, and provide clean boundaries without the overhead of microservices or message queues.

```
React Portal (Vite Frontend)
          │
          │  REST API (Axios + Authorization Interceptor)
          ▼
    Express Router
          │
          ▼
     Controllers (HTTP adapters, payload validation via Zod)
          │
          ▼
     Services (Business logic, transactions, row-level locks)
          │
          ▼
    Prisma Client (ORM query layer)
          │
          ▼
   Supabase PostgreSQL (Cloud Database)
```

---

## Folder Structure

```text
StockPulse/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (6 models, 5 enums)
│   │   └── seed.ts              # Idempotent development credentials seeder
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts           # Zod-validated environment config
│   │   │   └── database.ts      # PrismaClient instance singleton
│   │   ├── middleware/
│   │   │   ├── authenticate.ts  # JWT validation & req.user injection
│   │   │   ├── authorize.ts     # Role-based middleware gates
│   │   │   ├── error-handler.ts # Production generic error formatter
│   │   │   └── not-found.ts     # Catch-all missing endpoints
│   │   ├── modules/
│   │   │   ├── auth/            # Auth controller, service, schemas, routes
│   │   │   ├── customers/       # CRM controller, service, schemas, routes
│   │   │   ├── products/        # Inventory controller, service, schemas, routes
│   │   │   └── challans/        # Challan controller, service, schemas, routes
│   │   ├── app.ts               # App setups (CORS, body limiters)
│   │   └── server.ts            # Bootloader & graceful shutdown listeners
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # Route guards & shared components
│   │   │   └── layout/          # Admin sidebar wrapper layout
│   │   ├── hooks/               # useAuth authentication context hook
│   │   ├── pages/               # Login, Dashboard, CRM, Inventory, Challans
│   │   ├── services/            # Axios API wrappers (auth, customer, product, challan)
│   │   ├── types/               # Type-safe entity interfaces
│   │   ├── App.tsx              # Router tree maps
│   │   └── main.tsx             # Entry hook
│   ├── .env.example
│   └── package.json
│
├── postman/
│   ├── mini-erp.postman_collection.json # Production evaluator test suite
│   └── Mini-ERP-CRM.postman_collection.json
└── README.md
```

---

## Roles & Permissions Matrix

| Feature | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|:---|:---:|:---:|:---:|:---:|
| **Dashboard** | Read-Only | Read-Only | Read-Only | Read-Only |
| **Customer CRM** | Full CRUD | Full CRUD | No Access | Read-Only |
| **Customer Follow-up** | Create | Create | No Access | No Access |
| **Product catalog** | Full CRUD | Read-Only | Full CRUD | Read-Only |
| **Stock Adjustments (IN/OUT)**| Create | No Access | Create | No Access |
| **Challans** | Full CRUD | Full CRUD | No Access | Read-Only |

---

## Local Setup

### 1. Clone & Dependencies
```bash
git clone <your-repo-url>
cd StockPulse

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Variables
Copy `.env.example` configurations.

**Backend (`backend/.env`)**:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@<host>:<port>/postgres
JWT_SECRET=super_secret_dev_passphrase_change_in_production
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
```

**Frontend (`frontend/.env`)**:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Database Migration & Seeding
From the `backend/` directory:
```bash
# Generate the local Prisma Client client definitions
npm run prisma:generate

# Execute migration scripts against the Postgres database
npx prisma migrate dev --name init

# Populate mock test users
npm run seed
```

### 4. Running the Servers
**Backend**:
```bash
cd backend
npm run dev
```

**Frontend**:
```bash
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Running with Docker (Bonus Feature)
You can build and spin up the entire multi-container environment locally via Docker Compose:
```bash
# Build and run the services
docker-compose up --build
```
This serves the React frontend (via Nginx) on port `80`, and runs the Express API server on port `5000` (which the Nginx proxy automatically talks to). Ensure you define your environment variables (like `DATABASE_URL` and `JWT_SECRET`) in your terminal or a root `.env` file first.

---

## API Documentation & Postman Collection

Evaluators can import [postman/mini-erp.postman_collection.json](file:///c:/Users/Mohmmed%20Aarif/projects/fundsRoom/StockPulse/postman/mini-erp.postman_collection.json) to quickly test the entire backend API.

### Workflow Testing Sequence
1.  **POST `/api/auth/login`**: Authenticate using role credentials (e.g. `sales@example.com` / `Password123!`). Copy the returned `token`.
2.  **Collection Variable**: Paste the JWT in the Postman `authToken` collection variable. All subsequent requests automatically inherit this header.
3.  **POST `/api/customers`**: Create a customer (stores Name, Mobile, Email, Business Name, address, customerType, status).
4.  **POST `/api/products`**: Log in as `admin@example.com` (requires WAREHOUSE/ADMIN), define a new inventory item with initial stock `10`.
5.  **POST `/api/products/:id/stock-movements`**: perform a `Stock IN` of `20` items. Verify stock levels rise to `30`.
6.  **POST `/api/challans`**: Log back in as `sales@example.com`. Create a new challan in `DRAFT` status with the product and quantity `10`.
7.  **GET `/api/products/:id`**: Check the product stock. Verify it remains `30` (DRAFT challans do not touch inventory).
8.  **POST `/api/challans/:id/confirm`**: Click Confirm. State transitions to `CONFIRMED`.
9.  **GET `/api/products/:id`**: Verify stock levels decreased to `20`.
10. **GET `/api/products/:id/stock-movements`**: Verify a new audit log `OUT` movement has been recorded with reason and creator details.

### Insufficient Stock Verification
*   Create a draft challan requesting quantity `25` (when available stock is `20`).
*   Click Confirm. The transaction fails with `400 Bad Request` and rolls back all database operations, leaving stock level at `20`.

---

## Technical Design Decisions

### 1. Stock Transaction Safety
To prevent double-booking and concurrent order races:
*   Confirming a delivery challan aggregates items by ID and locks affected rows inside a single database transaction using `SELECT ... FOR UPDATE`:
    ```sql
    SELECT * FROM products WHERE id IN (...) FOR UPDATE
    ```
*   Checks inventory and decrements stock levels inside the isolated lock.
*   Writes Audit Log `StockMovement` files.
*   Updates Challan status to `CONFIRMED`.
*   If any single item is short of stock, the entire transaction rolls back atomically.

### 2. Product Snapshots
When a Challan draft is created, it copies the current product name, SKU, and unit price into the `ChallanItem` table. This creates a historical snapshot so that future catalog edits (like a price increase or renaming) do not alter past delivery records.

### 3. Modular Monolith Architecture
Keeps the code clean and maintains high boundaries. Each domain (Auth, Customers, Products, Challans) encapsulates its schema, validation, logic, and router.

---

## Deployment Settings

*   **Frontend**: Vercel. Point Vite root folder to `/frontend` with build settings `npm run build` and environment variable `VITE_API_URL` pointing to Render API server URL.
*   **Backend**: Render. Point base folder to `/backend` with start command `npm start`, build command `npm install && npm run build`, and environment variables (`NODE_ENV=production`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL` pointing to Vercel page).
*   **Database**: Supabase PostgreSQL. Configure environment credentials in Render.

---

## Test Credentials

Use these development credentials to test all portal workflows:

| Role | Username | Password |
|:---|:---|:---|
| **ADMIN** | `admin@example.com` | `Password123!` |
| **SALES** | `sales@example.com` | `Password123!` |
| **WAREHOUSE** | `warehouse@example.com` | `Password123!` |
| **ACCOUNTS** | `accounts@example.com` | `Password123!` |

*These are pre-seeded development credentials only. Never use them in production settings.*

---

## Known Limitations

*   **No Invoice Generation**: Billing transactions must be handled in downstream ERP components.
*   **No Purchase Orders Module**: Inbound items are added manually via the Stock IN movement panels.
*   **No Product Image uploads**: Product profiles use text description metadata and storage locations only.
*   **No CI/CD pipelines**: Deployment is initiated manually on Git commit pushes.
