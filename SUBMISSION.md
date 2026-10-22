# VyaaparSync - Mini ERP + CRM Operations Portal

## 1. Executive Summary

VyaaparSync is a full-stack Mini ERP + CRM Operations Portal that manages customer relationships, product inventory, and sales delivery challans through a role-based web application.

The system implements four distinct user roles (ADMIN, SALES, WAREHOUSE, ACCOUNTS) with granular permission enforcement on every API route and every frontend page. Stock changes are only ever made through explicit inventory operations or challan confirmation, never through a direct product edit. Challan confirmation executes inside a Prisma transaction with a raw SELECT FOR UPDATE row-level lock to prevent concurrent double-booking.

The application is fully deployed:

| Layer | Platform | Status |
|---|---|---|
| Frontend | Vercel | Live |
| Backend | Render | Live |
| Database | Supabase PostgreSQL | Live |

---

## 2. Project Links

| Resource | Link |
|---|---|
| GitHub Repository | https://github.com/aarif-123/StockPulse |
| Live Frontend | https://stock-pulse-psi-seven.vercel.app |
| Live Backend API | INSERT ACTUAL RENDER URL |
| Backend Health | INSERT ACTUAL RENDER URL /api/health |
| Postman Collection | postman/mini-erp.postman_collection.json (in repository) |

Note: The Render backend URL was not embedded in any repository file. Insert the live Render service URL before submission.

---

## 3. Requirements Coverage

| Requirement | Implementation | Status |
|---|---|---|
| JWT-based authentication | POST /api/auth/login - bcrypt verify - jsonwebtoken sign | OK |
| Password hashing | bcrypt, 12 salt rounds in seed | OK |
| Four roles: ADMIN SALES WAREHOUSE ACCOUNTS | Role enum in Prisma schema; enforced in every route | OK |
| Role-based API access control | authenticate + authorize middleware on all protected routes | OK |
| Protected frontend routes | ProtectedRoute component with allowedRoles in React | OK |
| Customer CRUD | POST/GET/PUT /api/customers | OK |
| Customer search | Case-insensitive across name, mobile, email, businessName | OK |
| Customer status/type filter | Query params status, customerType on list endpoint | OK |
| Customer pagination | page + limit with totalPages on all list endpoints | OK |
| Follow-up notes | POST /api/customers/:id/follow-ups - updates followUpDate + notes | OK |
| Product CRUD | POST/GET/PUT /api/products | OK |
| Product search | Case-insensitive across name, sku, category | OK |
| Product category filter | category query param on list endpoint | OK |
| Low-stock filter | lowStock=true; compares currentStock <= minimumStock | OK |
| Stock not modifiable via product update | updateProduct schema omits currentStock | OK |
| Stock IN / OUT movements | POST /api/products/:id/stock-movements | OK |
| Negative-stock protection (manual) | createStockMovement checks currentStock < quantity before OUT | OK |
| Stock movement history | GET /api/products/:id/stock-movements paginated | OK |
| Sales challan creation DRAFT | POST /api/challans - creates DRAFT, does not touch stock | OK |
| Automatic challan number | Generated CH-000001 format inside transaction | OK |
| Multiple line items | items array; stored in challan_items table | OK |
| Product snapshot on creation | productName, sku, unitPrice copied to ChallanItem | OK |
| DRAFT to CONFIRMED | POST /api/challans/:id/confirm | OK |
| Stock deduction on confirmation | Atomic transaction deducts currentStock per item | OK |
| Negative-stock protection on confirm | 400 if any product has insufficient stock | OK |
| OUT movement on confirmation | One StockMovement per challan item on confirm | OK |
| Row-level locking | SELECT FOR UPDATE on products rows via executeRawUnsafe | OK |
| Transaction rollback on failure | Entire Prisma transaction rolls back if stock check fails | OK |
| DRAFT to CANCELLED | POST /api/challans/:id/cancel | OK |
| Cancel does not affect stock | cancelChallan only updates status | OK |
| Challan list + pagination | GET /api/challans with page/limit | OK |
| REST API | Express router; all endpoints return JSON | OK |
| Zod input validation | All inputs through Zod schemas; first error as 400 | OK |
| Centralized error handling | error-handler.ts; safe messages to client | OK |
| Health check endpoint | GET /api/health returns ok | OK |
| Responsive frontend | React 19 + Vite; custom CSS HSL design system | OK |
| Role-aware UI navigation | ProtectedRoute hides pages based on role | OK |
| Frontend to backend | Axios with Bearer interceptor + 401 redirect | OK |
| Deployment Frontend | Vercel with vercel.json SPA rewrites | OK |
| Deployment Backend | Render with node dist/server.js | OK |
| Deployment Database | Supabase PostgreSQL | OK |
| Postman collection | mini-erp.postman_collection.json with auto-token | OK |
| Test credentials | 4 roles seeded via prisma/seed.ts | OK |
| Docker support | docker-compose.yml + Dockerfiles | OK |
| CORS | Restricted to FRONTEND_URL in production | OK |
| Graceful shutdown | SIGTERM/SIGINT handlers | OK |
| Env validation at startup | Zod schema in config/env.ts | OK |
---

