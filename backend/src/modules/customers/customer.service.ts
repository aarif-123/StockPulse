// Customer service — all business logic lives here.
//
// Rules:
//   - No Express types (Request / Response) in this file.
//   - Every function has a single clear responsibility.
//   - Prisma queries are written directly — no abstraction layer.
//   - Errors are AppErrors so the centralized handler formats them.

import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListQueryInput,
  FollowUpInput,
} from './customer.schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Maps API input field names to Prisma field names. */
function toDbFields(input: CreateCustomerInput | UpdateCustomerInput) {
  const { customerType, gstNumber, ...rest } = input as CreateCustomerInput & { customerType?: string; gstNumber?: string };
  return {
    ...rest,
    ...(customerType !== undefined && { type: customerType }),
    ...(gstNumber    !== undefined && { gstin: gstNumber }),
  };
}

/** Maps a Prisma Customer row to the API response shape. */
function toResponse(customer: Awaited<ReturnType<typeof prisma.customer.findUniqueOrThrow>>) {
  const { type, gstin, ...rest } = customer;
  return {
    ...rest,
    customerType: type,
    gstNumber:    gstin,
  };
}

/** Throws a clean 404 operational error. */
function notFound(id: string): AppError {
  const err: AppError = new Error(`Customer with id "${id}" not found.`);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

/** Maps Prisma unique-constraint violations to clean 400 errors. */
function handleUniqueConstraint(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    const field = (err.meta?.['target'] as string[] | undefined)?.[0] ?? 'field';
    const friendly = field === 'gstin' ? 'GST number' : field;
    const appErr: AppError = new Error(`A customer with this ${friendly} already exists.`);
    appErr.statusCode = 400;
    appErr.isOperational = true;
    throw appErr;
  }
  throw err;
}

// ── Service functions ─────────────────────────────────────────────────────────

/**
 * Creates a new customer.
 * Handles duplicate email / GST number with a clean 400 error.
 */
export async function createCustomer(input: CreateCustomerInput) {
  try {
    const customer = await prisma.customer.create({
      data: toDbFields(input),
    });
    return toResponse(customer);
  } catch (err) {
    handleUniqueConstraint(err);
  }
}

/**
 * Returns a paginated, filtered, searchable list of customers.
 *
 * Search is case-insensitive across: name, mobile, email, businessName.
 * Filters: status, customerType.
 * Both are combined with AND so all conditions must match.
 *
 * Uses a Prisma $transaction to get data + total count in one round-trip.
 */
export async function listCustomers(query: ListQueryInput) {
  const { page, limit, search, status, customerType } = query;
  const skip = (page - 1) * limit;

  // Build the WHERE clause incrementally — only add conditions that are present
  const where: Prisma.CustomerWhereInput = {
    ...(status       && { status }),
    ...(customerType && { type: customerType }),
    ...(search && {
      OR: [
        { name:         { contains: search, mode: 'insensitive' } },
        { mobile:       { contains: search, mode: 'insensitive' } },
        { email:        { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    data: customers.map(toResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Returns a single customer by ID.
 * Throws 404 if not found.
 */
export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw notFound(id);
  return toResponse(customer);
}

/**
 * Updates a customer's fields.
 * Only provided fields are changed (partial update).
 * Throws 404 if not found.
 */
export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  // Check existence first to return a clean 404 rather than letting Prisma throw
  const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound(id);

  try {
    const customer = await prisma.customer.update({
      where: { id },
      data: toDbFields(input),
    });
    return toResponse(customer);
  } catch (err) {
    handleUniqueConstraint(err);
  }
}

/**
 * Updates a customer's follow-up date and notes.
 * Throws 404 if the customer doesn't exist.
 */
export async function addFollowUp(id: string, input: FollowUpInput) {
  const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw notFound(id);

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      followUpDate: input.followUpDate,
      notes:        input.notes,
    },
  });
  return toResponse(customer);
}
