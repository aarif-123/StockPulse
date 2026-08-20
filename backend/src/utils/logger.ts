// Structured JSON logger (Pino).
// Use this logger everywhere instead of console.log/error.
// In development, output is pretty-printed to stdout.
// In production, output is newline-delimited JSON for log aggregators.

import pino from 'pino';
import { env } from '../config/env';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});

export default logger;
