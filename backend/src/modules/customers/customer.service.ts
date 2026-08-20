import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import { entitlementService } from '../subscriptions/entitlement.service';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  ListQueryInput,
  FollowUpInput,
} from './customer.schema';

function toDbFields(input: CreateCustomerInput | UpdateCustomerInput) {
  const { customerType, gstNumber, ...rest } = input as CreateCustomerInput & { customerType?: string; gstNumber?: string };
  return {
    ...rest,
    ...(customerType !== undefined && { type: customerType as any }),
    ...(gstNumber    !== undefined && { gstin: gstNumber }),
  };
}

function toResponse(customer: any) {
  const { type, gstin, ...rest } = customer;
  return {
    ...rest,
    customerType: type,
    gstNumber:    gstin,
  };
}

function notFound(id: string): AppError {
  return AppError.notFound('Customer', id);
}

function handleUniqueConstraint(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    const field = (err.meta?.['target'] as string[] | undefined)?.[0] ?? 'field';
    const friendly = field === 'gstin' ? 'GST number' : field;
    throw AppError.badRequest(`A customer with this ${friendly} already exists in your organization.`);
  }
  throw err;
}

export async function createCustomer(organizationId: string, input: CreateCustomerInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Transaction-safe quota assertion
      await entitlementService.assertQuotaAvailable(tx, organizationId, 'customers');

      const customer = await tx.customer.create({
        data: {
          ...toDbFields(input),
          organizationId,
        },
      });

      return toResponse(customer);
    });
  } catch (err) {
    handleUniqueConstraint(err);
  }
}

export async function listCustomers(organizationId: string, query: ListQueryInput) {
  const { page, limit, search, status, customerType } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    organizationId,
    ...(status       && { status: status as any }),
    ...(customerType && { type: customerType as any }),
    ...(search && {
      OR: [
        { name:         { contains: search, mode: 'insensitive' } },
        { mobile:       { contains: search, mode: 'insensitive' } },
        { email:        { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [customers, total] = await Promise.all([
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

export async function getCustomerById(organizationId: string, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId },
  });
  if (!customer) throw notFound(id);
  return toResponse(customer);
}

export async function updateCustomer(organizationId: string, id: string, input: UpdateCustomerInput) {
  const exists = await prisma.customer.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
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

export async function addFollowUp(organizationId: string, id: string, input: FollowUpInput) {
  const exists = await prisma.customer.findFirst({
    where: { id, organizationId },
    select: { id: true },
  });
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
