import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { CreateItemDto, UpdateItemDto, GetItemsQuery } from '@/types/item';

export class ItemService {
  /**
   * Get all items with pagination and filtering
   */
  async getItems(tenantId: string, query: GetItemsQuery) {
    try {
      const {
        page = 1,
        limit = 20,
        search,
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100); // Max 100 items per request

      // Build where clause
      const where: Prisma.ItemWhereInput = {
        tenantId,
        deletedAt: null,
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) {
        where.status = status;
      }

      // Validate sortBy to prevent injection
      const validSortFields = ['name', 'status', 'createdAt', 'updatedAt'];
      const orderBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      const order = sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc';

      const [items, total] = await Promise.all([
        prisma.item.findMany({
          where,
          skip,
          take,
          orderBy: {
            [orderBy]: order,
          },
          select: {
            id: true,
            name: true,
            description: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.item.count({ where }),
      ]);

      const totalPages = Math.ceil(total / take);

      return {
        success: true,
        data: items,
        meta: {
          page,
          limit: take,
          total,
          totalPages,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError('Database query failed', 500, 'DB_ERROR');
      }
      throw error;
    }
  }

  /**
   * Get single item by ID
   */
  async getItemById(tenantId: string, itemId: string) {
    try {
      const item = await prisma.item.findFirst({
        where: {
          id: itemId,
          tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!item) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError('Database query failed', 500, 'DB_ERROR');
      }
      throw error;
    }
  }

  /**
   * Create new item
   */
  async createItem(tenantId: string, dto: CreateItemDto) {
    try {
      // Check for duplicate name within tenant
      const existingItem = await prisma.item.findFirst({
        where: {
          tenantId,
          name: dto.name,
          deletedAt: null,
        },
      });

      if (existingItem) {
        throw new AppError(
          'Nama item sudah ada',
          409,
          'ITEM_NAME_DUPLICATE'
        );
      }

      const item = await prisma.item.create({
        data: {
          tenantId,
          name: dto.name,
          description: dto.description,
          status: dto.status || 'active',
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        data: item,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError(
            'Nama item sudah ada',
            409,
            'ITEM_NAME_DUPLICATE'
          );
        }
        throw new AppError('Database error', 500, 'DB_ERROR');
      }
      throw error;
    }
  }

  /**
   * Update item
   */
  async updateItem(
    tenantId: string,
    itemId: string,
    dto: UpdateItemDto
  ) {
    try {
      // Verify item exists and belongs to tenant
      const existingItem = await prisma.item.findFirst({
        where: {
          id: itemId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!existingItem) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      // Check for duplicate name if updating name
      if (dto.name && dto.name !== existingItem.name) {
        const duplicateName = await prisma.item.findFirst({
          where: {
            tenantId,
            name: dto.name,
            id: { not: itemId },
            deletedAt: null,
          },
        });

        if (duplicateName) {
          throw new AppError(
            'Nama item sudah ada',
            409,
            'ITEM_NAME_DUPLICATE'
          );
        }
      }

      const updatedItem = await prisma.item.update({
        where: { id: itemId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
          ...(dto.status && { status: dto.status }),
        },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return {
        success: true,
        data: updatedItem,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError('Database error', 500, 'DB_ERROR');
      }
      throw error;
    }
  }

  /**
   * Delete item (soft delete)
   */
  async deleteItem(tenantId: string, itemId: string) {
    try {
      const existingItem = await prisma.item.findFirst({
        where: {
          id: itemId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!existingItem) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      await prisma.item.update({
        where: { id: itemId },
        data: { deletedAt: new Date() },
      });

      return {
        success: true,
        data: { id: itemId, message: 'Item berhasil dihapus' },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError('Database error', 500, 'DB_ERROR');
      }
      throw error;
    }
  }

  /**
   * Bulk delete items
   */
  async bulkDeleteItems(tenantId: string, itemIds: string[]) {
    try {
      if (!itemIds || itemIds.length === 0) {
        throw new AppError(
          'ID item tidak boleh kosong',
          400,
          'INVALID_INPUT'
        );
      }

      if (itemIds.length > 100) {
        throw new AppError(
          'Maksimal 100 item per request',
          400,
          'INVALID_INPUT'
        );
      }

      const result = await prisma.item.updateMany({
        where: {
          id: { in: itemIds },
          tenantId,
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });

      if (result.count === 0) {
        throw new AppError(
          'Tidak ada item yang ditemukan',
          404,
          'ITEM_NOT_FOUND'
        );
      }

      return {
        success: true,
        data: { deletedCount: result.count },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError('Database error', 500, 'DB_ERROR');
      }
      throw error;
    }
  }

  /**
   * Get items count by status
   */
  async getItemsCountByStatus(tenantId: string) {
    try {
      const statuses = ['active', 'inactive', 'archived'];
      const counts = await Promise.all(
        statuses.map((status) =>
          prisma.item.count({
            where: {
              tenantId,
              status,
              deletedAt: null,
            },
          })
        )
      );

      return {
        success: true,
        data: {
          active: counts[0],
          inactive: counts[1],
          archived: counts[2],
          total: counts.reduce((a, b) => a + b, 0),
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw new AppError('Database error', 500, 'DB_ERROR');
      }
      throw error;
    }
  }
}

export const itemService = new ItemService();