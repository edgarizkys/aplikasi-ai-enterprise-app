import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';

export class ItemsRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    tenantId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      status?: string;
    }
  ) {
    const { page, limit, search, status } = options;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.itemsWhereInput = {
      tenantId,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.items.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.items.count({ where: whereClause }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number, tenantId: string) {
    const item = await this.prisma.items.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!item) {
      throw new AppError('Item tidak ditemukan', 'ITEM_NOT_FOUND', 404);
    }

    return item;
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      description: string;
      status: string;
    }
  ) {
    const item = await this.prisma.items.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        status: data.status,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return item;
  }

  async update(
    id: number,
    tenantId: string,
    data: Partial<{
      name: string;
      description: string;
      status: string;
    }>
  ) {
    const item = await this.findById(id, tenantId);

    const updatedItem = await this.prisma.items.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return updatedItem;
  }

  async delete(id: number, tenantId: string) {
    const item = await this.findById(id, tenantId);

    const deletedItem = await this.prisma.items.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return deletedItem;
  }

  async hardDelete(id: number, tenantId: string) {
    const item = await this.findById(id, tenantId);

    await this.prisma.items.delete({
      where: { id },
    });
  }

  async getStatistics(tenantId: string) {
    const [totalItems, activeItems, inactiveItems] = await Promise.all([
      this.prisma.items.count({
        where: { tenantId, deletedAt: null },
      }),
      this.prisma.items.count({
        where: { tenantId, status: 'active', deletedAt: null },
      }),
      this.prisma.items.count({
        where: { tenantId, status: 'inactive', deletedAt: null },
      }),
    ]);

    return {
      totalItems,
      activeItems,
      inactiveItems,
    };
  }
}