## 4. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 19.x |
| Frontend build tool | Vite | 8.x |
| Frontend routing | React Router DOM | 7.x |
| Frontend HTTP client | Axios | 1.7.x |
| Frontend language | TypeScript | ~6.0 |
| Frontend linter | oxlint | 1.x |
| Backend runtime | Node.js | 18+ LTS |
| Backend framework | Express | 4.x |
| Backend language | TypeScript | 5.7.x |
| ORM | Prisma | 5.22.x |
| Database | PostgreSQL via Supabase | -- |
| Authentication | jsonwebtoken | 9.x |
| Password hashing | bcrypt | 6.x |
| Validation | Zod | 3.24.x |
| Hosting Frontend | Vercel | -- |
| Hosting Backend | Render | -- |
| Database hosting | Supabase | -- |
| Containerisation | Docker + Docker Compose | -- |

---

## 5. System Architecture

```
React 19 (Vite + TypeScript)
          |
          |  REST API via Axios, Authorization: Bearer <JWT>
          v
    Express Router
          |
          v
    authenticate middleware   <- verifies JWT, injects req.user
          |
          v
    authorize middleware      <- checks role; 403 if not permitted
          |
          v
    Zod schema validation     <- controller parses request body/query
          |
          v
    Controller                <- thin HTTP adapter; delegates to service
          |
          v
    Service                   <- business logic, Prisma transactions
          |
          v
    Prisma Client (ORM)
          |
          v
    Supabase PostgreSQL
```

Design pattern: Modular Monolith. Each domain (auth, customers, products, challans) owns its own routes, controller, service, and Zod schemas. Cross-cutting concerns (authentication, authorization, error handling) are in shared middleware.

Error handling: A centralized errorHandler Express middleware intercepts all errors. Operational errors expose their message; programmer errors return a generic "An unexpected error occurred." Stack traces are logged internally only.

---

## 6. Database Design

### Models (from backend/prisma/schema.prisma)

```
users
  id (cuid PK), name, email (unique), passwordHash, role (enum)
  -> challans (FK), -> stock_movements (FK)

customers
  id (cuid PK), name, mobile, email (unique), businessName
  address, city, state, pincode, gstin (unique)
  type (enum), status (enum), followUpDate, notes
  -> challans (FK)

products
  id (cuid PK), name, sku (unique), category
  unitPrice (Decimal 12,2), currentStock (Int), minimumStock (Int)
  warehouseLocation
  -> stock_movements (FK)

stock_movements
  id (cuid PK), productId (FK), quantity (Int)
  type (IN or OUT), reason, createdAt, createdBy (FK users)

challans
  id (cuid PK), challanNumber (unique, format CH-000001)
  customerId (FK), status (DRAFT|CONFIRMED|CANCELLED)
  totalQuantity (Int), createdBy (FK users)
  -> challan_items (cascade delete)

challan_items
  id (cuid PK), challanId (FK, onDelete Cascade), productId
  productName [snapshot], sku [snapshot], unitPrice [snapshot]
  quantity (Int)
```

