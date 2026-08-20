// This file is the single source of truth for all environment variables.
// It validates required vars at startup so the app fails fast on misconfiguration
// rather than silently producing runtime errors.

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT must be a numeric string')
    .default('5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_StockPulseDemoKey'),
  RAZORPAY_KEY_SECRET: z.string().default('StockPulseDemoSecret123456789'),
  GROQ_API_KEY: z.string().default(process.env.GROQ_API_KEY || ''),
  GROQ_MODEL: z.string().default(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const PORT = parseInt(env.PORT, 10);
