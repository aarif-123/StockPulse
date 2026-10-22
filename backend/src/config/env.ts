// This file is the single source of truth for all environment variables.
// It validates required vars at startup so the app fails fast on misconfiguration
// rather than silently producing runtime errors.

import 'dotenv/config';
import { z } from 'zod';

const isTest = process.env.NODE_ENV === 'test';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z
    .string()
    .regex(/^\d+$/, 'PORT must be a numeric string')
    .default('5000'),
  DATABASE_URL: isTest
    ? z.string().default('postgresql://mock:mock@localhost:5432/mock_db')
    : z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: isTest
    ? z.string().default('test_jwt_secret_key_at_least_32_characters_long')
    : z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  // Groq AI — comma-separated for key rotation (e.g. "key1,key2,key3")
  GROQ_API_KEY: isTest
    ? z.string().default('gsk_mock_test_key_for_testing')
    : z.string().min(1, 'GROQ_API_KEY is required for the Intelligence layer'),
  GROQ_MODEL: z.string().default('qwen/qwen3.8-27b'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const PORT = parseInt(env.PORT, 10);