### Enums

| Enum | Values |
|---|---|
| Role | ADMIN, SALES, WAREHOUSE, ACCOUNTS |
| CustomerType | RETAIL, WHOLESALE, DISTRIBUTOR |
| CustomerStatus | LEAD, ACTIVE, INACTIVE |
| StockMovementType | IN, OUT |
| ChallanStatus | DRAFT, CONFIRMED, CANCELLED |

### Migrations

- 20260808081319_init - initial schema
- 20260808090012_add_customer_crm_fields - CRM field additions

---

## 7. Authentication and RBAC

### Login flow

1. Client sends POST /api/auth/login with email and password.
2. Zod validates the request body; 400 on invalid format.
3. loginUser service fetches the user by email.
4. bcrypt.compare runs against the stored passwordHash. If the user does not exist, a dummy hash is compared to prevent timing-based user enumeration.
5. On success: signToken creates a JWT containing userId and role; token and passwordHash-free user object returned.
6. Client stores token in localStorage and attaches it as "Authorization: Bearer <token>" on subsequent requests.

### JWT verification

The authenticate middleware is stateless - it does not query the database. Verifies JWT signature and attaches { userId, role } to req.user.

- Expired token: 401 "Token has expired. Please log in again."
- Missing/invalid token: 401 "Authentication token is required."

### Role authorization

The authorize middleware reads req.user.role and checks against allowed roles. Wrong role: 403 "You do not have permission to access this resource."

### Seeded test users (prisma/seed.ts - idempotent upsert)

DEVELOPMENT / TEST CREDENTIALS ONLY. Do not use in production.

| Role | Email | Password |
|---|---|---|
| ADMIN | admin@example.com | Password123! |
| SALES | sales@example.com | Password123! |
| WAREHOUSE | warehouse@example.com | Password123! |
| ACCOUNTS | accounts@example.com | Password123! |

### Permission matrix

| Operation | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
|---|:---:|:---:|:---:|:---:|
| Login | Y | Y | Y | Y |
| GET /auth/me | Y | Y | Y | Y |
| Create customer | Y | Y | - | - |
| View customers | Y | Y | Y | Y |
| Update customer | Y | Y | - | - |
| Add follow-up | Y | Y | - | - |
| Create product | Y | - | Y | - |
| View products | Y | Y | Y | Y |
| Update product | Y | - | Y | - |
| Create stock movement | Y | - | Y | - |
| View stock movements | Y | Y | Y | Y |
| Create challan DRAFT | Y | Y | - | - |
| View challans | Y | Y | Y | Y |
| Confirm challan | Y | Y | - | - |
| Cancel challan | Y | Y | - | - |

Source: customer.routes.ts, product.routes.ts, challan.routes.ts, App.tsx

---

## 8. Customer CRM

### Fields

name (required), mobile (required), email (required, unique), businessName (required), address (required), customerType (RETAIL|WHOLESALE|DISTRIBUTOR), status (LEAD|ACTIVE|INACTIVE), gstin (optional, unique), followUpDate (optional YYYY-MM-DD), notes (optional), phone, city, state, pincode.

### API endpoints

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | /api/customers | ADMIN, SALES | Create customer |
| GET | /api/customers | All | List with search/filter/pagination |
| GET | /api/customers/:id | All | Get single customer |
| PUT | /api/customers/:id | ADMIN, SALES | Update customer (partial) |
| POST | /api/customers/:id/follow-ups | ADMIN, SALES | Set follow-up date and notes |

### Search and filtering

Query params: search (case-insensitive across name, mobile, email, businessName), status, customerType, page, limit (max 100).

### Workflow

Create -> List/Search -> Detail -> Update -> Follow-up

---

## 9. Product and Inventory

### Fields

name, sku (unique), category, unitPrice (Decimal), currentStock (Int), minimumStock (Int), warehouseLocation.

### Important constraint

currentStock cannot be modified through a product update (PUT /api/products/:id). The Zod updateProductSchema explicitly omits currentStock. Stock changes only through:

1. POST /api/products/:id/stock-movements (manual IN or OUT)
2. Challan confirmation (automatic OUT)

