import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import rateLimiter from './middleware/rateLimiter';
import authMiddleware from './middleware/auth';
import tenantMiddleware from './middleware/tenant';
import errorHandler from './middleware/errorHandler';
import apiRoutes from './routes/api';
import { AppError } from './utils/errors';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Security Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
}));

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Body Parser Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate Limiter
app.use(rateLimiter);

// Static Files
app.use(express.static(path.join(__dirname, '../public')));

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
    },
  });
});

// Request Logging Middleware (Development)
if (NODE_ENV === 'development') {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// API Routes with Tenant & Auth Middleware
app.use('/api', tenantMiddleware, authMiddleware, apiRoutes);

// Public Routes (Auth endpoints without tenant requirement)
app.use('/api/auth', require('./routes/auth').default);

// 404 Handler
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Rute tidak ditemukan', 404, 'NOT_FOUND'));
});

// SPA Fallback (Must be after API routes)
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Global Error Handler (Must be last)
app.use(errorHandler);

// Graceful Shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`[${signal}] Shutting down gracefully...`);
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Database Initialization & Server Start
const initializeApp = async () => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Database connected');

    const server = app.listen(PORT, () => {
      console.log(`[ENTERPRISE] Aplikasi Ai Enterprise running on port ${PORT}`);
      console.log(`Environment: ${NODE_ENV}`);
    });

    // Handle server errors
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} already in use`);
        process.exit(1);
      }
      throw err;
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Start application
if (require.main === module) {
  initializeApp();
}

export default app;