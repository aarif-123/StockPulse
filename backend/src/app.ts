import express, { Request, Response } from 'express';
import cors from 'cors';

import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import { env } from './config/env';
import authRouter from './modules/auth/auth.routes';
import customersRouter from './modules/customers/customer.routes';
import productsRouter from './modules/products/product.routes';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? process.env['FRONTEND_URL'] ?? ''
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// ── API Routes ────────────────────────────────────────────────────────────────

app.use('/api/auth',      authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/products',  productsRouter);

// Phase 5+: uncomment as modules are implemented
// app.use('/api/challans', challansRouter);

// ── Error handling (must be last) ─────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