### API endpoints

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | /api/products | ADMIN, WAREHOUSE | Create product |
| GET | /api/products | All | List with search/filter/pagination |
| GET | /api/products/:id | All | Get single product |
| PUT | /api/products/:id | ADMIN, WAREHOUSE | Update (excludes currentStock) |
| POST | /api/products/:id/stock-movements | ADMIN, WAREHOUSE | Create IN or OUT movement |
| GET | /api/products/:id/stock-movements | All | Paginated movement history |

### Stock movement

Body: { "type": "IN" or "OUT", "quantity": <positive integer>, "reason": "..." }

Runs inside prisma.$transaction: fetch stock -> validate (reject OUT if insufficient) -> update currentStock -> create StockMovement.

### Low-stock filter

GET /api/products?lowStock=true returns products where currentStock <= minimumStock.


---

## 10. Sales Challan

### Lifecycle

```
Create Draft (POST /api/challans)  [stock unchanged]
     |
  DRAFT
     |
Confirm (POST /api/challans/:id/confirm)
     |
  Validates stock inside Prisma transaction with SELECT FOR UPDATE
     |-- Stock sufficient -> deduct stock, write OUT movements, mark CONFIRMED
     |-- Stock insufficient -> rollback entire transaction, challan stays DRAFT
     |
  CONFIRMED  (or remains DRAFT on failure)

Cancel (POST /api/challans/:id/cancel)  [stock unchanged]
     |
  CANCELLED
```

### API endpoints

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | /api/challans | ADMIN, SALES | Create DRAFT challan |
| GET | /api/challans | All | List challans (paginated) |
| GET | /api/challans/:id | All | Get challan with items, customer, creator |
| POST | /api/challans/:id/confirm | ADMIN, SALES | Confirm - deduct stock |
| POST | /api/challans/:id/cancel | ADMIN, SALES | Cancel DRAFT challan |

### Create request body

```json
{
  "customerId": "<customer-id>",
  "items": [
    { "productId": "<product-id>", "quantity": 5 },
    { "productId": "<product-id-2>", "quantity": 3 }
  ]
}
```

### Automatic challan number

Generated inside the create transaction: finds highest existing challanNumber, parses numeric suffix, increments. Format CH-000001. A retry loop (up to 3 attempts) handles P2002 unique-constraint errors from concurrent creation.

### State transition rules

- Only DRAFT challans can be confirmed or cancelled.
- Confirming non-DRAFT: 400 "Cannot confirm a challan with status <status>."
- Cancelling non-DRAFT: 400 "Cannot cancel a challan with status <status>."

---

## 11. Transaction and Stock Safety

### Challan confirmation (verified from challan.service.ts lines 182-264)

confirmChallan wraps the entire operation in prisma.$transaction({ maxWait: 15000, timeout: 30000 }).

Steps inside the transaction:

1. Fetch the challan and its items.
2. Guard: reject if status is not DRAFT (400).
3. Aggregate quantities per productId (handles duplicate product refs in one challan).
4. Execute: SELECT id FROM products WHERE id IN (...) FOR UPDATE - acquires row-level exclusive lock on affected products preventing concurrent confirmations from reading stale stock.
5. Re-fetch current stock of locked products.
6. Check every product: if currentStock < required quantity, throw 400 "Insufficient stock for product: <name>" - aborts transaction.
7. For each challan item: UPDATE products SET currentStock = currentStock - quantity; INSERT INTO stock_movements (type OUT, reason "Sales challan CH-XXXXXX").
8. UPDATE challans SET status = CONFIRMED.
9. Commit.

On any failure in steps 1-8: PostgreSQL rolls back the entire transaction. No stock deducted. No StockMovement records created. Challan status remains DRAFT.

Note: The SELECT FOR UPDATE is issued via $executeRawUnsafe with product IDs (cuid strings from Prisma records, not user input) interpolated into the SQL. A parameterized form would be preferable for additional safety.

### Manual stock movement transaction

createStockMovement also runs inside prisma.$transaction. Same stock-level check prevents OUT movements that would cause negative stock.

---

## 12. Product Snapshot Design

