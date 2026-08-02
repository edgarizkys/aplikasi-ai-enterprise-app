import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';

export interface AuthUser {
  id: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  tenantId: string;
  name: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      tenantId?: string;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      if (process.env.NODE_ENV === 'development') {
        req.user = {
          id: 'demo-user-1',
          email: 'demo@example.com',
          role: 'admin',
          tenantId: 'default-tenant',
          name: 'Demo User',
        };
        req.tenantId = 'default-tenant';
        return next();
      }
      throw new AppError('Token tidak ditemukan', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token telah kadaluarsa', 401, 'TOKEN_EXPIRED'));
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Token tidak valid', 401, 'INVALID_TOKEN'));
    } else if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError('Autentikasi gagal', 401, 'AUTH_FAILED'));
    }
  }
};

export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    req.user = decoded;
    req.tenantId = decoded.tenantId;
    
    next();
  } catch (error) {
    next();
  }
};

export const requireRole = (allowedRoles: AuthUser['role'][]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Pengguna tidak terautentikasi', 401, 'UNAUTHORIZED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError('Anda tidak memiliki akses ke resource ini', 403, 'FORBIDDEN'));
      return;
    }

    next();
  };
};

export const verifyRefreshToken = (token: string): AuthUser => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    throw new AppError('Token refresh tidak valid', 401, 'INVALID_REFRESH_TOKEN');
  }
};

export const generateAccessToken = (user: Omit<AuthUser, 'iat' | 'exp'>): string => {
  return jwt.sign(user, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '15m',
  });
};

export const generateRefreshToken = (user: Omit<AuthUser, 'iat' | 'exp'>): string => {
  return jwt.sign(user, JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  });
};

export const tenantMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    next(new AppError('Pengguna tidak terautentikasi', 401, 'UNAUTHORIZED'));
    return;
  }

  req.tenantId = req.user.tenantId;
  next();
};