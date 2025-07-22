import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ? ['query', 'error', 'warn'] : ['error'],
  })

if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// 优雅关闭数据库连接 - 只在 Node.js 环境中执行，避免 Edge Runtime
if (typeof window === 'undefined' && 
    typeof process !== 'undefined' && 
    typeof process.on === 'function' &&
    !process.env.NEXT_RUNTIME) { // 避免在 Edge Runtime 中执行
  try {
    process.on('beforeExit', async () => {
      await prisma.$disconnect()
    })
  } catch (error) {
    // 忽略 Edge Runtime 中的错误
    console.warn('Failed to set up Prisma cleanup handler:', error)
  }
}