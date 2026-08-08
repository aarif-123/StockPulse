// Entry point — starts the HTTP server and handles graceful shutdown.

import app from './app';
import { PORT } from './config/env';
import prisma from './config/database';

const server = app.listen(PORT, () => {
  console.log(`✅  Server running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown — close the HTTP server and Prisma connection pool
// before the process exits so in-flight requests can complete cleanly.
async function shutdown(signal: string): Promise<void> {
  console.log(`\n⚠️   Received ${signal}. Shutting down gracefully...`);

  server.close(async () => {
    await prisma.$disconnect();
    console.log('🔌  Database connection closed.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT',  () => { void shutdown('SIGINT'); });

// Catch unhandled promise rejections — log and exit so the process doesn't
// continue in an unknown state.
process.on('unhandledRejection', (reason) => {
  console.error('❌  Unhandled rejection:', reason);
  process.exit(1);
});
