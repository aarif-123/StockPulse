// Singleton PrismaClient instance.
// Importing from this module ensures a single connection pool is shared
// across the entire application, preventing "Too many clients" errors.

import { PrismaClient } from '@prisma/client';

const rawPrisma = new PrismaClient({
  log:
    process.env['NODE_ENV'] === 'development'
      ? ['warn', 'error']
      : ['warn', 'error'],
});

const TRANSIENT_PRISMA_CODES = new Set(['P1001', 'P1008', 'P1017', 'P2024']);
const TRANSIENT_MSG_REGEX = /ConnectionReset|10054|closed the connection|connection pool|forcibly closed/i;

// Resilient query layer that gracefully handles PostgreSQL connection resets and pool timeouts
const prisma = rawPrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error: unknown) {
          const err = error as { code?: string; message?: string } | undefined;
          const isTransient =
            (err?.code ? TRANSIENT_PRISMA_CODES.has(err.code) : false) ||
            (err?.message ? TRANSIENT_MSG_REGEX.test(err.message) : false);

          if (isTransient) {
            // Force Prisma to reconnect and retry with backoff
            try {
              await rawPrisma.$disconnect().catch(() => {});
              await new Promise((resolve) => setTimeout(resolve, 200));
              await rawPrisma.$connect().catch(() => {});
            } catch {
              // Ignore reconnection error; attempt query retry
            }
            return await query(args);
          }
          throw error;
        }
      },
    },
  },
}) as unknown as PrismaClient;

export default prisma;