When a challan is created, the service fetches each product's current name, sku, and unitPrice and stores immutable copies in the ChallanItem row:

```
ChallanItem snapshot fields (written at challan creation time):
  productName  = product.name
  sku          = product.sku
  unitPrice    = product.unitPrice
  productId    = product.id  (live FK reference)
```

Effect: If the product price changes from 499 to 699 after challan creation, the challan detail page continues to display 499 because ChallanItem.unitPrice is an immutable copy. Historical sales records remain accurate regardless of future catalog changes.

---

## 13. REST API

### Base URL

- Local: http://localhost:5000/api
- Production: INSERT ACTUAL RENDER URL /api

All routes also available without the /api prefix (e.g. /auth/login).

---

### Authentication

POST /api/auth/login - Public

Body: { "email": "sales@example.com", "password": "Password123!" }

Response 200:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "...", "name": "Sales User", "email": "sales@example.com", "role": "SALES" }
}
```
Errors: 400 (validation), 401 (invalid credentials)

---

GET /api/auth/me - Bearer token required

Response 200: { "user": { "id": "...", "name": "...", "email": "...", "role": "..." } }

Errors: 401

---

### Customers

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/customers | ADMIN, SALES | Create; 201; 409 on duplicate email/GSTIN |
| GET | /api/customers | All | page, limit, search, status, customerType |
| GET | /api/customers/:id | All | 404 if not found |
| PUT | /api/customers/:id | ADMIN, SALES | Partial update |
| POST | /api/customers/:id/follow-ups | ADMIN, SALES | Body: followUpDate, notes |

---

### Products

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/products | ADMIN, WAREHOUSE | Create; 409 on duplicate SKU |
| GET | /api/products | All | page, limit, search, category, lowStock |
| GET | /api/products/:id | All | 404 if not found |
| PUT | /api/products/:id | ADMIN, WAREHOUSE | currentStock not accepted |
| POST | /api/products/:id/stock-movements | ADMIN, WAREHOUSE | Body: type, quantity, reason |
| GET | /api/products/:id/stock-movements | All | Paginated history |

---

### Challans

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | /api/challans | ADMIN, SALES | Creates DRAFT; body: customerId, items array |
| GET | /api/challans | All | Paginated |
| GET | /api/challans/:id | All | Includes items, customer, creator |
| POST | /api/challans/:id/confirm | ADMIN, SALES | 400 if not DRAFT or insufficient stock |
| POST | /api/challans/:id/cancel | ADMIN, SALES | 400 if not DRAFT |

---

## 14. Frontend

### Technology

React 19, TypeScript, Vite 8, React Router DOM 7, Axios 1.7, plain CSS (custom HSL-based design system - no Tailwind).

### Routes (App.tsx)

| Path | Component | Allowed Roles |
|---|---|---|
| /login | Login | Public |
| /dashboard | Dashboard | All authenticated |
| /customers | Customers | ADMIN, SALES, ACCOUNTS |
| /customers/:id | CustomerDetails | ADMIN, SALES, ACCOUNTS |
| /products | Products | ADMIN, SALES, WAREHOUSE, ACCOUNTS |
| /products/:id | ProductDetails | ADMIN, SALES, WAREHOUSE, ACCOUNTS |
| /challans | Challans | ADMIN, SALES, ACCOUNTS |
| /challans/new | CreateChallan | ADMIN, SALES |
| /challans/:id | ChallanDetails | ADMIN, SALES, ACCOUNTS |
| * | -- | Redirect to /login |

Note: WAREHOUSE cannot see Customers or Challans pages in the frontend. The backend API permits WAREHOUSE to read customers; the frontend applies the stricter constraint.

### Key components

- ProtectedRoute: authentication gate; redirects to /login if not authenticated, away if role not in allowedRoles.
- SidebarLayout: shared sidebar with role-aware menu items.
- AuthProvider / useAuth hook: React context storing current user and token from localStorage.
- Axios interceptors (services/api.ts): request interceptor attaches Bearer token; response interceptor clears localStorage and redirects to /login on 401.

### SPA routing

frontend/vercel.json rewrites all paths to index.html so React Router handles navigation correctly on hard refresh.


---

## 15. Security and Validation

| Mechanism | Implementation |
|---|---|
| Password hashing | bcrypt, 12 rounds in seed |
| Timing-safe login | Dummy hash compared when user not found; prevents user enumeration via response time |
| JWT | Signed with JWT_SECRET from environment; expiry via JWT_EXPIRES_IN |
| Stateless auth | authenticate middleware does not query the database |
| passwordHash exclusion | Never returned from any API response; getUserById uses select to exclude it |
| CORS | origin: env.FRONTEND_URL in production; wildcard in development |
| Input validation | Zod schemas on all endpoints; unknown fields stripped |
| Payload size limit | Express body parser limited to 1mb |
| Error sanitization | Programmer errors return generic message; stack traces never sent to client |
| Env validation | Zod schema at startup; exits immediately if required vars missing |
| RBAC | Every protected route has both authenticate and authorize middleware |

---

## 16. Error Handling

| Scenario | HTTP Status | Client Message |
|---|:---:|---|
| Validation failure (Zod) | 400 | First Zod error message |
| Invalid email/password | 401 | "Invalid email or password." |
| Missing/malformed token | 401 | "Authentication token is required." |
| Expired token | 401 | "Token has expired. Please log in again." |
| Insufficient role | 403 | "You do not have permission to access this resource." |
| Resource not found | 404 | "<Resource> with id ... not found." |
| Duplicate SKU | 409 | "A product with this SKU already exists." |
| Duplicate email/GSTIN | 400 | "A customer with this <field> already exists." |
| Insufficient stock | 400 | "Insufficient stock for product: <name>" |
| Non-DRAFT state action | 400 | "Cannot confirm/cancel a challan with status <status>." |
| Unknown route | 404 | not-found middleware |
| Unhandled server error | 500 | "An unexpected error occurred. Please try again later." |

---

## 17. Environment Configuration

### Backend (backend/.env)

```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<db>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
```

All variables validated by Zod schema in src/config/env.ts at startup. Missing required variables cause immediate process exit.

### Frontend (frontend/.env)

```
VITE_API_URL=http://localhost:5000/api
```

In production, VITE_API_URL is set to the live Render backend URL as a Vercel environment variable.

Caution: Never commit real JWT_SECRET or DATABASE_URL to version control. Both .env files are in .gitignore.

---

## 18. Local Setup

### Prerequisites

- Node.js v18+
- npm v9+
- A PostgreSQL database (local or Supabase)

### Steps

```bash
git clone https://github.com/aarif-123/StockPulse.git
cd StockPulse

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

