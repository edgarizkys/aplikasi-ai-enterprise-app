import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/appError';

export class ItemRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(
    tenantId: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    } = {}
  ) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const where: Prisma.ItemWhereInput = {
      tenantId,
      deletedAt: null,
      ...(options.search && {
        OR: [
          { name: { contains: options.search, mode: 'insensitive' } },
          { description: { contains: options.search, mode: 'insensitive' } },
        ],
      }),
      ...(options.status && { status: options.status }),
    };

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          tenantId: true,
          name: true,
          description: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.item.count({ where }),
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

  async findById(id: string, tenantId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
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
    const item = await this.prisma.item.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        status: data.status,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return item;
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
    }
  ) {
    const item = await this.findById(id, tenantId);

    const updated = await this.prisma.item.update({
      where: { id },
      data: {
        name: data.name ?? item.name,
        description: data.description ?? item.description,
        status: data.status ?? item.status,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async softDelete(id: string, tenantId: string) {
    await this.findById(id, tenantId);

    const deleted = await this.prisma.item.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    return deleted;
  }

  async hardDelete(id: string, tenantId: string) {
    await this.findById(id, tenantId);

    await this.prisma.item.delete({
      where: { id },
    });

    return { success: true };
  }

  async restore(id: string, tenantId: string) {
    const item = await this.prisma.item.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: { not: null },
      },
    });

    if (!item) {
      throw new AppError('Item yang dihapus tidak ditemukan', 404, 'ITEM_NOT_FOUND');
    }

    const restored = await this.prisma.item.update({
      where: { id },
      data: {
        deletedAt: null,
      },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return restored;
  }

  async findByStatus(tenantId: string, status: string, limit: number = 10) {
    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        status,
        deletedAt: null,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return items;
  }

  async countByTenant(tenantId: string) {
    const count = await this.prisma.item.count({
      where: {
        tenantId,
        deletedAt: null,
      },
    });

    return count;
  }

  async countByStatus(tenantId: string, status: string) {
    const count = await this.prisma.item.count({
      where: {
        tenantId,
        status,
        deletedAt: null,
      },
    });

    return count;
  }
}