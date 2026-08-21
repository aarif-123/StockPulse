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

// Resilient query layer that gracefully handles PostgreSQL connection resets and pool timeouts
const prisma = rawPrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error: any) {
          const isTransient =
            error?.code === 'P1017' || // Server has closed the connection
            error?.code === 'P2024' || // Timed out fetching a new connection from connection pool
            error?.code === 'P1001' || // Can't reach database server
            error?.code === 'P1008' || // Operations timed out
            error?.message?.includes('ConnectionReset') ||
            error?.message?.includes('10054') ||
            error?.message?.includes('closed the connection') ||
            error?.message?.includes('connection pool') ||
            error?.message?.includes('forcibly closed');

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