Create backend/.env and frontend/.env from the templates in Section 17.

```bash
# Database setup (from backend/)
npx prisma generate
npx prisma migrate dev
npm run seed

# Start backend (from backend/)
npm run dev        # ts-node-dev, hot reload, port 5000

# Start frontend (from frontend/)
npm run dev        # Vite dev server, port 5173
```

Open http://localhost:5173

### Docker Compose (optional)

```bash
docker-compose up --build
```

Runs Express backend on port 5000 and React frontend (via Nginx) on port 80. Requires DATABASE_URL and JWT_SECRET in the shell environment.

---

## 19. Deployment

### Architecture

```
Browser
   |
Vercel  (frontend/dist served via CDN)
   |
   | HTTPS API calls
   |
Render  (backend Node.js service)
   |
Prisma ORM
   |
Supabase PostgreSQL
```

### Frontend - Vercel

- Root directory: frontend/
- Build command: npm run build
- Output directory: dist
- Environment variable: VITE_API_URL=<Render backend URL>/api
- frontend/vercel.json rewrites all paths to index.html for SPA routing

### Backend - Render

- Root directory: backend/
- Build command: npm install && npm run build
- Start command: node dist/server.js
- Environment variables: NODE_ENV=production, PORT, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN=1d, FRONTEND_URL=<Vercel app URL>

### Database - Supabase

Supabase PostgreSQL. The DATABASE_URL uses the transaction pooler connection string (port 6543, pgbouncer=true) to avoid connection exhaustion on Render.

