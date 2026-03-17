/**
 * Don Chat - Database client
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Force new client in development to pick up schema changes
const forceNew = process.env.NODE_ENV !== 'production' && !globalForPrisma.prisma

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Log available models for debugging
if (forceNew) {
  console.log('Prisma client initialized with models:', Object.keys(db).filter(k => !k.startsWith('_') && !k.startsWith('$')))
}
