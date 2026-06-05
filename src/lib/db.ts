import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const hasDb = typeof process.env.DATABASE_URL === 'string' && process.env.DATABASE_URL.length > 0;

export const prisma =
  globalForPrisma.prisma ??
  (hasDb ? new PrismaClient() : null) as unknown as PrismaClient;

if (process.env.NODE_ENV !== 'production') {
  if (hasDb) {
    globalForPrisma.prisma = prisma;
  }
}