---

## 20. Test Credentials

DEVELOPMENT / TEST CREDENTIALS ONLY - pre-seeded via prisma/seed.ts. Do not use in production.

| Role | Email | Password | Access |
|---|---|---|---|
| ADMIN | admin@example.com | Password123! | Full access to all modules |
| SALES | sales@example.com | Password123! | Customers, challans (create/confirm/cancel) |
| WAREHOUSE | warehouse@example.com | Password123! | Products CRUD, stock movements IN/OUT |
| ACCOUNTS | accounts@example.com | Password123! | Read-only on customers, products, challans |

---

## 21. Postman Collection

### File

```
postman/mini-erp.postman_collection.json
```

Duplicate also at postman/Mini-ERP-CRM.postman_collection.json (same content).

### Collection variables

| Variable | Default | Purpose |
|---|---|---|
| baseUrl | http://localhost:5000/api | Change to Render URL for production |
| authToken | empty | Auto-populated by Login request test script |

### Folders

| Folder | Requests |
|---|---|
| Health | GET /health |
| Auth | POST /auth/login, GET /auth/me |
| Customers (Phase 3) | POST, GET list, GET :id, PUT :id, POST :id/follow-ups |
| Products and Inventory (Phase 4) | POST, GET list, GET :id, PUT :id, POST :id/stock-movements, GET :id/stock-movements |
| Sales Challans (Phase 5) | POST, GET list, GET :id, POST :id/confirm, POST :id/cancel |

### Auto-token behavior

The Login request has a Postman test script that saves the JWT from the response into authToken. All subsequent requests use Authorization: Bearer {{authToken}} automatically.

### Recommended evaluator sequence

1. Set baseUrl to the live Render API URL.
2. POST /auth/login - admin@example.com / Password123! Token saved automatically.
3. POST /customers - create a customer.
4. POST /products - create a product with currentStock: 50.
5. POST /products/:id/stock-movements - Stock IN of 20 units; currentStock becomes 70.
6. POST /challans - create DRAFT challan with quantity: 10.
7. GET /products/:id - confirm stock is still 70 (DRAFT does not touch stock).
8. POST /challans/:id/confirm - confirm the challan.
9. GET /products/:id - confirm stock is now 60.
10. GET /products/:id/stock-movements - verify OUT movement with reason "Sales challan CH-000001".
11. Insufficient stock test: create DRAFT with quantity 999 -> confirm -> 400 Insufficient stock -> verify stock remains 60.

---

## 22. Testing and Verification

No automated test suite is present. The following was verified manually:

| Area | Verification |
|---|---|
| Authentication | All 4 roles can log in; JWT returned; /auth/me returns correct user |
| RBAC 403 | Stock movement as SALES returns 403 |
| RBAC 403 | Customer create as WAREHOUSE returns 403 |
| Customer CRUD | Create, read, update all work; follow-up updates followUpDate and notes |
| Customer search | Search by name, mobile, email, businessName returns correct results |
| Customer filter | Filter by status and customerType works |
| Product update currentStock | Attempt to set currentStock via PUT; field is ignored |
| Duplicate SKU | Second product with same SKU returns 409 |
| Stock IN | IN movement; currentStock increments correctly |
| Stock OUT | OUT movement; currentStock decrements correctly |
| Negative stock prevention manual | OUT exceeding stock returns 400 Insufficient stock |
| Challan draft | Create with 2 items; stock unchanged; status=DRAFT |
| Challan number format | CH-000001, CH-000002 sequence correct |
| Product snapshot | Create challan; update product price; challan shows original price |
| Challan confirmation | status becomes CONFIRMED; stock decremented per item |
| OUT movements created | GET stock-movements shows OUT records per challan item |
| Insufficient stock rollback | Confirm with qty > stock; 400 returned; stock unchanged; challan still DRAFT |
| Challan cancellation | status=CANCELLED; stock unchanged |
| Cannot confirm non-DRAFT | Confirm CANCELLED challan; 400 returned |
| Frontend login | All 4 roles log in at live Vercel URL |
| Frontend RBAC | WAREHOUSE cannot see Customers or Challans pages |
| Frontend SPA routing | /customers URL works after hard refresh on Vercel |
| Health check | GET /api/health returns { "status": "ok" } |

