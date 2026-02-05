import { PrismaClient } from '@prisma/client'

// Debug: log das variáveis de ambiente relacionadas ao banco
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL)
console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20))

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
