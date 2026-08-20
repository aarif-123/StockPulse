// Rate limiting middleware factory.
// Apply to public endpoints that risk brute-force or abuse (e.g. login).
// Configured via environment so limits are tunable per deployment.

import rateLimit from 'express-rate-limit';

/** 10 attempts per 15-minute window per IP. Returns 429 on breach. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,  // Sends RateLimit-* headers (RFC 6585)
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  // Skip successful requests so that legitimate users don't burn the window
  skipSuccessfulRequests: true,
});

/** 20 attempts per 15-minute window for payment initiation & verification */
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many payment requests. Please try again after 15 minutes.',
  },
});

/** 500 requests per 15-minute window for standard API operations */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many requests. Please slow down and try again later.',
  },
});