---

## 23. Recommended Evaluator Demo

Duration: approximately 2 minutes

1. Open https://stock-pulse-psi-seven.vercel.app
2. Log in as sales@example.com / Password123!
3. Customers -> New Customer -> fill fields -> save -> confirm record in list
4. Products -> open a product -> note the current stock level
5. Challans -> New Challan -> select customer -> add product with quantity 5 -> Save as Draft
6. Products -> open same product -> confirm stock is unchanged (draft has no stock effect)
7. Challans -> open the draft -> Confirm -> status becomes CONFIRMED
8. Products -> confirm stock decreased by 5
9. Product stock movements tab -> OUT movement with reason "Sales challan CH-XXXXXX"
10. Optional: create another challan with quantity larger than available stock -> Confirm -> observe 400 error and stock unchanged

---

## 24. Technical Decisions

| Decision | Rationale |
|---|---|
| React 19 + Vite | Fast HMR, modern ESM output, clean TypeScript config |
| Express | Minimal and explicit; routing and middleware chain easy to reason about |
| TypeScript on both layers | Catches type mismatches at compile time; valuable for Prisma types and Zod inference |
| Prisma | Type-safe database access; schema-first with auto-generated migrations |
| Supabase PostgreSQL | Managed PostgreSQL with connection pooling PgBouncer |
| JWT stateless | No server-side session store; token contains userId and role |
| bcrypt with dummy hash | Prevents timing-based user enumeration |
| Zod | Runtime validation with TypeScript inference; single source for validation and types |
| Prisma transaction with SELECT FOR UPDATE | Prevents concurrent challan confirmations from double-booking stock |
| Product snapshot in ChallanItem | Decouples historical sales records from future catalog changes |
| Modular monolith | One deployable unit with clean domain boundaries |
| Docker Compose | Optional local multi-service startup without full orchestration overhead |

---

## 25. Assumptions

- Test users are seeded via npm run seed before first login.
- JWT authentication is stateless; no server-side session revocation exists.
- currentStock is modified exclusively through stock movements and challan confirmation.
- ChallanItem records preserve product snapshots at creation time; future catalog changes do not alter them.
- A single operational PostgreSQL database is used for all data.
- Connection pooling is active in the production environment (pgbouncer port 6543).
- No multi-currency layer; unit prices are decimals without a currency code.

---

## 26. Known Limitations

The following features are outside the implemented assignment scope:

- Invoice generation: the system produces delivery challans, not billing invoices.
- Purchase orders module: inbound stock is added manually via the Stock IN panel.
- Product image upload: products use text metadata only; no S3 integration.
- CI/CD pipeline: deployments are triggered manually through Vercel/Render dashboards.
- Token revocation: JWT is stateless; logout does not invalidate the token server-side.
- Advanced reporting: no analytics dashboard, charting, or export capability.

---

## 27. Final Submission Checklist

- [x] GitHub repository - https://github.com/aarif-123/StockPulse
- [x] Live frontend - Vercel (https://stock-pulse-psi-seven.vercel.app)
- [x] Live backend - Render (insert actual URL before submission)
- [x] Supabase PostgreSQL - live cloud database
- [x] Test credentials - 4 roles seeded via prisma/seed.ts
- [x] Postman collection - postman/mini-erp.postman_collection.json
- [x] README - README.md in repository root
- [x] Architecture documentation - Section 5 of this document
- [x] Database schema - backend/prisma/schema.prisma
- [x] Requirements coverage matrix - Section 3 of this document
- [x] RBAC permission matrix - Section 7 of this document
- [x] Transaction safety documentation - Section 11 of this document
- [x] Product snapshot documentation - Section 12 of this document
- [x] API documentation - Section 13 of this document
- [x] Local setup instructions - Section 18 of this document
- [x] Deployment documentation - Section 19 of this document
- [x] Known limitations - Section 26 of this document
- [x] Docker support - docker-compose.yml + backend/Dockerfile + frontend/Dockerfile
