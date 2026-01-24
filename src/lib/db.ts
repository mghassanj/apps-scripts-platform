import { PrismaClient } from '@/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient
  pool: Pool
}

function createPrismaClient() {
  // Create PostgreSQL connection pool
  const pool = globalForPrisma.pool || new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = pool
  }

  // Create Prisma adapter for PostgreSQL
  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
