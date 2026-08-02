import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { itemService } from '../services/itemService';
import { asyncHandler } from '../middleware/asyncHandler';
import { AppError } from '../utils/errors';
import { validateRequest } from '../middleware/validation';

// Validation schemas
const createItemSchema = z.object({
  name: z.string().min(1, 'Nama harus diisi').max(255),
  description: z.string().max(1000).optional().default(''),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
});

const updateItemSchema = createItemSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Minimal satu field harus diupdate' }
);

const listItemsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  search: z.string().max(255).optional(),
});

const itemIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

type CreateItemInput = z.infer<typeof createItemSchema>;
type UpdateItemInput = z.infer<typeof updateItemSchema>;
type ListItemsQuery = z.infer<typeof listItemsSchema>;

export const itemController = {
  // Get all items with pagination
  getAllItems: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      
      const query = listItemsSchema.parse(req.query);
      
      const result = await itemService.getAllItems(tenantId, {
        page: query.page,
        limit: query.limit,
        status: query.status,
        search: query.search,
      });

      res.json({
        success: true,
        data: result.data,
        meta: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          pages: Math.ceil(result.total / query.limit),
        },
      });
    }
  ),

  // Get single item by ID
  getItemById: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = itemIdSchema.parse(req.params);

      const item = await itemService.getItemById(tenantId, id);

      if (!item) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      res.json({
        success: true,
        data: item,
      });
    }
  ),

  // Create new item
  createItem: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      
      const validatedData = createItemSchema.parse(req.body);

      const item = await itemService.createItem(tenantId, validatedData);

      res.status(201).json({
        success: true,
        data: item,
      });
    }
  ),

  // Update item
  updateItem: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = itemIdSchema.parse(req.params);

      const validatedData = updateItemSchema.parse(req.body);

      const existingItem = await itemService.getItemById(tenantId, id);

      if (!existingItem) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      const updatedItem = await itemService.updateItem(tenantId, id, validatedData);

      res.json({
        success: true,
        data: updatedItem,
      });
    }
  ),

  // Delete item (soft delete)
  deleteItem: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = itemIdSchema.parse(req.params);

      const existingItem = await itemService.getItemById(tenantId, id);

      if (!existingItem) {
        throw new AppError('Item tidak ditemukan', 404, 'ITEM_NOT_FOUND');
      }

      await itemService.deleteItem(tenantId, id);

      res.json({
        success: true,
        data: { id, message: 'Item berhasil dihapus' },
      });
    }
  ),

  // Bulk delete items
  bulkDeleteItems: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string;

      const { ids } = z
        .object({
          ids: z.array(z.number().int().positive()).min(1),
        })
        .parse(req.body);

      const deletedCount = await itemService.bulkDeleteItems(tenantId, ids);

      res.json({
        success: true,
        data: { deletedCount, message: `${deletedCount} item berhasil dihapus` },
      });
    }
  ),

  // Get analytics
  getAnalytics: asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const tenantId = req.headers['x-tenant-id'] as string;

      const analytics = await itemService.getAnalytics(tenantId);

      res.json({
        success: true,
        data: analytics,
      });
    }
  ),
};