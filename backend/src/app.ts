import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';

import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import { generalApiLimiter } from './middleware/rate-limiter';
import { env } from './config/env';
import prisma from './config/database';
import logger from './utils/logger';
import authRouter from './modules/auth/auth.routes';
import platformRouter from './modules/platform/platform.routes';
import organizationsRouter from './modules/organizations/organization.routes';
import customersRouter from './modules/customers/customer.routes';
import productsRouter from './modules/products/product.routes';
import challansRouter from './modules/challans/challan.routes';
import dashboardRouter from './modules/dashboard/dashboard.routes';
import reportsRouter from './modules/reports/reports.routes';
import paymentsRouter from './modules/payments/payment.routes';
import { bomRouter } from './modules/bom/bom.routes';

const app = express();

// ── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ── Request Logging ───────────────────────────────────────────────────────────
app.use(pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/api/health' || req.url === '/health',
  },
  customLogLevel: (_req, res) => {
    if (res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? env.FRONTEND_URL
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'X-Organization-Id'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────
async function getDatabaseStatus(): Promise<{ ok: boolean; latencyMs?: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false };
  }
}

const healthHandler = async (_req: Request, res: Response): Promise<void> => {
  const db = await getDatabaseStatus();
  const status = db.ok ? 'ok' : 'degraded';
  res.status(db.ok ? 200 : 503).json({
    status,
    db: db.ok ? 'connected' : 'unreachable',
    dbLatencyMs: db.latencyMs,
    uptime: Math.floor(process.uptime()),
    version: process.env['npm_package_version'] ?? '1.0.0',
    environment: env.NODE_ENV,
  });
};

app.get('/api/health', healthHandler);
app.get('/health', healthHandler);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api', generalApiLimiter);

// 1. Identity & Tenant Authentication
app.use('/api/auth', authRouter);
app.use('/api/v1/auth', authRouter);
app.use('/auth', authRouter);

// 2. Platform Super Admin (Global Platform Scope)
app.use('/api/platform', platformRouter);
app.use('/api/v1/platform', platformRouter);

// 3. Organization Administration & Settings (Tenant Scope)
app.use('/api/organizations', organizationsRouter);
app.use('/api/v1/organizations', organizationsRouter);

// 4. Commercial Plans & Payments
app.use('/api/payments', paymentsRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/payments', paymentsRouter);

// 5. Tenant Business Modules
app.use('/api/customers', customersRouter);
app.use('/customers', customersRouter);

app.use('/api/products', productsRouter);
app.use('/products', productsRouter);

app.use('/api/challans', challansRouter);
app.use('/challans', challansRouter);

app.use('/api/dashboard', dashboardRouter);
app.use('/dashboard', dashboardRouter);

app.use('/api/reports', reportsRouter);
app.use('/reports', reportsRouter);

app.use('/api/bom', bomRouter);
app.use('/api/v1/bom', bomRouter);
app.use('/bom', bomRouter);

// ── Error handling (must be last) ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
