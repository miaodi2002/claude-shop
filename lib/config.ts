import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url('Invalid database URL'),
  
  // JWT & Auth
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  
  // Encryption
  ENCRYPTION_KEY: z.string().min(44, 'Encryption key must be base64 encoded 32-byte key'),
  
  // Admin
  ADMIN_USERNAME: z.string().min(3, 'Admin username must be at least 3 characters'),
  ADMIN_PASSWORD_HASH: z.string().min(60, 'Admin password hash required'),
  
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CONTACT_USERNAME: z.string().optional(),
  
  // API
  API_RATE_LIMIT_MAX: z.coerce.number().default(100),
  API_RATE_LIMIT_WINDOW: z.coerce.number().default(3600),
  
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

function validateEnv() {
  // 确保在 Node.js 环境中执行
  if (typeof process === 'undefined' || typeof window !== 'undefined') {
    return {} as any // 在浏览器环境中返回空对象
  }
  
  // 在构建时和测试时跳过环境验证
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || process.env.NEXT_PHASE === 'phase-production-build') {
    return process.env as any // 跳过验证
  }
  
  try {
    return envSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
      throw new Error(`Environment validation failed:\n${errors}`)
    }
    throw error
  }
}

export const env = validateEnv()

// 类型安全的环境变量
export type Env = z.infer<typeof envSchema>

// 运行时环境检查
export const isDevelopment = typeof process !== 'undefined' ? process.env.NODE_ENV === 'development' : false
export const isProduction = typeof process !== 'undefined' ? process.env.NODE_ENV === 'production' : false
export const isTest = typeof process !== 'undefined' ? process.env.NODE_ENV === 'test' : false