import { Prisma, Product, StockMovement } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import { entitlementService } from '../subscriptions/entitlement.service';
import { triggerStockReplenishedNotification, triggerStockLowNotification } from '../notifications/notification.service';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
  CreateStockMovementInput,
  MovementQueryInput,
  BulkImportItemInput,
  DuplicateStrategy,
} from './product.schema';

function notFound(id: string, resource = 'Product'): AppError {
  return AppError.notFound(resource, id);
}

function handleUniqueConstraint(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    const field = (err.meta?.['target'] as string[] | undefined)?.[0] ?? 'field';
    const friendly = field === 'sku' ? 'SKU' : field;
    throw AppError.conflict(`A product with this ${friendly} already exists in your organization.`);
  }
  throw err;
}

export async function createProduct(organizationId: string, input: CreateProductInput): Promise<Product> {
  try {
    return await prisma.$transaction(async (tx) => {
      // Transaction-safe quota assertion
      await entitlementService.assertQuotaAvailable(tx, organizationId, 'products');

      const product = await tx.product.create({
        data: {
          organizationId,
          name:              input.name,
          sku:               input.sku,
          category:          input.category,
          unitPrice:         input.unitPrice,
          currentStock:      input.currentStock,
          minimumStock:      input.minimumStock,
          warehouseLocation: input.warehouseLocation,
        },
      });
      return product;
    });
  } catch (err) {
    handleUniqueConstraint(err);
  }
}

export async function bulkImportProducts(
  organizationId: string,
  items: BulkImportItemInput[],
  isWarehouse: boolean = false,
  duplicateStrategy: DuplicateStrategy = 'MERGE_STOCK'
): Promise<{ importedCount: number; updatedCount?: number; products: Product[] }> {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch existing products map for this organization
      const existingProducts = await tx.product.findMany({
        where: { organizationId },
      });
      const existingMap = new Map<string, Product>(
        existingProducts.map((p) => [p.sku.trim().toUpperCase(), p])
      );

      // Count new SKUs for quota assertion
      const newItems = items.filter(
        (item) => !existingMap.has(item.sku.trim().toUpperCase())
      );

      if (newItems.length > 0) {
        await entitlementService.assertQuotaAvailable(tx, organizationId, 'products', newItems.length);
      }

      const processedProducts: Product[] = [];
      const batchSeenSkus = new Set<string>();
      let importedCount = 0;
      let updatedCount = 0;

      for (const item of items) {
        const formattedSku = item.sku.trim().toUpperCase();

        if (batchSeenSkus.has(formattedSku)) {
          if (duplicateStrategy === 'STRICT') {
            throw AppError.conflict(`Duplicate SKU "${formattedSku}" found multiple times in the import file.`);
          }
          // Skip subsequent row duplicates inside the same file
          continue;
        }
        batchSeenSkus.add(formattedSku);

        const existing = existingMap.get(formattedSku);

        if (existing) {
          if (duplicateStrategy === 'STRICT') {
            throw AppError.conflict(`Product SKU "${formattedSku}" already exists in your organization catalog.`);
          }
          if (duplicateStrategy === 'SKIP_DUPLICATES') {
            continue;
          }

          if (duplicateStrategy === 'MERGE_STOCK') {
            // MERGE_STOCK: Increase current stock & update location/price if provided
            const newStock = existing.currentStock + item.currentStock;
            const updated = await tx.product.update({
              where: { id: existing.id },
              data: {
                currentStock: newStock,
                ...(item.category && { category: item.category.trim() }),
                ...(!isWarehouse && item.unitPrice > 0 && { unitPrice: item.unitPrice }),
                ...(item.warehouseLocation && { warehouseLocation: item.warehouseLocation.trim() }),
              },
            });

            // Create audit stock movement if stock added
            if (item.currentStock > 0) {
              const actorUser = await tx.organizationMembership.findFirst({
                where: { organizationId, status: 'ACTIVE' },
                select: { userId: true },
              });
              if (actorUser) {
                await tx.stockMovement.create({
                  data: {
                    organizationId,
                    productId: existing.id,
                    quantity: item.currentStock,
                    type: 'IN',
                    reason: 'Bulk CSV/Excel Stock Import Merge',
                    createdBy: actorUser.userId,
                  },
                });
              }
            }

            processedProducts.push(updated);
            updatedCount++;
          } else if (duplicateStrategy === 'REPLACE_ALL') {
            const updated = await tx.product.update({
              where: { id: existing.id },
              data: {
                name: item.name.trim(),
                category: item.category.trim(),
                ...(!isWarehouse && { unitPrice: item.unitPrice }),
                currentStock: item.currentStock,
                minimumStock: item.minimumStock,
                warehouseLocation: item.warehouseLocation.trim(),
              },
            });
            processedProducts.push(updated);
            updatedCount++;
          }
        } else {
          // Create new product
          const created = await tx.product.create({
            data: {
              organizationId,
              name: item.name.trim(),
              sku: formattedSku,
              category: item.category.trim(),
              unitPrice: isWarehouse ? 0 : item.unitPrice,
              currentStock: item.currentStock,
              minimumStock: item.minimumStock,
              warehouseLocation: item.warehouseLocation.trim(),
            },
          });
          processedProducts.push(created);
          importedCount++;
        }
      }

      return {
        importedCount,
        updatedCount,
        products: processedProducts,
      };
    }, { timeout: 30_000 });
  } catch (err) {
    handleUniqueConstraint(err);
  }
}

