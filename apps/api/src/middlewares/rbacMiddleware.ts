import { Request, Response, NextFunction } from 'express';
import { AppError } from './AppError';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    email: string;
    role: string;
    permissions: string[];
  };
}

export type RolePermissionMap = Record<string, string[]>;

const rolePermissionMap: RolePermissionMap = {
  admin: [
    'items:create',
    'items:read',
    'items:update',
    'items:delete',
    'items:export',
    'analytics:view',
    'dashboard:view',
    'users:manage',
    'roles:manage',
  ],
  manager: [
    'items:create',
    'items:read',
    'items:update',
    'analytics:view',
    'dashboard:view',
    'reports:generate',
  ],
  user: [
    'items:read',
    'dashboard:view',
  ],
};

export const rbacMiddleware = (requiredPermissions: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Autentikasi diperlukan', 401, 'UNAUTHORIZED');
      }

      const permissions = Array.isArray(requiredPermissions)
        ? requiredPermissions
        : [requiredPermissions];

      const userRole = req.user.role;
      const userPermissions = rolePermissionMap[userRole] || [];

      const hasPermission = permissions.some((permission) =>
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        throw new AppError(
          'Anda tidak memiliki izin untuk mengakses resource ini',
          403,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Terjadi kesalahan pada server',
        },
      });
    }
  };
};

export const hasRole = (allowedRoles: string | string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Autentikasi diperlukan', 401, 'UNAUTHORIZED');
      }

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (!roles.includes(req.user.role)) {
        throw new AppError(
          'Role Anda tidak memiliki akses ke resource ini',
          403,
          'FORBIDDEN'
        );
      }

      next();
    } catch (error) {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Terjadi kesalahan pada server',
        },
      });
    }
  };
};

export const checkTenantAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new AppError('Autentikasi diperlukan', 401, 'UNAUTHORIZED');
    }

    const tenantIdFromParam = req.params.tenantId;
    const tenantIdFromUser = req.user.tenantId;

    if (tenantIdFromParam && tenantIdFromParam !== tenantIdFromUser) {
      throw new AppError(
        'Anda tidak memiliki akses ke tenant ini',
        403,
        'FORBIDDEN'
      );
    }

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Terjadi kesalahan pada server',
      },
    });
  }
};

export const getRolePermissions = (role: string): string[] => {
  return rolePermissionMap[role] || [];
};

export const addRolePermission = (role: string, permission: string): void => {
  if (!rolePermissionMap[role]) {
    rolePermissionMap[role] = [];
  }
  if (!rolePermissionMap[role].includes(permission)) {
    rolePermissionMap[role].push(permission);
  }
};

export const removeRolePermission = (role: string, permission: string): void => {
  if (rolePermissionMap[role]) {
    rolePermissionMap[role] = rolePermissionMap[role].filter(
      (p) => p !== permission
    );
  }
};