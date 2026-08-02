import { PrismaClient } from '@prisma/client';
import { Logger } from './logger';

const logger = new Logger('Database');

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'stdout',
      level: 'error',
    },
    {
      emit: 'stdout',
      level: 'warn',
    },
  ],
});

prisma.$on('query', (e) => {
  logger.debug(`Query: ${e.query} [${e.duration}ms]`);
});

export async function initializeDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Test connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection verified');
  } catch (error) {
    logger.error('Failed to connect to database', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

export { prisma };