export async function listProducts(organizationId: string, query: ProductQueryInput) {
  const { page, limit, search, category, lowStock } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
    organizationId,
    ...(category && { category: { equals: category, mode: 'insensitive' } }),
    ...(lowStock && {
      currentStock: {
        lte: prisma.product.fields.minimumStock,
      },
    }),
    ...(search && {
      OR: [
        { name:     { contains: search, mode: 'insensitive' } },
        { sku:      { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProductById(organizationId: string, id: string): Promise<Product> {
  const product = await prisma.product.findFirst({ where: { id, organizationId } });
  if (!product) throw notFound(id);
  return product;
}

export async function updateProduct(organizationId: string, id: string, input: UpdateProductInput): Promise<Product> {
  const exists = await prisma.product.findFirst({ where: { id, organizationId }, select: { id: true } });
  if (!exists) throw notFound(id);

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(input.name              !== undefined && { name: input.name }),
        ...(input.sku               !== undefined && { sku: input.sku }),
        ...(input.category          !== undefined && { category: input.category }),
        ...(input.unitPrice         !== undefined && { unitPrice: input.unitPrice }),
        ...(input.minimumStock      !== undefined && { minimumStock: input.minimumStock }),
        ...(input.warehouseLocation !== undefined && { warehouseLocation: input.warehouseLocation }),
      },
    });
    return product;
  } catch (err) {
    handleUniqueConstraint(err);
  }
}

export async function createStockMovement(
  organizationId: string,
  productId: string,
  createdBy: string,
  input: CreateStockMovementInput
): Promise<{ product: Product; movement: StockMovement }> {
  const { type, quantity, reason } = input;

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) {
      throw notFound(productId);
    }

    let newStock = product.currentStock;
    if (type === 'OUT') {
      if (product.currentStock < quantity) {
        throw AppError.badRequest('Insufficient stock.');
      }
      newStock -= quantity;
    } else {
      newStock += quantity;
    }

    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    const movement = await tx.stockMovement.create({
      data: {
        organizationId,
        productId,
        quantity,
        type,
        reason,
        createdBy,
      },
    });

    if (type === 'IN') {
      triggerStockReplenishedNotification(organizationId, updatedProduct.name, quantity, updatedProduct.currentStock, productId).catch(() => {});
    } else if (updatedProduct.currentStock <= updatedProduct.reorderPoint) {
      triggerStockLowNotification(organizationId, updatedProduct.name, updatedProduct.currentStock, updatedProduct.reorderPoint, productId).catch(() => {});
    }

    return {
      product: updatedProduct,
      movement,
    };
  }, { timeout: 15_000 });
}

export async function listStockMovements(organizationId: string, productId: string, query: MovementQueryInput) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const exists = await prisma.product.findFirst({ where: { id: productId, organizationId }, select: { id: true } });
  if (!exists) throw notFound(productId);

  const where: Prisma.StockMovementWhereInput = { productId, organizationId };

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id:    true,
            name:  true,
            email: true,
          },
        },
      },
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    data: movements,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
