import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/AppError';
import { itemsService } from '../services/itemsService';

// Validation schemas
const createItemSchema = z.object({
  name: z.string().min(1, 'Nama harus diisi').max(255),
  description: z.string().min(1, 'Deskripsi harus diisi').max(1000),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

const updateItemSchema = createItemSchema.partial();

const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type CreateItemInput = z.infer<typeof createItemSchema>;
type UpdateItemInput = z.infer<typeof updateItemSchema>;
type QueryParams = z.infer<typeof querySchema>;

export class ItemsController {
  /**
   * Get all items with pagination and filtering
   */
  static getAllItems = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    // Validate query parameters
    const queryParams = querySchema.parse(req.query);
    const { page, limit, search, status, sortBy, sortOrder } = queryParams;

    // Call service layer
    const result = await itemsService.getAllItems({
      tenantId,
      page,
      limit,
      search,
      status,
      sortBy,
      sortOrder,
    });

    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  });

  /**
   * Get single item by ID
   */
  static getItemById = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    const { id } = paramsSchema.parse(req.params);

    const item = await itemsService.getItemById(tenantId, id);
    if (!item) {
      throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  });

  /**
   * Create new item
   */
  static createItem = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    const validatedData = createItemSchema.parse(req.body);

    const item = await itemsService.createItem(tenantId, validatedData);

    res.status(201).json({
      success: true,
      data: item,
    });
  });

  /**
   * Update item by ID
   */
  static updateItem = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    const { id } = paramsSchema.parse(req.params);
    const validatedData = updateItemSchema.parse(req.body);

    const existingItem = await itemsService.getItemById(tenantId, id);
    if (!existingItem) {
      throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
    }

    const updatedItem = await itemsService.updateItem(tenantId, id, validatedData);

    res.status(200).json({
      success: true,
      data: updatedItem,
    });
  });

  /**
   * Delete item by ID (soft delete)
   */
  static deleteItem = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    const { id } = paramsSchema.parse(req.params);

    const existingItem = await itemsService.getItemById(tenantId, id);
    if (!existingItem) {
      throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
    }

    await itemsService.deleteItem(tenantId, id);

    res.status(200).json({
      success: true,
      data: { id, message: 'Item berhasil dihapus' },
    });
  });

  /**
   * Bulk delete items
   */
  static bulkDeleteItems = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    const { ids } = z.object({ ids: z.array(z.number().int().positive()) }).parse(req.body);

    if (ids.length === 0) {
      throw new AppError('Tidak ada item yang dipilih', 400, 'EMPTY_IDS');
    }

    const deletedCount = await itemsService.bulkDeleteItems(tenantId, ids);

    res.status(200).json({
      success: true,
      data: { deletedCount, message: `${deletedCount} item berhasil dihapus` },
    });
  });

  /**
   * Get items by status
   */
  static getItemsByStatus = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    const { status } = z.object({ status: z.enum(['active', 'inactive', 'archived']) }).parse(req.query);
    const { page = 1, limit = 20 } = querySchema.parse(req.query);

    const result = await itemsService.getItemsByStatus(tenantId, status, page, limit);

    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  });

  /**
   * Search items by name or description
   */
  static searchItems = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    const { q } = z.object({ q: z.string().min(1, 'Query harus diisi') }).parse(req.query);
    const { page = 1, limit = 20 } = querySchema.parse(req.query);

    const result = await itemsService.searchItems(tenantId, q, page, limit);

    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    });
  });

  /**
   * Get items analytics
   */
  static getItemsAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      throw new AppError('Tenant ID tidak ditemukan', 400, 'MISSING_TENANT_ID');
    }

    const analytics = await itemsService.getItemsAnalytics(tenantId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  });
}