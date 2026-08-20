import { Prisma, Challan } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import type { CreateChallanInput, ListQueryInput } from './challan.schema';

function notFound(id: string, resource = 'Challan'): AppError {
  return AppError.notFound(resource, id);
}

export async function createChallan(organizationId: string, createdBy: string, input: CreateChallanInput) {
  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId },
  });
  if (!customer) {
    throw notFound(input.customerId, 'Customer');
  }

  let attempts = 3;
  while (attempts > 0) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existingChallans = await tx.challan.findMany({
          where: { organizationId },
          select: { challanNumber: true },
          take: 500,
          orderBy: { createdAt: 'desc' },
        });

        let maxNum = 0;
        for (const c of existingChallans) {
          const match = c.challanNumber.match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        }
        if (maxNum === 0) {
          maxNum = await tx.challan.count({ where: { organizationId } });
        }
        const nextNum = maxNum + 1 + (3 - attempts);
        const challanNumber = `CH-${String(nextNum).padStart(6, '0')}`;

        const productIds = input.items.map((item) => item.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, organizationId },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        for (const item of input.items) {
          if (!productMap.has(item.productId)) {
            throw notFound(item.productId, 'Product');
          }
        }

        let totalQuantity = 0;
        const itemsData = input.items.map((item) => {
          const prod = productMap.get(item.productId)!;
          totalQuantity += item.quantity;
          return {
            productId:   item.productId,
            productName: prod.name,
            sku:         prod.sku,
            unitPrice:   prod.unitPrice,
            quantity:    item.quantity,
          };
        });

        const challan = await tx.challan.create({
          data: {
            organizationId,
            challanNumber,
            customerId:    input.customerId,
            status:        'DRAFT',
            totalQuantity,
            createdBy,
            items: {
              create: itemsData,
            },
          },
          include: {
            items: true,
            customer: true,
          },
        });

        return challan;
      }, { maxWait: 15000, timeout: 30000 });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        attempts--;
        if (attempts === 0) throw err;
      } else {
        throw err;
      }
    }
  }

  throw new Error('Challan creation failed due to repeated concurrency conflicts.');
}

export async function listChallans(organizationId: string, query: ListQueryInput) {
  const { page, limit, status, search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ChallanWhereInput = {
    organizationId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { challanNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { businessName: { contains: search, mode: 'insensitive' } } },
      ],
    }),
  };

  const [challans, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        items: true,
        user: {
          select: {
            id:    true,
            name:  true,
            email: true,
          },
        },
      },
    }),
    prisma.challan.count({ where }),
  ]);

  return {
    data: challans,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getChallanById(organizationId: string, id: string) {
  const challan = await prisma.challan.findFirst({
    where: { id, organizationId },
    include: {
      customer: true,
      items: true,
      user: {
        select: {
          id:    true,
          name:  true,
          email: true,
        },
      },
    },
  });
  if (!challan) throw notFound(id);
  return challan;
}

export async function confirmChallan(organizationId: string, id: string, confirmedBy: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });
    if (!challan) {
      throw notFound(id);
    }

    if (challan.status !== 'DRAFT') {
      throw AppError.badRequest(`Cannot confirm a challan with status ${challan.status}.`);
    }

    const productReq = new Map<string, number>();
    for (const item of challan.items) {
      const current = productReq.get(item.productId) ?? 0;
      productReq.set(item.productId, current + item.quantity);
    }
    const productIds = Array.from(productReq.keys());

    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM products WHERE id IN (${Prisma.join(productIds)}) AND "organizationId" = ${organizationId} FOR UPDATE`
    );

    const products = await tx.product.findMany({
      where: { id: { in: productIds }, organizationId },
      select: { id: true, name: true, currentStock: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const [productId, reqQty] of productReq.entries()) {
      const prod = productMap.get(productId);
      if (!prod) {
        throw notFound(productId, 'Product');
      }
      if (prod.currentStock < reqQty) {
        throw AppError.badRequest(`Insufficient stock for product: ${prod.name}`);
      }
    }

    for (const item of challan.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          organizationId,
          productId: item.productId,
          quantity:  item.quantity,
          type:      'OUT',
          reason:    `Sales challan ${challan.challanNumber}`,
          createdBy: confirmedBy,
        },
      });
    }

    const updatedChallan = await tx.challan.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: {
        items: true,
        customer: true,
      },
    });

    return updatedChallan;
  }, { maxWait: 15000, timeout: 30000 });
}

export async function cancelChallan(organizationId: string, id: string): Promise<Challan> {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findFirst({ where: { id, organizationId } });
    if (!challan) throw notFound(id);

    if (challan.status !== 'DRAFT') {
      throw AppError.badRequest(`Cannot cancel a challan with status ${challan.status}.`);
    }

    const updated = await tx.challan.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }, { maxWait: 15000, timeout: 30000 });
}
