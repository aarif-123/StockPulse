// Sales Challan service — business logic.

import { Prisma, Challan } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import type { CreateChallanInput, ListQueryInput } from './challan.schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Throws a clean 404 operational error. */
function notFound(id: string, resource = 'Challan'): AppError {
  const err: AppError = new Error(`${resource} with id "${id}" not found.`);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * Creates a new Challan in DRAFT status with product snapshots.
 * Does not modify product stock.
 * Handles concurrent challanNumber generation safely via transaction and unique-key retries.
 */
export async function createChallan(createdBy: string, input: CreateChallanInput) {
  // 1. Verify customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) {
    throw notFound(input.customerId, 'Customer');
  }

  // 2. Perform retry loop for unique challanNumber creation
  let attempts = 3;
  while (attempts > 0) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Find latest challanNumber and increment
        const latest = await tx.challan.findFirst({
          orderBy: { challanNumber: 'desc' },
          select: { challanNumber: true },
        });

        let nextNum = 1;
        if (latest) {
          const match = latest.challanNumber.match(/^CH-(\d+)$/);
          if (match) {
            nextNum = parseInt(match[1], 10) + 1;
          }
        }
        const challanNumber = `CH-${String(nextNum).padStart(6, '0')}`;

        // Fetch products details for snapshots
        const productIds = input.items.map((item) => item.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });
        const productMap = new Map(products.map((p) => [p.id, p]));

        // Validate that every product exists
        for (const item of input.items) {
          if (!productMap.has(item.productId)) {
            throw notFound(item.productId, 'Product');
          }
        }

        // Calculate totalQuantity and construct item snapshots
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

        // Insert challan record
        const challan = await tx.challan.create({
          data: {
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

/** Retrieves paginated list of challans, sorted newest first. */
export async function listChallans(query: ListQueryInput) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const [challans, total] = await prisma.$transaction([
    prisma.challan.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        user: {
          select: {
            id:    true,
            name:  true,
            email: true,
            role:  true,
          },
        },
      },
    }),
    prisma.challan.count(),
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

/** Retrieves a single challan by ID with items, customer, and creator. */
export async function getChallanById(id: string) {
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      user: {
        select: {
          id:    true,
          name:  true,
          email: true,
          role:  true,
        },
      },
    },
  });
  if (!challan) throw notFound(id);
  return challan;
}

/**
 * Confirms a DRAFT challan in an atomic transaction.
 * 1. Locks the product rows to prevent concurrent double-booking.
 * 2. Checks stock levels.
 * 3. Deducts stock and writes OUT movements for every item.
 * 4. Confirms the challan.
 */
export async function confirmChallan(id: string, confirmedBy: string) {
  return prisma.$transaction(async (tx) => {
    // 1. Fetch Challan details
    const challan = await tx.challan.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!challan) {
      throw notFound(id);
    }

    // 2. State Guard
    if (challan.status !== 'DRAFT') {
      const err: AppError = new Error(`Cannot confirm a challan with status ${challan.status}.`);
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    // 3. Aggregate quantities per product ID to handle duplicate references in the same challan
    const productReq = new Map<string, number>();
    for (const item of challan.items) {
      const current = productReq.get(item.productId) ?? 0;
      productReq.set(item.productId, current + item.quantity);
    }
    const productIds = Array.from(productReq.keys());

    // 4. Concurrency lock: Acquire SELECT FOR UPDATE lock on the affected products
    await tx.$executeRawUnsafe(
      `SELECT id FROM products WHERE id IN (${productIds.map((id) => `'${id}'`).join(',')}) FOR UPDATE`
    );

    // 5. Fetch current stock levels of locked products
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, currentStock: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    // 6. Verify stock availability
    for (const [productId, reqQty] of productReq.entries()) {
      const prod = productMap.get(productId);
      if (!prod) {
        throw notFound(productId, 'Product');
      }
      if (prod.currentStock < reqQty) {
        const err: AppError = new Error(`Insufficient stock for product: ${prod.name}`);
        err.statusCode = 400;
        err.isOperational = true;
        throw err;
      }
    }

    // 7. Deduct stock levels and record OUT movements
    for (const item of challan.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          quantity:  item.quantity,
          type:      'OUT',
          reason:    `Sales challan ${challan.challanNumber}`,
          createdBy: confirmedBy,
        },
      });
    }

    // 8. Update Challan status to CONFIRMED
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

/** Cancels a DRAFT challan. Does not affect stock levels or create movements. */
export async function cancelChallan(id: string): Promise<Challan> {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id } });
    if (!challan) throw notFound(id);

    if (challan.status !== 'DRAFT') {
      const err: AppError = new Error(`Cannot cancel a challan with status ${challan.status}.`);
      err.statusCode = 400;
      err.isOperational = true;
      throw err;
    }

    const updated = await tx.challan.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return updated;
  }, { maxWait: 15000, timeout: 30000 });
}
