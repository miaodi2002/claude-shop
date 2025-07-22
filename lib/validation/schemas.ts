import { z } from 'zod'

// 基础验证规则
export const idSchema = z.string().uuid('Invalid ID format')
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1).max(100, 'Limit must be between 1 and 100').default(12),
})

// 管理员认证
export const adminLoginSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must not exceed 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must not exceed 100 characters'),
})

// AWS 账户相关
export const accountStatusSchema = z.enum(['AVAILABLE', 'SOLD', 'MAINTENANCE'])
export const quotaLevelSchema = z.enum(['HIGH', 'MEDIUM', 'LOW'])
export const modelTypeSchema = z.enum([
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229', 
  'claude-3-haiku-20240307',
  'claude-2.1',
  'claude-2.0',
  'claude-instant-1.2'
])

// 账户查询参数
export const accountQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  models: z.string().optional(),
  quotaLevel: quotaLevelSchema.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.coerce.boolean().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'created_asc', 'created_desc']).default('created_desc'),
})

// 创建账户
export const createAccountSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name is required')
    .max(100, 'Display name must not exceed 100 characters'),
  description: z.string()
    .max(500, 'Description must not exceed 500 characters')
    .optional(),
  priceAmount: z.number()
    .min(0, 'Price must be non-negative'),
  priceCurrency: z.string()
    .length(3, 'Currency must be 3 characters')
    .default('USD'),
  quotaLevel: quotaLevelSchema,
  status: accountStatusSchema.default('AVAILABLE'),
  awsCredentials: z.object({
    accessKeyId: z.string()
      .min(16, 'AWS Access Key ID must be at least 16 characters')
      .max(128, 'AWS Access Key ID must not exceed 128 characters'),
    secretAccessKey: z.string()
      .min(40, 'AWS Secret Access Key must be at least 40 characters')
      .max(128, 'AWS Secret Access Key must not exceed 128 characters'),
    region: z.string()
      .min(1, 'AWS region is required')
      .default('us-east-1'),
  }),
  quotas: z.array(z.object({
    modelType: modelTypeSchema,
    totalQuota: z.number().int().min(0),
    usedQuota: z.number().int().min(0).default(0),
    isAvailable: z.boolean().default(true),
  })).min(1, 'At least one quota is required'),
})

// 更新账户
export const updateAccountSchema = createAccountSchema.partial().omit({
  awsCredentials: true,
})

// AWS 凭证更新
export const updateCredentialsSchema = z.object({
  accessKeyId: z.string()
    .min(16, 'AWS Access Key ID must be at least 16 characters')
    .max(128, 'AWS Access Key ID must not exceed 128 characters'),
  secretAccessKey: z.string()
    .min(40, 'AWS Secret Access Key must be at least 40 characters')
    .max(128, 'AWS Secret Access Key must not exceed 128 characters'),
  region: z.string()
    .min(1, 'AWS region is required'),
})

// 配额刷新
export const refreshQuotaSchema = z.object({
  quotas: z.array(z.object({
    modelType: modelTypeSchema,
    totalQuota: z.number().int().min(0),
    usedQuota: z.number().int().min(0),
    isAvailable: z.boolean(),
  })).min(1, 'At least one quota is required'),
})

// API 响应类型
export const accountListingSchema = z.object({
  id: idSchema,
  displayName: z.string(),
  description: z.string().nullable(),
  price: z.object({
    amount: z.number(),
    currency: z.string(),
  }),
  quotaLevel: quotaLevelSchema,
  primaryModels: z.array(z.string()),
  stockAvailable: z.boolean(),
  createdAt: z.string().datetime(),
})

export const accountDetailSchema = accountListingSchema.extend({
  quotas: z.array(z.object({
    modelType: modelTypeSchema,
    totalQuota: z.number(),
    usedQuota: z.number(),
    availableQuota: z.number(),
    isAvailable: z.boolean(),
  })),
  status: accountStatusSchema,
})

// 管理员审计日志
export const auditLogSchema = z.object({
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  metadata: z.record(z.unknown()).optional(),
})

// 通用排序参数验证
export function validateSortBy(sortBy: string): { field: string; direction: 'asc' | 'desc' } {
  const [field, direction] = sortBy.split('_')
  
  const validFields = ['price', 'created', 'updated', 'name']
  const validDirections = ['asc', 'desc']
  
  if (!validFields.includes(field) || !validDirections.includes(direction)) {
    throw new Error('Invalid sort parameters')
  }
  
  return { field, direction: direction as 'asc' | 'desc' }
}

// Claude 账户相关
export const claudeAccountStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING'])
export const claudeTierSchema = z.enum(['FREE', 'PRO', 'ENTERPRISE'])

// 创建 Claude 账户
export const createClaudeAccountSchema = z.object({
  apiKey: z.string()
    .min(1, 'API key is required')
    .max(500, 'API key must not exceed 500 characters'),
  accountName: z.string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must not exceed 100 characters'),
  email: z.string()
    .email('Invalid email format')
    .optional(),
  organization: z.string()
    .max(100, 'Organization must not exceed 100 characters')
    .optional(),
  tier: claudeTierSchema.optional(),
  usageLimit: z.number()
    .positive('Usage limit must be positive')
    .optional(),
  features: z.union([
    z.string().transform((str, ctx) => {
      if (!str || str.trim() === '') return undefined
      try {
        return JSON.parse(str)
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Features must be valid JSON',
        })
        return z.NEVER
      }
    }),
    z.object({}).passthrough()
  ]).optional(),
  metadata: z.union([
    z.string().transform((str, ctx) => {
      if (!str || str.trim() === '') return undefined
      try {
        return JSON.parse(str)
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Metadata must be valid JSON',
        })
        return z.NEVER
      }
    }),
    z.object({}).passthrough()
  ]).optional()
})

// 更新 Claude 账户（不包括 apiKey，但包括 status）
export const updateClaudeAccountSchema = createClaudeAccountSchema.partial().omit({ 
  apiKey: true 
}).extend({
  status: claudeAccountStatusSchema.optional(),
})

// Claude 账户查询参数
export const claudeAccountQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(10),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: claudeAccountStatusSchema.optional(),
  tier: claudeTierSchema.optional()
})

// Claude 账户响应格式
export const claudeAccountResponseSchema = z.object({
  id: z.string(),
  accountName: z.string(),
  email: z.string().nullable(),
  organization: z.string().nullable(),
  status: claudeAccountStatusSchema,
  tier: claudeTierSchema,
  usageLimit: z.number().nullable(),
  currentUsage: z.number(),
  features: z.object({}).passthrough().nullable(),
  metadata: z.object({}).passthrough().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

// 类型导出
export type AccountQuery = z.infer<typeof accountQuerySchema>
export type CreateAccount = z.infer<typeof createAccountSchema>
export type UpdateAccount = z.infer<typeof updateAccountSchema>
export type AccountListing = z.infer<typeof accountListingSchema>
export type AccountDetail = z.infer<typeof accountDetailSchema>
export type AdminLogin = z.infer<typeof adminLoginSchema>
export type AuditLog = z.infer<typeof auditLogSchema>

// Claude 账户类型导出
export type CreateClaudeAccount = z.infer<typeof createClaudeAccountSchema>
export type UpdateClaudeAccount = z.infer<typeof updateClaudeAccountSchema>
export type ClaudeAccountQuery = z.infer<typeof claudeAccountQuerySchema>
export type ClaudeAccountResponse = z.infer<typeof claudeAccountResponseSchema>