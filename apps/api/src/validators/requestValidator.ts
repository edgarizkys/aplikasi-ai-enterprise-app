import { z } from 'zod';

// Common schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const tenantIdSchema = z.object({
  tenantId: z.string().uuid(),
});

// Item validation schemas
export const createItemSchema = z.object({
  name: z.string()
    .min(1, 'Nama harus diisi')
    .max(255, 'Nama maksimal 255 karakter')
    .trim(),
  description: z.string()
    .max(1000, 'Deskripsi maksimal 1000 karakter')
    .trim()
    .optional()
    .nullable(),
  status: z.string()
    .min(1, 'Status harus diisi')
    .max(50, 'Status maksimal 50 karakter')
    .trim(),
});

export const updateItemSchema = createItemSchema.partial();

export const getItemsQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  name: z.string().optional(),
});

export const bulkDeleteItemSchema = z.object({
  ids: z.array(z.number().int().positive())
    .min(1, 'Minimal 1 item untuk dihapus')
    .max(100, 'Maksimal 100 item untuk dihapus sekaligus'),
});

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string()
    .email('Format email tidak valid')
    .toLowerCase(),
  password: z.string()
    .min(6, 'Password minimal 6 karakter'),
});

export const registerSchema = z.object({
  email: z.string()
    .email('Format email tidak valid')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  name: z.string()
    .min(2, 'Nama minimal 2 karakter')
    .max(100, 'Nama maksimal 100 karakter')
    .trim(),
  tenantName: z.string()
    .min(2, 'Nama organisasi minimal 2 karakter')
    .max(100, 'Nama organisasi maksimal 100 karakter')
    .trim(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string()
    .min(1, 'Refresh token harus diisi'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string()
    .min(1, 'Password saat ini harus diisi'),
  newPassword: z.string()
    .min(8, 'Password baru minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Password baru tidak cocok',
  path: ['confirmPassword'],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'Password baru harus berbeda dengan password lama',
  path: ['newPassword'],
});

// Dashboard/Analytics validation schemas
export const analyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  metric: z.string().optional(),
});

export const dashboardFilterSchema = z.object({
  dateRange: z.enum(['today', 'week', 'month', 'year', 'custom']).default('month'),
  customStartDate: z.string().datetime().optional(),
  customEndDate: z.string().datetime().optional(),
  status: z.string().optional(),
}).refine(
  (data) => {
    if (data.dateRange === 'custom') {
      return data.customStartDate && data.customEndDate;
    }
    return true;
  },
  {
    message: 'Tanggal harus diisi untuk rentang kustom',
    path: ['customStartDate'],
  }
);

// Export types
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type IdParam = z.infer<typeof idParamSchema>;
export type TenantId = z.infer<typeof tenantIdSchema>;

export type CreateItemRequest = z.infer<typeof createItemSchema>;
export type UpdateItemRequest = z.infer<typeof updateItemSchema>;
export type GetItemsQuery = z.infer<typeof getItemsQuerySchema>;
export type BulkDeleteItemRequest = z.infer<typeof bulkDeleteItemSchema>;

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type RefreshTokenRequest = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
export type DashboardFilter = z.infer<typeof dashboardFilterSchema>;

// Validator helper functions
export const validateRequestBody = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: message };
    }
    return { success: false, error: 'Validasi gagal' };
  }
};

export const validateQueryParams = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: message };
    }
    return { success: false, error: 'Query params tidak valid' };
  }
};

export const validateRouteParams = <T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; error?: string } => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: message };
    }
    return { success: false, error: 'Parameter rute tidak valid' };
  }
};