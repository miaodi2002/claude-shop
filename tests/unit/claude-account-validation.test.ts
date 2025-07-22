import {
  claudeAccountSchema,
  createClaudeAccountSchema,
  updateClaudeAccountSchema,
  claudeAccountQuerySchema,
  getStatusBadgeVariant,
  getTierBadgeVariant,
  formatUsage,
} from '@/lib/validation/claude-account'

describe('Claude Account Validation', () => {
  describe('createClaudeAccountSchema', () => {
    it('validates required fields', () => {
      const validData = {
        apiKey: 'sk-test-key-1234567890',
        accountName: 'Test Account',
        tier: 'FREE' as const,
      }

      const result = createClaudeAccountSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('rejects missing required fields', () => {
      const invalidData = {
        // Missing apiKey and accountName
        tier: 'FREE' as const,
      }

      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const errors = result.error.issues.map(issue => issue.path.join('.'))
        expect(errors).toContain('apiKey')
        expect(errors).toContain('accountName')
      }
    })

    it('validates API key minimum length', () => {
      const invalidData = {
        apiKey: 'short',
        accountName: 'Test Account',
        tier: 'FREE' as const,
      }

      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const apiKeyError = result.error.issues.find(issue => issue.path[0] === 'apiKey')
        expect(apiKeyError?.message).toContain('at least 10 characters')
      }
    })

    it('validates email format', () => {
      const invalidData = {
        apiKey: 'sk-test-key-1234567890',
        accountName: 'Test Account',
        email: 'invalid-email',
        tier: 'FREE' as const,
      }

      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const emailError = result.error.issues.find(issue => issue.path[0] === 'email')
        expect(emailError?.message).toContain('Invalid email format')
      }
    })

    it('accepts empty email string', () => {
      const validData = {
        apiKey: 'sk-test-key-1234567890',
        accountName: 'Test Account',
        email: '',
        tier: 'FREE' as const,
      }

      const result = createClaudeAccountSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('validates tier enum values', () => {
      const invalidData = {
        apiKey: 'sk-test-key-1234567890',
        accountName: 'Test Account',
        tier: 'INVALID_TIER',
      }

      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('validates usage limit is non-negative', () => {
      const invalidData = {
        apiKey: 'sk-test-key-1234567890',
        accountName: 'Test Account',
        tier: 'FREE' as const,
        usageLimit: -100,
      }

      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const usageLimitError = result.error.issues.find(issue => issue.path[0] === 'usageLimit')
        expect(usageLimitError?.message).toContain('non-negative')
      }
    })

    it('parses JSON strings for features and metadata', () => {
      const validData = {
        apiKey: 'sk-test-key-1234567890',
        accountName: 'Test Account',
        tier: 'FREE' as const,
        features: '{"feature1": true}',
        metadata: '{"key": "value"}',
      }

      const result = createClaudeAccountSchema.safeParse(validData)
      expect(result.success).toBe(true)
      
      if (result.success) {
        expect(result.data.features).toEqual({ feature1: true })
        expect(result.data.metadata).toEqual({ key: 'value' })
      }
    })

    it('validates JSON format for features and metadata', () => {
      const invalidData = {
        apiKey: 'sk-test-key-1234567890',
        accountName: 'Test Account',
        tier: 'FREE' as const,
        features: 'invalid json',
      }

      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      
      if (!result.success) {
        const featuresError = result.error.issues.find(issue => issue.path[0] === 'features')
        expect(featuresError?.message).toContain('valid JSON')
      }
    })
  })

  describe('updateClaudeAccountSchema', () => {
    it('validates update data without API key', () => {
      const validData = {
        accountName: 'Updated Account',
        status: 'SUSPENDED' as const,
        tier: 'PRO' as const,
      }

      const result = updateClaudeAccountSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('validates status enum in edit mode', () => {
      const validData = {
        accountName: 'Test Account',
        status: 'ACTIVE' as const,
        tier: 'FREE' as const,
      }

      const result = updateClaudeAccountSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('claudeAccountQuerySchema', () => {
    it('validates query parameters with defaults', () => {
      const result = claudeAccountQuerySchema.safeParse({})
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
        expect(result.data.sortBy).toBe('createdAt')
        expect(result.data.sortOrder).toBe('desc')
      }
    })

    it('coerces string numbers to integers', () => {
      const result = claudeAccountQuerySchema.safeParse({
        page: '2',
        limit: '20',
      })
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(20)
      }
    })

    it('validates sortBy enum values', () => {
      const validResult = claudeAccountQuerySchema.safeParse({
        sortBy: 'accountName',
      })
      expect(validResult.success).toBe(true)

      const invalidResult = claudeAccountQuerySchema.safeParse({
        sortBy: 'invalidField',
      })
      expect(invalidResult.success).toBe(false)
    })

    it('validates limit within acceptable range', () => {
      const tooHighResult = claudeAccountQuerySchema.safeParse({
        limit: 150,
      })
      expect(tooHighResult.success).toBe(false)
    })
  })
})

describe('Helper Functions', () => {
  describe('getStatusBadgeVariant', () => {
    it('returns correct variants for each status', () => {
      expect(getStatusBadgeVariant('ACTIVE')).toBe('success')
      expect(getStatusBadgeVariant('SUSPENDED')).toBe('warning')
      expect(getStatusBadgeVariant('EXPIRED')).toBe('destructive')
      expect(getStatusBadgeVariant('PENDING')).toBe('secondary')
    })
  })

  describe('getTierBadgeVariant', () => {
    it('returns correct variants for each tier', () => {
      expect(getTierBadgeVariant('ENTERPRISE')).toBe('default')
      expect(getTierBadgeVariant('PRO')).toBe('secondary')
      expect(getTierBadgeVariant('FREE')).toBe('outline')
    })
  })

  describe('formatUsage', () => {
    it('formats usage without limit', () => {
      expect(formatUsage(1000)).toBe('1,000')
    })

    it('formats usage with limit and percentage', () => {
      expect(formatUsage(500, 1000)).toBe('500 / 1,000 (50.0%)')
    })

    it('formats usage with decimal percentage', () => {
      expect(formatUsage(333, 1000)).toBe('333 / 1,000 (33.3%)')
    })

    it('handles zero usage', () => {
      expect(formatUsage(0, 1000)).toBe('0 / 1,000 (0.0%)')
    })

    it('handles full usage', () => {
      expect(formatUsage(1000, 1000)).toBe('1,000 / 1,000 (100.0%)')
    })

    it('formats large numbers with commas', () => {
      expect(formatUsage(1234567, 9876543)).toBe('1,234,567 / 9,876,543 (12.5%)')
    })
  })
})