// Zod validation schemas for auth endpoints.
//
// Placing schemas in a dedicated file keeps the controller thin and makes
// the validation contract easy to find and update independently.

import { z } from 'zod';

/**
 * Schema for POST /api/auth/login request body.
 *
 * We validate email format (not just non-empty) to give the client useful
 * feedback early. The password check is intentionally simple — the actual
 * credential comparison happens in the service layer.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required.' })
    .email('Please provide a valid email address.'),
  password: z
    .string({ required_error: 'Password is required.' })
    .min(1, 'Password cannot be empty.'),
});

/** Inferred TypeScript type for the validated login body. */
export type LoginInput = z.infer<typeof loginSchema>;
