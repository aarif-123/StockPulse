// Zod validation schemas for the Customer module.
//
// Four schemas cover the four distinct input shapes:
//   createCustomerSchema — POST /api/customers
//   updateCustomerSchema — PUT /api/customers/:id
//   listQuerySchema      — GET /api/customers query params
//   followUpSchema       — POST /api/customers/:id/follow-ups

import { z } from 'zod';
import { CustomerStatus, CustomerType } from '@prisma/client';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Accepts a YYYY-MM-DD string and coerces it to a JavaScript Date.
 * Rejects any other format so clients get a clear error.
 */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
  .transform((s) => new Date(s));

// ── Create ────────────────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  // Required fields
  name:         z.string({ required_error: 'Name is required.' }).min(1, 'Name cannot be empty.').trim(),
  mobile:       z.string({ required_error: 'Mobile number is required.' }).min(7, 'Mobile number is too short.').max(15, 'Mobile number is too long.').trim(),
  email:        z.string({ required_error: 'Email is required.' }).email('Invalid email address.').trim(),
  businessName: z.string({ required_error: 'Business name is required.' }).min(1, 'Business name cannot be empty.').trim(),
  customerType: z.nativeEnum(CustomerType, { errorMap: () => ({ message: `customerType must be one of: ${Object.values(CustomerType).join(', ')}.` }) }),
  address:      z.string({ required_error: 'Address is required.' }).min(1, 'Address cannot be empty.').trim(),
  status:       z.nativeEnum(CustomerStatus, { errorMap: () => ({ message: `status must be one of: ${Object.values(CustomerStatus).join(', ')}.` }) }),

  // Optional fields
  gstNumber:    z.string().trim().optional(),
  followUpDate: dateString.optional(),
  notes:        z.string().trim().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

// ── Update ────────────────────────────────────────────────────────────────────

// All create fields become optional for updates — clients send only what changed.
export const updateCustomerSchema = createCustomerSchema.partial();

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

// ── List query ────────────────────────────────────────────────────────────────

export const listQuerySchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(100, 'limit cannot exceed 100.').default(10),
  search:       z.string().trim().optional(),
  status:       z.nativeEnum(CustomerStatus, { errorMap: () => ({ message: `status must be one of: ${Object.values(CustomerStatus).join(', ')}.` }) }).optional(),
  customerType: z.nativeEnum(CustomerType,   { errorMap: () => ({ message: `customerType must be one of: ${Object.values(CustomerType).join(', ')}.` }) }).optional(),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;

// ── Follow-up ─────────────────────────────────────────────────────────────────

export const followUpSchema = z.object({
  followUpDate: dateString,
  notes:        z.string({ required_error: 'Notes are required.' }).min(1, 'Notes cannot be empty.').trim(),
});

export type FollowUpInput = z.infer<typeof followUpSchema>;
