import { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { AppError } from '../../middleware/error-handler';
import {
  CreateBomAssemblyInput,
  UpdateBomAssemblyInput,
  BuildBomAssemblyInput,
  QueryBomAssemblyInput,
} from './bom.schema';

export const bomService = {
  /**
   * List all BOM Assemblies with live component stock, calculated assembly capacity, and bottleneck detection.
   */
  async listAssemblies(organizationId: string, query: QueryBomAssemblyInput) {
    const { page = 1, limit = 50, search, category } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BomAssemblyWhereInput = {
      organizationId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const [rawAssemblies, total] = await Promise.all([
      prisma.bomAssembly.findMany({
        where,
        include: {
          components: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  unitPrice: true,
                  currentStock: true,
                  minimumStock: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bomAssembly.count({ where }),
    ]);

    // Calculate dynamic build capacity & bottleneck for each recipe
    const assemblies = rawAssemblies.map((assembly) => {
      let maxCanBuild = Infinity;
      let bottleneckProduct: {
        id: string;
        name: string;
        sku: string;
        currentStock: number;
        qtyRequired: number;
      } | null = null;

      const detailedComponents = assembly.components.map((comp) => {
        const product = comp.product;
        const onHand = product?.currentStock ?? 0;
        const qtyRequired = comp.qtyRequired;
        const possibleUnits = qtyRequired > 0 ? Math.floor(onHand / qtyRequired) : 0;

        if (possibleUnits < maxCanBuild) {
          maxCanBuild = possibleUnits;
          bottleneckProduct = product
            ? {
                id: product.id,
                name: product.name,
                sku: product.sku,
                currentStock: onHand,
                qtyRequired,
              }
            : null;
        }

        return {
          id: comp.id,
          productId: comp.productId,
          productName: product?.name || 'Unknown Product',
          productSku: product?.sku || 'N/A',
          unitPrice: Number(product?.unitPrice || 0),
          currentStock: onHand,
          qtyRequired,
          hasEnoughStock: onHand >= qtyRequired,
        };
      });

      const canAssembleQty = maxCanBuild === Infinity ? 0 : maxCanBuild;
      const totalComponentCost = detailedComponents.reduce(
        (sum, c) => sum + c.unitPrice * c.qtyRequired,
        0
      );

      return {
        id: assembly.id,
        name: assembly.name,
        sku: assembly.sku,
        category: assembly.category,
        description: assembly.description,
        sellingPrice: Number(assembly.sellingPrice),
        totalComponentCost,
        canAssembleQty,
        bottleneckProduct: canAssembleQty === 0 && bottleneckProduct ? bottleneckProduct : undefined,
        components: detailedComponents,
        createdAt: assembly.createdAt,
        updatedAt: assembly.updatedAt,
      };
    });

    return {
      data: assemblies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },

  /**
   * Get single BOM Assembly with full component breakdown
   */
  async getAssemblyById(organizationId: string, id: string) {
    const assembly = await prisma.bomAssembly.findFirst({
      where: { id, organizationId },
      include: {
        components: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!assembly) {
      throw new AppError(404, 'BOM Assembly recipe not found');
    }

    return assembly;
  },

  /**
   * Create a new Bill of Materials recipe
   */
  async createAssembly(organizationId: string, input: CreateBomAssemblyInput) {
    // Check for SKU uniqueness in organization
    const existing = await prisma.bomAssembly.findFirst({
      where: { organizationId, sku: input.sku },
    });

    if (existing) {
      throw new AppError(409, `An assembly with SKU "${input.sku}" already exists in your organization`);
    }

    // Verify all component products belong to this organization
    const productIds = input.components.map((c) => c.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, organizationId },
    });

    if (existingProducts.length !== productIds.length) {
      throw new AppError(400, 'One or more component products do not exist in your organization catalog');
    }

    const assembly = await prisma.bomAssembly.create({
      data: {
        organizationId,
        name: input.name,
        sku: input.sku,
        category: input.category || 'Assemblies',
        description: input.description,
        sellingPrice: input.sellingPrice,
        components: {
          create: input.components.map((c) => ({
            productId: c.productId,
            qtyRequired: c.qtyRequired,
          })),
        },
      },
      include: {
        components: {
          include: {
            product: true,
          },
        },
      },
    });

    return assembly;
  },

  /**
   * Update existing BOM Assembly recipe
   */
  async updateAssembly(organizationId: string, id: string, input: UpdateBomAssemblyInput) {
    const existing = await prisma.bomAssembly.findFirst({
      where: { id, organizationId },
      include: { components: true },
    });

    if (!existing) {
      throw new AppError(404, 'BOM Assembly recipe not found');
    }

    return await prisma.$transaction(async (tx) => {
      // If components are provided, replace them
      if (input.components) {
        await tx.bomComponent.deleteMany({
          where: { assemblyId: id },
        });

        await tx.bomComponent.createMany({
          data: input.components.map((c) => ({
            assemblyId: id,
            productId: c.productId,
            qtyRequired: c.qtyRequired,
          })),
        });
      }

      const updated = await tx.bomAssembly.update({
        where: { id },
        data: {
          name: input.name,
          category: input.category,
          description: input.description,
          sellingPrice: input.sellingPrice,
          isActive: input.isActive,
        },
        include: {
          components: {
            include: {
              product: true,
            },
          },
        },
      });

      return updated;
    });
  },

  /**
   * Delete a BOM Assembly recipe
   */
  async deleteAssembly(organizationId: string, id: string) {
    const existing = await prisma.bomAssembly.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new AppError(404, 'BOM Assembly recipe not found');
    }

    await prisma.bomAssembly.delete({
      where: { id },
    });

    return { message: 'BOM Assembly deleted successfully' };
  },

  /**
   * Atomic Production Assembly Build Run
   * Validates stock, deducts component inventory via StockMovement, and records build log.
   */
  async buildAssembly(
    organizationId: string,
    userId: string,
    assemblyId: string,
    input: BuildBomAssemblyInput
  ) {
    const { quantity = 1, notes } = input;

    return await prisma.$transaction(async (tx) => {
      // 1. Fetch assembly with components
      const assembly = await tx.bomAssembly.findFirst({
        where: { id: assemblyId, organizationId },
        include: {
          components: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!assembly) {
        throw new AppError(404, 'BOM Assembly recipe not found');
      }

      const components = assembly.components;

      if (components.length === 0) {
        throw new AppError(400, 'This assembly recipe has no components defined');
      }

      // 2. Validate stock availability for all components
      for (const comp of components) {
        const totalNeeded = comp.qtyRequired * quantity;
        const available = comp.product?.currentStock ?? 0;

        if (available < totalNeeded) {
          throw new AppError(
            400,
            `Insufficient stock for component "${comp.product?.name}". Needed ${totalNeeded} units, but only ${available} units available in godown.`
          );
        }
      }

      // 3. Atomically decrement stock and create StockMovement records
      for (const comp of components) {
        const totalNeeded = comp.qtyRequired * quantity;

        // Decrement Product stock
        await tx.product.update({
          where: { id: comp.productId },
          data: {
            currentStock: {
              decrement: totalNeeded,
            },
          },
        });

        // Record stock movement audit
        await tx.stockMovement.create({
          data: {
            organizationId,
            productId: comp.productId,
            createdBy: userId,
            quantity: totalNeeded,
            type: 'OUT',
            reason: `BOM Production Assembly: ${quantity}x "${assembly.name}" (${assembly.sku})`,
          },
        });
      }

      // 4. Create BOM Build Log
      const buildLog = await tx.bomBuildLog.create({
        data: {
          organizationId,
          assemblyId,
          userId,
          quantity,
          notes: notes || `Assembled ${quantity}x ${assembly.name}`,
        },
      });

      // 5. Create Audit Log
      await tx.auditLog.create({
        data: {
          organizationId,
          actorUserId: userId,
          action: 'BUILD_BOM_ASSEMBLY',
          resource: 'BomAssembly',
          resourceId: assemblyId,
          metadata: JSON.stringify({
            assemblyName: assembly.name,
            sku: assembly.sku,
            quantityBuilt: quantity,
            componentsDeducted: components.map((c) => ({
              productSku: c.product?.sku,
              deducted: c.qtyRequired * quantity,
            })),
          }),
        },
      });

      return {
        buildLog,
        assemblyName: assembly.name,
        sku: assembly.sku,
        quantityBuilt: quantity,
        message: `Successfully assembled ${quantity}x "${assembly.name}". Components deducted from inventory.`,
      };
    });
  },
};
