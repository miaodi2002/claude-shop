import {
  createClaudeAccountSchema,
  updateClaudeAccountSchema,
  claudeAccountQuerySchema,
  claudeAccountResponseSchema,
  claudeAccountStatusSchema,
  claudeTierSchema
} from '@/lib/validation/schemas'

describe('Claude Account Validation Schemas', () => {
  describe('createClaudeAccountSchema', () => {
    const validAccountData = {
      apiKey: 'sk-ant-api-key-12345678901234567890123456789012345678901234567890',
      accountName: 'Test Account',
      email: 'test@example.com',
      organization: 'Test Org',
      tier: 'PRO' as const,
      usageLimit: 10000,
      features: { feature1: true },
      metadata: { source: 'test' }
    }

    it('should validate a complete valid account', () => {
      const result = createClaudeAccountSchema.safeParse(validAccountData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toMatchObject(validAccountData)
      }
    })

    it('should validate minimal required fields', () => {
      const minimalData = {
        apiKey: 'sk-ant-api-key-minimal',
        accountName: 'Minimal Account'
      }
      
      const result = createClaudeAccountSchema.safeParse(minimalData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.apiKey).toBe(minimalData.apiKey)
        expect(result.data.accountName).toBe(minimalData.accountName)
      }
    })

    it('should reject missing required fields', () => {
      const missingApiKey = { accountName: 'Test Account' }
      const missingAccountName = { apiKey: 'sk-ant-api-key-test' }
      
      expect(createClaudeAccountSchema.safeParse(missingApiKey).success).toBe(false)
      expect(createClaudeAccountSchema.safeParse(missingAccountName).success).toBe(false)
    })

    it('should reject empty required fields', () => {
      const emptyApiKey = { apiKey: '', accountName: 'Test Account' }
      const emptyAccountName = { apiKey: 'sk-ant-api-key-test', accountName: '' }
      
      expect(createClaudeAccountSchema.safeParse(emptyApiKey).success).toBe(false)
      expect(createClaudeAccountSchema.safeParse(emptyAccountName).success).toBe(false)
    })

    it('should reject invalid email format', () => {
      const invalidEmail = { ...validAccountData, email: 'invalid-email' }
      const result = createClaudeAccountSchema.safeParse(invalidEmail)
      expect(result.success).toBe(false)
    })

    it('should reject invalid tier', () => {
      const invalidTier = { ...validAccountData, tier: 'INVALID_TIER' }
      const result = createClaudeAccountSchema.safeParse(invalidTier)
      expect(result.success).toBe(false)
    })

    it('should reject negative usage limit', () => {
      const negativeLimit = { ...validAccountData, usageLimit: -100 }
      const result = createClaudeAccountSchema.safeParse(negativeLimit)
      expect(result.success).toBe(false)
    })

    it('should reject zero usage limit', () => {
      const zeroLimit = { ...validAccountData, usageLimit: 0 }
      const result = createClaudeAccountSchema.safeParse(zeroLimit)
      expect(result.success).toBe(false)
    })

    it('should accept valid usage limit', () => {
      const validLimit = { ...validAccountData, usageLimit: 1 }
      const result = createClaudeAccountSchema.safeParse(validLimit)
      expect(result.success).toBe(true)
    })

    it('should reject apiKey over maximum length', () => {
      const longApiKey = 'sk-ant-api-key-' + 'x'.repeat(500)
      const invalidData = { ...validAccountData, apiKey: longApiKey }
      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject accountName over maximum length', () => {
      const longName = 'x'.repeat(101)
      const invalidData = { ...validAccountData, accountName: longName }
      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject organization over maximum length', () => {
      const longOrg = 'x'.repeat(101)
      const invalidData = { ...validAccountData, organization: longOrg }
      const result = createClaudeAccountSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept passthrough JSON objects', () => {
      const complexFeatures = {
        apiKey: 'sk-ant-api-key-test',
        accountName: 'Test Account',
        features: { 
          chatCompletion: true, 
          streaming: false, 
          maxTokens: 4096,
          models: ['claude-3-haiku', 'claude-3-sonnet'] 
        },
        metadata: { 
          created_by: 'admin',
          environment: 'production',
          tags: ['important', 'client-facing']
        }
      }
      
      const result = createClaudeAccountSchema.safeParse(complexFeatures)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.features).toEqual(complexFeatures.features)
        expect(result.data.metadata).toEqual(complexFeatures.metadata)
      }
    })
  })

  describe('updateClaudeAccountSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        accountName: 'Updated Account',
        tier: 'ENTERPRISE' as const
      }
      
      const result = updateClaudeAccountSchema.safeParse(partialUpdate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.accountName).toBe(partialUpdate.accountName)
        expect(result.data.tier).toBe(partialUpdate.tier)
      }
    })

    it('should allow empty updates', () => {
      const emptyUpdate = {}
      const result = updateClaudeAccountSchema.safeParse(emptyUpdate)
      expect(result.success).toBe(true)
    })

    it('should not allow apiKey in updates', () => {
      const withApiKey = {
        apiKey: 'sk-ant-api-key-should-not-be-allowed',
        accountName: 'Updated Account'
      }
      
      const result = updateClaudeAccountSchema.safeParse(withApiKey)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('apiKey')
        expect(result.data.accountName).toBe(withApiKey.accountName)
      }
    })

    it('should validate email format in updates', () => {
      const invalidEmail = { email: 'invalid-email-format' }
      const result = updateClaudeAccountSchema.safeParse(invalidEmail)
      expect(result.success).toBe(false)
    })

    it('should validate usage limit in updates', () => {
      const negativeLimit = { usageLimit: -500 }
      const validLimit = { usageLimit: 5000 }
      
      expect(updateClaudeAccountSchema.safeParse(negativeLimit).success).toBe(false)
      expect(updateClaudeAccountSchema.safeParse(validLimit).success).toBe(true)
    })
  })

  describe('claudeAccountQuerySchema', () => {
    it('should parse valid query parameters with defaults', () => {
      const query = {}
      const result = claudeAccountQuerySchema.safeParse(query)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(10)
        expect(result.data.sortBy).toBe('createdAt')
        expect(result.data.sortOrder).toBe('desc')
      }
    })

    it('should coerce string numbers to integers', () => {
      const query = { page: '2', limit: '25' }
      const result = claudeAccountQuerySchema.safeParse(query)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(25)
        expect(typeof result.data.page).toBe('number')
        expect(typeof result.data.limit).toBe('number')
      }
    })

    it('should validate page minimum value', () => {
      const invalidPage = { page: '0' }
      const result = claudeAccountQuerySchema.safeParse(invalidPage)
      expect(result.success).toBe(false)
    })

    it('should validate limit maximum value', () => {
      const invalidLimit = { limit: '101' }
      const result = claudeAccountQuerySchema.safeParse(invalidLimit)
      expect(result.success).toBe(false)
    })

    it('should validate sortOrder enum values', () => {
      const validAsc = { sortOrder: 'asc' }
      const validDesc = { sortOrder: 'desc' }
      const invalid = { sortOrder: 'invalid' }
      
      expect(claudeAccountQuerySchema.safeParse(validAsc).success).toBe(true)
      expect(claudeAccountQuerySchema.safeParse(validDesc).success).toBe(true)
      expect(claudeAccountQuerySchema.safeParse(invalid).success).toBe(false)
    })

    it('should validate status enum values', () => {
      const validStatuses = ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING']
      
      validStatuses.forEach(status => {
        const query = { status }
        const result = claudeAccountQuerySchema.safeParse(query)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.status).toBe(status)
        }
      })
      
      const invalidStatus = { status: 'INVALID_STATUS' }
      expect(claudeAccountQuerySchema.safeParse(invalidStatus).success).toBe(false)
    })

    it('should validate tier enum values', () => {
      const validTiers = ['FREE', 'PRO', 'ENTERPRISE']
      
      validTiers.forEach(tier => {
        const query = { tier }
        const result = claudeAccountQuerySchema.safeParse(query)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.tier).toBe(tier)
        }
      })
      
      const invalidTier = { tier: 'INVALID_TIER' }
      expect(claudeAccountQuerySchema.safeParse(invalidTier).success).toBe(false)
    })

    it('should allow optional search parameter', () => {
      const withSearch = { search: 'test query' }
      const withoutSearch = {}
      
      expect(claudeAccountQuerySchema.safeParse(withSearch).success).toBe(true)
      expect(claudeAccountQuerySchema.safeParse(withoutSearch).success).toBe(true)
    })

    it('should handle complete query with all parameters', () => {
      const completeQuery = {
        page: '3',
        limit: '50',
        sortBy: 'accountName',
        sortOrder: 'asc',
        search: 'enterprise client',
        status: 'ACTIVE',
        tier: 'ENTERPRISE'
      }
      
      const result = claudeAccountQuerySchema.safeParse(completeQuery)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.limit).toBe(50)
        expect(result.data.sortBy).toBe('accountName')
        expect(result.data.sortOrder).toBe('asc')
        expect(result.data.search).toBe('enterprise client')
        expect(result.data.status).toBe('ACTIVE')
        expect(result.data.tier).toBe('ENTERPRISE')
      }
    })
  })

  describe('claudeAccountResponseSchema', () => {
    const validResponse = {
      id: 'cuid123456789',
      accountName: 'Test Account',
      email: 'test@example.com',
      organization: 'Test Org',
      status: 'ACTIVE' as const,
      tier: 'PRO' as const,
      usageLimit: 10000,
      currentUsage: 2500,
      features: { streaming: true },
      metadata: { client: 'enterprise' },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z'
    }

    it('should validate a complete response object', () => {
      const result = claudeAccountResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toMatchObject(validResponse)
      }
    })

    it('should allow null optional fields', () => {
      const responseWithNulls = {
        ...validResponse,
        email: null,
        organization: null,
        usageLimit: null,
        features: null,
        metadata: null
      }
      
      const result = claudeAccountResponseSchema.safeParse(responseWithNulls)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBeNull()
        expect(result.data.organization).toBeNull()
        expect(result.data.usageLimit).toBeNull()
        expect(result.data.features).toBeNull()
        expect(result.data.metadata).toBeNull()
      }
    })

    it('should require all non-nullable fields', () => {
      const requiredFields = ['id', 'accountName', 'status', 'tier', 'currentUsage', 'createdAt', 'updatedAt']
      
      requiredFields.forEach(field => {
        const incomplete = { ...validResponse }
        delete (incomplete as any)[field]
        
        const result = claudeAccountResponseSchema.safeParse(incomplete)
        expect(result.success).toBe(false)
      })
    })

    it('should validate datetime format', () => {
      const invalidDate = { ...validResponse, createdAt: 'invalid-date' }
      const result = claudeAccountResponseSchema.safeParse(invalidDate)
      expect(result.success).toBe(false)
    })

    it('should validate status enum', () => {
      const invalidStatus = { ...validResponse, status: 'INVALID' }
      const result = claudeAccountResponseSchema.safeParse(invalidStatus)
      expect(result.success).toBe(false)
    })

    it('should validate tier enum', () => {
      const invalidTier = { ...validResponse, tier: 'INVALID' }
      const result = claudeAccountResponseSchema.safeParse(invalidTier)
      expect(result.success).toBe(false)
    })
  })

  describe('status and tier enums', () => {
    it('should validate claudeAccountStatusSchema', () => {
      const validStatuses = ['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING']
      const invalidStatuses = ['active', 'DISABLED', 'UNKNOWN', '']
      
      validStatuses.forEach(status => {
        expect(claudeAccountStatusSchema.safeParse(status).success).toBe(true)
      })
      
      invalidStatuses.forEach(status => {
        expect(claudeAccountStatusSchema.safeParse(status).success).toBe(false)
      })
    })

    it('should validate claudeTierSchema', () => {
      const validTiers = ['FREE', 'PRO', 'ENTERPRISE']
      const invalidTiers = ['free', 'BASIC', 'PREMIUM', '']
      
      validTiers.forEach(tier => {
        expect(claudeTierSchema.safeParse(tier).success).toBe(true)
      })
      
      invalidTiers.forEach(tier => {
        expect(claudeTierSchema.safeParse(tier).success).toBe(false)
      })
    })
  })
})