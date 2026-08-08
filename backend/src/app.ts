import express, { Request, Response } from 'express';
import cors from 'cors';

import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import { env } from './config/env';
import authRouter from './modules/auth/auth.routes';
import customersRouter from './modules/customers/customer.routes';
import productsRouter from './modules/products/product.routes';
import challansRouter from './modules/challans/challan.routes';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? env.FRONTEND_URL
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
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// ── API Routes ────────────────────────────────────────────────────────────────

// Support both prefixed (/api) and non-prefixed paths for routing flexibility
app.use('/api/auth',      authRouter);
app.use('/auth',          authRouter);

app.use('/api/customers', customersRouter);
app.use('/customers',     customersRouter);

app.use('/api/products',  productsRouter);
app.use('/products',      productsRouter);

app.use('/api/challans',  challansRouter);
app.use('/challans',      challansRouter);

// ── Error handling (must be last) ─────────────────────────────────────────────

app.use(notFound);
app.use(errorHandler);

export default app;
