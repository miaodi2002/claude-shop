import { z } from 'zod'

// Claude Account Status Enum (from backend spec)
export const claudeAccountStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING'])

// Claude Account Tier Enum (from backend spec)  
export const claudeAccountTierSchema = z.enum(['FREE', 'PRO', 'ENTERPRISE'])

// Base Claude Account Schema
export const claudeAccountSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  apiKey: z.string().min(1, 'API key is required'), // Will be encrypted in backend
  accountName: z.string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must not exceed 100 characters'),
  email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  organization: z.string()
    .max(100, 'Organization must not exceed 100 characters')
    .optional(),
  status: claudeAccountStatusSchema,
  tier: claudeAccountTierSchema,
  usageLimit: z.number()
    .int()
    .min(0, 'Usage limit must be non-negative')
    .optional(),
  currentUsage: z.number()
    .int()
    .min(0, 'Current usage must be non-negative')
    .default(0),
  features: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

// Create Claude Account Schema (for forms)
export const createClaudeAccountSchema = z.object({
  apiKey: z.string()
    .min(1, 'API key is required')
    .min(10, 'API key must be at least 10 characters'),
  accountName: z.string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must not exceed 100 characters'),
  email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  organization: z.string()
    .max(100, 'Organization must not exceed 100 characters')
    .optional(),
  tier: claudeAccountTierSchema.default('FREE'),
  usageLimit: z.coerce.number()
    .int()
    .min(0, 'Usage limit must be non-negative')
    .optional(),
  features: z.string()
    .optional()
    .transform((val, ctx) => {
      if (!val) return undefined
      try {
        return JSON.parse(val)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Features must be valid JSON',
        })
        return z.NEVER
      }
    }),
  metadata: z.string()
    .optional()
    .transform((val, ctx) => {
      if (!val) return undefined
      try {
        return JSON.parse(val)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Metadata must be valid JSON',
        })
        return z.NEVER
      }
    }),
})

// Update Claude Account Schema (excludes API key and ID)
export const updateClaudeAccountSchema = z.object({
  accountName: z.string()
    .min(1, 'Account name is required')
    .max(100, 'Account name must not exceed 100 characters'),
  email: z.string()
    .email('Invalid email format')
    .optional()
    .or(z.literal('')),
  organization: z.string()
    .max(100, 'Organization must not exceed 100 characters')
    .optional(),
  status: claudeAccountStatusSchema,
  tier: claudeAccountTierSchema,
  usageLimit: z.coerce.number()
    .int()
    .min(0, 'Usage limit must be non-negative')
    .optional(),
  features: z.string()
    .optional()
    .transform((val, ctx) => {
      if (!val) return undefined
      try {
        return JSON.parse(val)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Features must be valid JSON',
        })
        return z.NEVER
      }
    }),
  metadata: z.string()
    .optional()
    .transform((val, ctx) => {
      if (!val) return undefined
      try {
        return JSON.parse(val)
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Metadata must be valid JSON',
        })
        return z.NEVER
      }
    }),
})

// Query Parameters Schema
export const claudeAccountQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['accountName', 'email', 'status', 'tier', 'createdAt', 'updatedAt'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: claudeAccountStatusSchema.optional(),
  tier: claudeAccountTierSchema.optional(),
})

// Type exports
export type ClaudeAccount = z.infer<typeof claudeAccountSchema>
export type CreateClaudeAccountData = z.infer<typeof createClaudeAccountSchema>
export type UpdateClaudeAccountData = z.infer<typeof updateClaudeAccountSchema>
export type ClaudeAccountQuery = z.infer<typeof claudeAccountQuerySchema>
export type ClaudeAccountStatus = z.infer<typeof claudeAccountStatusSchema>
export type ClaudeAccountTier = z.infer<typeof claudeAccountTierSchema>

// Helper functions
export function getStatusBadgeVariant(status: ClaudeAccountStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'SUSPENDED':
      return 'warning'
    case 'EXPIRED':
      return 'destructive'
    case 'PENDING':
      return 'secondary'
    default:
      return 'secondary'
  }
}

export function getTierBadgeVariant(tier: ClaudeAccountTier) {
  switch (tier) {
    case 'ENTERPRISE':
      return 'default'
    case 'PRO':
      return 'secondary'
    case 'FREE':
      return 'outline'
    default:
      return 'outline'
  }
}

export function formatUsage(currentUsage: number, usageLimit?: number): string {
  if (!usageLimit) return currentUsage.toLocaleString()
  const percentage = ((currentUsage / usageLimit) * 100).toFixed(1)
  return `${currentUsage.toLocaleString()} / ${usageLimit.toLocaleString()} (${percentage}%)`
}