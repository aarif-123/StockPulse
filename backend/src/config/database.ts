// Singleton PrismaClient instance.
// Importing from this module ensures a single connection pool is shared
// across the entire application, preventing "Too many clients" errors.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log:
    process.env['NODE_ENV'] === 'development'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'],
});

export default prisma;
