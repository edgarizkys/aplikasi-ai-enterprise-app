import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../utils/errors';
import { CreateItemDto, UpdateItemDto, GetItemsQueryDto } from '../dtos/items.dto';

export class ItemsService {
  /**
   * Get all items with pagination and filtering
   */
  async getItems(tenantId: string, query: GetItemsQueryDto) {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      const whereClause: Prisma.itemsWhereInput = {
        tenant_id: tenantId,
        deletedAt: null,
      };

      if (query.search) {
        whereClause.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      if (query.status) {
        whereClause.status = query.status;
      }

      const [items, total] = await Promise.all([
        prisma.items.findMany({
          where: whereClause,
          skip: offset,
          take: limit,
          orderBy: {
            created_at: 'desc',
          },
        }),
        prisma.items.count({
          where: whereClause,
        }),
      ]);

      return {
        data: items,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError('Gagal mengambil daftar item', 500, 'GET_ITEMS_ERROR');
    }
  }

  /**
   * Get single item by ID
   */
  async getItemById(tenantId: string, itemId: number) {
    try {
      const item = await prisma.items.findFirst({
        where: {
          id: itemId,
          tenant_id: tenantId,
          deletedAt: null,
        },
      });

      if (!item) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      return item;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Gagal mengambil detail item', 500, 'GET_ITEM_ERROR');
    }
  }

  /**
   * Create new item
   */
  async createItem(tenantId: string, dto: CreateItemDto) {
    try {
      const item = await prisma.items.create({
        data: {
          tenant_id: tenantId,
          name: dto.name,
          description: dto.description,
          status: dto.status || 'active',
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return item;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('Item dengan nama ini sudah ada', 409, 'ITEM_DUPLICATE');
        }
      }
      throw new AppError('Gagal membuat item', 500, 'CREATE_ITEM_ERROR');
    }
  }

  /**
   * Update existing item
   */
  async updateItem(tenantId: string, itemId: number, dto: UpdateItemDto) {
    try {
      const item = await prisma.items.findFirst({
        where: {
          id: itemId,
          tenant_id: tenantId,
          deletedAt: null,
        },
      });

      if (!item) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      const updatedItem = await prisma.items.update({
        where: { id: itemId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description && { description: dto.description }),
          ...(dto.status && { status: dto.status }),
          updated_at: new Date(),
        },
      });

      return updatedItem;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new AppError('Item dengan nama ini sudah ada', 409, 'ITEM_DUPLICATE');
        }
      }
      throw new AppError('Gagal memperbarui item', 500, 'UPDATE_ITEM_ERROR');
    }
  }

  /**
   * Soft delete item
   */
  async deleteItem(tenantId: string, itemId: number) {
    try {
      const item = await prisma.items.findFirst({
        where: {
          id: itemId,
          tenant_id: tenantId,
          deletedAt: null,
        },
      });

      if (!item) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      const deletedItem = await prisma.items.update({
        where: { id: itemId },
        data: {
          deletedAt: new Date(),
          updated_at: new Date(),
        },
      });

      return deletedItem;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Gagal menghapus item', 500, 'DELETE_ITEM_ERROR');
    }
  }

  /**
   * Get items analytics
   */
  async getItemsAnalytics(tenantId: string) {
    try {
      const totalItems = await prisma.items.count({
        where: {
          tenant_id: tenantId,
          deletedAt: null,
        },
      });

      const statusDistribution = await prisma.items.groupBy({
        by: ['status'],
        where: {
          tenant_id: tenantId,
          deletedAt: null,
        },
        _count: {
          id: true,
        },
      });

      const recentItems = await prisma.items.findMany({
        where: {
          tenant_id: tenantId,
          deletedAt: null,
        },
        orderBy: {
          created_at: 'desc',
        },
        take: 5,
      });

      return {
        total: totalItems,
        statusDistribution: statusDistribution.map((item) => ({
          status: item.status,
          count: item._count.id,
        })),
        recentItems,
      };
    } catch (error) {
      throw new AppError('Gagal mengambil analitik item', 500, 'ANALYTICS_ERROR');
    }
  }

  /**
   * Batch delete items
   */
  async batchDeleteItems(tenantId: string, itemIds: number[]) {
    try {
      const result = await prisma.items.updateMany({
        where: {
          id: { in: itemIds },
          tenant_id: tenantId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          updated_at: new Date(),
        },
      });

      if (result.count === 0) {
        throw new AppError('Tidak ada item yang dihapus', 400, 'NO_ITEMS_DELETED');
      }

      return {
        count: result.count,
        message: `${result.count} item berhasil dihapus`,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Gagal menghapus item secara batch', 500, 'BATCH_DELETE_ERROR');
    }
  }
}

export const itemsService = new ItemsService();