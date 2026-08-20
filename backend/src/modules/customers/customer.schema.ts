import { z } from 'zod';
import { CustomerStatus, CustomerType } from '@prisma/client';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format.')
  .transform((s) => new Date(s));

export const createCustomerSchema = z.object({
  name:         z.string({ required_error: 'Name is required.' }).min(1, 'Name cannot be empty.').trim(),
  mobile:       z.string({ required_error: 'Mobile number is required.' }).min(7, 'Mobile number is too short.').max(15, 'Mobile number is too long.').trim(),
  email:        z.string({ required_error: 'Email is required.' }).email('Invalid email address.').trim(),
  businessName: z.string({ required_error: 'Business name is required.' }).min(1, 'Business name cannot be empty.').trim(),
  customerType: z.nativeEnum(CustomerType, { errorMap: () => ({ message: `customerType must be one of: ${Object.values(CustomerType).join(', ')}.` }) }),
  address:      z.string({ required_error: 'Address is required.' }).min(1, 'Address cannot be empty.').trim(),
  status:       z.nativeEnum(CustomerStatus, { errorMap: () => ({ message: `status must be one of: ${Object.values(CustomerStatus).join(', ')}.` }) }),
  gstNumber:    z.string().trim().optional(),
  followUpDate: dateString.optional(),
  notes:        z.string().trim().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = createCustomerSchema.partial();
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const listQuerySchema = z.object({
  page:         z.coerce.number().int().min(1).default(1),
  limit:        z.coerce.number().int().min(1).max(500, 'Limit cannot exceed 500.').default(10),
  search:       z.string().trim().optional(),
  status:       z.nativeEnum(CustomerStatus, { errorMap: () => ({ message: `status must be one of: ${Object.values(CustomerStatus).join(', ')}.` }) }).optional(),
  customerType: z.nativeEnum(CustomerType,   { errorMap: () => ({ message: `customerType must be one of: ${Object.values(CustomerType).join(', ')}.` }) }).optional(),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;

export const followUpSchema = z.object({
  followUpDate: dateString,
  notes:        z.string({ required_error: 'Notes are required.' }).min(1, 'Notes cannot be empty.').trim(),
});

export type FollowUpInput = z.infer<typeof followUpSchema>;

export const CustomerIdParamSchema = z.object({
  id: z.string().min(1, 'Customer ID is required'),
});

export const CreateCustomerSchema = createCustomerSchema;
export const UpdateCustomerSchema = updateCustomerSchema;
export const ListQuerySchema = listQuerySchema;
export const FollowUpSchema = followUpSchema;
