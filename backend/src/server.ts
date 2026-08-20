// Entry point — starts the HTTP server and handles graceful shutdown.

import app from './app';
import { PORT } from './config/env';
import prisma from './config/database';
import logger from './utils/logger';

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, `Server running`);
  logger.debug(`Health: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown — close the HTTP server and Prisma connection pool
// before the process exits so in-flight requests can complete cleanly.
async function shutdown(signal: string): Promise<void> {
  logger.warn({ signal }, 'Shutdown signal received — draining connections');

  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Database connection closed. Process exiting.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT',  () => { void shutdown('SIGINT'); });

// Catch unhandled promise rejections — log and exit so the process doesn't
// continue in an unknown state.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
  process.exit(1);
});
