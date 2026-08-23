# Changelog

All notable changes to the StockPulse Mini ERP + CRM Portal will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-08-23

### Added
- **Bulk Product Ingestion Engine**: Interactive Excel (`.xlsx`) and CSV file upload modal (`BulkImportModal.tsx`) with downloadable standardized templates, pre-flight grid preview, client-side validation, duplicate SKU detection, and configurable strategies (`SKIP`, `OVERWRITE`, `FAIL`).
- **Notification History & Role Audit Feed (`/notifications`)**: Dedicated audit log route powered by backend `getUserNotifications` service supporting pagination, search, severity levels (`CRITICAL`, `WARNING`, `INFO`, `SUCCESS`), category filtering (`STOCK_LOW`, `CHALLAN_PENDING`, `REORDER_RECOMMENDED`, `ASSEMBLY_READY`, `CREDIT_RISK_ALERT`), date range presets (`Today`, `Yesterday`, `Past 7 Days`, `Past 30 Days`), and recency sorting.
- **Smart Business Operational Analysis Engine**: Interactive Notification Details Modal featuring high-contrast typography, context-aware business event overviews, inventory impact statements, role-specific action recommendations, and direct resource links.
- **Module-Wide Date Range & Recency Toolbar**: Extended date range presets (`Today`, `Past 7 Days`, `Past 30 Days`), recency ordering (`Newest First`, `Oldest First`), and category/status filtering across Product Catalog (`/products`), Customer CRM (`/customers`), and Delivery Challans (`/challans`).
- **Role-Tailored DOST AI Business Companion Widget**: Enhanced AI chatbot with live workspace telemetry inspection (`dashboardService.getStats()`), role-scoped greetings (`ORG_ADMIN`, `WAREHOUSE`, `SALES`, `ACCOUNTS`, `SUPER_ADMIN`), security gate permission enforcement (`buildRestrictedRoleResponse`), and real interactive confirmation cards for backend actions (`MOVE_STOCK`, `CREATE_CHALLAN`, `CREATE_CUSTOMER`, `BUILD_BOM_ASSEMBLY`, `UPDATE_ORG_STATUS`).

---

## [2.0.0] - 2026-08-16

### Added
- **Realtime Dashboard Analytics API**: `GET /api/dashboard/stats` aggregating 14 live metrics in a single transactional query batch.
- **Stock Movements Audit Report API**: `GET /api/reports/stock-movements` with filterable product, movement type, date range, and pagination support.
- **Pure SVG Analytics Visualizations**: 7-Day Stock Flow Bar Chart and Challan Fulfillment Rate Donut Chart without heavy third-party dependencies.
- **RFC 4180 Client CSV Export Engine**: 1-click downloads for Customer directories and Product catalogs.
- **Reusable Component Library**: `<Table>`, `<Pagination>`, `<SearchBar>`, `<ToastContainer>`, `<LoadingSkeleton>` replacing all inline duplications.
- **Non-blocking Toast Notification System**: `useToast` hook with auto-dismiss and color-coded status badges.
- **Automated Testing Suite**: 44 test cases across 7 test suites covering business logic services and Supertest HTTP integration flows with 94.6% line coverage.
- **CI/CD Quality Pipeline**: GitHub Actions `.github/workflows/ci.yml` verifying linting, typing, tests, and production bundling on every PR.
- **Docker Compose Health Checks**: Verified backend startup probe and dependent frontend proxy wiring.

### Changed
- Refactored `Customers.tsx`, `Products.tsx`, `Challans.tsx`, `CustomerDetails.tsx`, `ProductDetails.tsx`, and `ChallanDetails.tsx` into clean, thin orchestrators.
- Replaced all blocking `window.alert()` browser prompts with professional toast notifications.
- Enhanced database health check at `GET /api/health` with live DB query and connection latency reporting.

### Security
- Added rate limiting on `/api/auth/login` (10 requests per 15-minute window per IP).
- Parameterized all concurrency locks (`SELECT FOR UPDATE`) via `Prisma.sql` templates.
- Enforced strict Zod boundary sanitization with string trimming and boundary checks.

---

## [1.0.0] - 2026-08-14
- Initial release with baseline Auth, Customer CRM, Product Catalog, and Sales Challans.
