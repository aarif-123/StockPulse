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

// Resilient query layer that gracefully handles PgBouncer / PostgreSQL connection resets and pool timeouts
const prisma = rawPrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error: any) {
          const isTransient =
            error?.code === 'P2024' ||
            error?.message?.includes('ConnectionReset') ||
            error?.message?.includes('10054') ||
            error?.message?.includes('connection pool') ||
            error?.message?.includes('forcibly closed');

          if (isTransient) {
            // Reconnect and backoff 150ms before retrying once
            await new Promise((resolve) => setTimeout(resolve, 150));
            return await query(args);
          }
          throw error;
        }
      },
    },
  },
}) as unknown as PrismaClient;

export default prisma;
