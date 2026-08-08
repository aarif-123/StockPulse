// Product and Inventory service — business logic.
//
// Single Responsibility:
//   - Product CRUD operations
//   - Database transaction-safe stock movements (IN/OUT)
//   - Product and stock movement history listings

import { Prisma, Product, StockMovement } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
  CreateStockMovementInput,
  MovementQueryInput,
} from './product.schema';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Throws a clean 404 operational error. */
function notFound(id: string, resource = 'Product'): AppError {
  const err: AppError = new Error(`${resource} with id "${id}" not found.`);
  err.statusCode = 404;
  err.isOperational = true;
  return err;
}

/** Maps Prisma unique-constraint violations (like duplicate SKU) to clean 409 Conflict errors. */
function handleUniqueConstraint(err: unknown): never {
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002'
  ) {
    const field = (err.meta?.['target'] as string[] | undefined)?.[0] ?? 'field';
    const friendly = field === 'sku' ? 'SKU' : field;
    const appErr: AppError = new Error(`A product with this ${friendly} already exists.`);
    appErr.statusCode = 409; // 409 Conflict for duplicate SKU
    appErr.isOperational = true;
    throw appErr;
  }
  throw err;
}

// ── Product Services ──────────────────────────────────────────────────────────

/** Creates a new product profile. */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  try {
    const product = await prisma.product.create({
      data: {
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
  } catch (err) {
    handleUniqueConstraint(err);
  }
}

/** Retrieves paginated products with support for search, category, and low stock filters. */
export async function listProducts(query: ProductQueryInput) {
  const { page, limit, search, category, lowStock } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = {
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

  const [products, total] = await prisma.$transaction([
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

/** Retrieves a single product by ID. Throws 404 if not found. */
export async function getProductById(id: string): Promise<Product> {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw notFound(id);
  return product;
}

/** Updates an existing product profile. Specifically ignores/excludes currentStock. */
export async function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  // Ensure product exists
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
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

// ── Stock Movement Services ───────────────────────────────────────────────────

/**
 * Creates a stock movement (IN or OUT) and updates product stock in a single transaction.
 * Throws 400 Bad Request on insufficient stock or invalid operations.
 */
export async function createStockMovement(
  productId: string,
  createdBy: string,
  input: CreateStockMovementInput
): Promise<{ product: Product; movement: StockMovement }> {
  const { type, quantity, reason } = input;

  return prisma.$transaction(async (tx) => {
    // 1. Fetch current product details within transaction context
    const product = await tx.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw notFound(productId);
    }

    // 2. Validate stock capacity if writing an OUT movement
    let newStock = product.currentStock;
    if (type === 'OUT') {
      if (product.currentStock < quantity) {
        const err: AppError = new Error('Insufficient stock.');
        err.statusCode = 400;
        err.isOperational = true;
        throw err;
      }
      newStock -= quantity;
    } else {
      newStock += quantity;
    }

    // 3. Persist the updated stock level on the product
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: { currentStock: newStock },
    });

    // 4. Record the stock movement history entry
    const movement = await tx.stockMovement.create({
      data: {
        productId,
        quantity,
        type,
        reason,
        createdBy,
      },
    });

    return {
      product: updatedProduct,
      movement,
    };
  });
}

/** Retrieves paginated stock movement history entries for a product, sorted newest first. */
export async function listStockMovements(productId: string, query: MovementQueryInput) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  // Check product existence first
  const exists = await prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!exists) throw notFound(productId);

  const where: Prisma.StockMovementWhereInput = { productId };

  const [movements, total] = await prisma.$transaction([
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
            role:  true,
            // passwordHash is omitted for security
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
