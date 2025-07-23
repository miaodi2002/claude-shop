import { NextRequest } from 'next/server'
import { GET as listHandler, POST as createHandler } from '@/app/api/v1/admin/claude-accounts/route'
import { GET as getHandler, PUT as updateHandler, DELETE as deleteHandler } from '@/app/api/v1/admin/claude-accounts/[id]/route'
import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption/service'

// Mock the authentication middleware
jest.mock('@/lib/auth/middleware', () => ({
  getAuthenticatedUser: jest.fn(() => ({ adminId: 'admin-123', username: 'testadmin' })),
  logAuditEvent: jest.fn(() => Promise.resolve()),
}))

// Mock logger
jest.mock('@/lib/monitoring/logger', () => ({
  Logger: {
    timer: jest.fn(() => jest.fn()),
    error: jest.fn(),
    audit: jest.fn(),
  }
}))

describe('Claude Accounts API Integration Tests', () => {
  let testAccountId: string
  let encryptedApiKey: string

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.claudeAccount.deleteMany({
      where: {
        accountName: {
          startsWith: 'Test'
        }
      }
    })
  })

  afterAll(async () => {
    // Clean up test data
    await prisma.claudeAccount.deleteMany({
      where: {
        accountName: {
          startsWith: 'Test'
        }
      }
    })
    await prisma.$disconnect()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/v1/admin/claude-accounts', () => {
    it('should create a new Claude account successfully', async () => {
      const accountData = {
        apiKey: 'sk-ant-api-test-key-12345678901234567890',
        accountName: 'Test Account Create',
        email: 'test@example.com',
        organization: 'Test Organization',
        tier: 'PRO',
        usageLimit: 50000,
        features: { streaming: true, vision: false },
        metadata: { source: 'api_test' }
      }

      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts', {
        method: 'POST',
        body: JSON.stringify(accountData),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await createHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Claude account created successfully')
      expect(data.data).toMatchObject({
        accountName: accountData.accountName,
        email: accountData.email,
        organization: accountData.organization,
        tier: accountData.tier,
        usageLimit: accountData.usageLimit,
        status: 'ACTIVE',
        currentUsage: 0,
      })
      expect(data.data).not.toHaveProperty('apiKey')
      expect(data.data.id).toBeDefined()
      expect(data.data.createdAt).toBeDefined()
      expect(data.data.updatedAt).toBeDefined()

      testAccountId = data.data.id

      // Verify the account exists in the database with encrypted API key
      const dbAccount = await prisma.claudeAccount.findUnique({
        where: { id: testAccountId }
      })
      expect(dbAccount).toBeTruthy()
      expect(dbAccount!.apiKey).not.toBe(accountData.apiKey) // Should be encrypted
      encryptedApiKey = dbAccount!.apiKey
    })

    it('should reject invalid account data', async () => {
      const invalidData = {
        apiKey: '', // Empty API key
        accountName: 'Test Invalid',
      }

      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await createHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('validation')
    })

    it('should reject duplicate account names', async () => {
      const duplicateData = {
        apiKey: 'sk-ant-api-different-key-98765',
        accountName: 'Test Account Create', // Same as first test
      }

      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts', {
        method: 'POST',
        body: JSON.stringify(duplicateData),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await createHandler(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Account name already exists')
    })

    it('should create account with minimal required fields', async () => {
      const minimalData = {
        apiKey: 'sk-ant-api-minimal-key-12345',
        accountName: 'Test Minimal Account',
      }

      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts', {
        method: 'POST',
        body: JSON.stringify(minimalData),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await createHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.accountName).toBe(minimalData.accountName)
      expect(data.data.tier).toBe('FREE') // Default value
      expect(data.data.email).toBeNull()
      expect(data.data.organization).toBeNull()
    })
  })

  describe('GET /api/v1/admin/claude-accounts', () => {
    it('should list Claude accounts with default pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts')

      const response = await listHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeInstanceOf(Array)
      expect(data.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: expect.any(Number),
      })
      expect(data.message).toContain('Found')

      // Verify no API keys are exposed
      data.data.forEach((account: any) => {
        expect(account).not.toHaveProperty('apiKey')
        expect(account).toHaveProperty('id')
        expect(account).toHaveProperty('accountName')
        expect(account).toHaveProperty('status')
      })
    })

    it('should support pagination parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts?page=1&limit=5')

      const response = await listHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.limit).toBe(5)
      expect(data.data.length).toBeLessThanOrEqual(5)
    })

    it('should support search functionality', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts?search=Test Account Create')

      const response = await listHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Should find at least the account we created
      const foundAccount = data.data.find((acc: any) => acc.accountName === 'Test Account Create')
      expect(foundAccount).toBeTruthy()
    })

    it('should support filtering by status', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts?status=ACTIVE')

      const response = await listHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      data.data.forEach((account: any) => {
        expect(account.status).toBe('ACTIVE')
      })
    })

    it('should support filtering by tier', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts?tier=PRO')

      const response = await listHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      data.data.forEach((account: any) => {
        expect(account.tier).toBe('PRO')
      })
    })

    it('should support sorting', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts?sortBy=accountName&sortOrder=asc')

      const response = await listHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      
      // Verify sorting (if there are multiple accounts)
      if (data.data.length > 1) {
        const names = data.data.map((acc: any) => acc.accountName)
        const sortedNames = [...names].sort()
        expect(names).toEqual(sortedNames)
      }
    })
  })

  describe('GET /api/v1/admin/claude-accounts/:id', () => {
    it('should get a single Claude account by ID', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${testAccountId}`)

      const response = await getHandler(request, { params: { id: testAccountId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Claude account retrieved successfully')
      expect(data.data).toMatchObject({
        id: testAccountId,
        accountName: 'Test Account Create',
        email: 'test@example.com',
        organization: 'Test Organization',
        tier: 'PRO',
        usageLimit: 50000,
        status: 'ACTIVE',
        currentUsage: 0,
      })
      expect(data.data).not.toHaveProperty('apiKey')
    })

    it('should return 404 for non-existent account', async () => {
      const fakeId = 'non-existent-id'
      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${fakeId}`)

      const response = await getHandler(request, { params: { id: fakeId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Claude account not found')
    })
  })

  describe('PUT /api/v1/admin/claude-accounts/:id', () => {
    it('should update a Claude account successfully', async () => {
      const updateData = {
        accountName: 'Test Account Updated',
        tier: 'ENTERPRISE',
        usageLimit: 100000,
        organization: 'Updated Organization',
        metadata: { updated: true, version: 2 }
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${testAccountId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await updateHandler(request, { params: { id: testAccountId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Claude account updated successfully')
      expect(data.data).toMatchObject({
        id: testAccountId,
        accountName: updateData.accountName,
        tier: updateData.tier,
        usageLimit: updateData.usageLimit,
        organization: updateData.organization,
      })
      expect(data.data.updatedAt).not.toBe(data.data.createdAt)
    })

    it('should perform partial updates', async () => {
      const partialUpdate = {
        email: 'updated@example.com'
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${testAccountId}`, {
        method: 'PUT',
        body: JSON.stringify(partialUpdate),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await updateHandler(request, { params: { id: testAccountId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.email).toBe(partialUpdate.email)
      expect(data.data.accountName).toBe('Test Account Updated') // Should remain unchanged
    })

    it('should reject updates with invalid data', async () => {
      const invalidUpdate = {
        email: 'invalid-email-format',
        usageLimit: -500
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${testAccountId}`, {
        method: 'PUT',
        body: JSON.stringify(invalidUpdate),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await updateHandler(request, { params: { id: testAccountId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should reject updates to non-existent accounts', async () => {
      const fakeId = 'non-existent-id'
      const updateData = { accountName: 'Updated Name' }

      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${fakeId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await updateHandler(request, { params: { id: fakeId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Claude account not found')
    })

    it('should prevent duplicate account names', async () => {
      // First create another account
      const secondAccountData = {
        apiKey: 'sk-ant-api-second-key-98765',
        accountName: 'Test Second Account'
      }

      const createRequest = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts', {
        method: 'POST',
        body: JSON.stringify(secondAccountData),
        headers: {
          'content-type': 'application/json',
        },
      })

      const createResponse = await createHandler(createRequest)
      const createData = await createResponse.json()
      const secondAccountId = createData.data.id

      // Try to update first account with second account's name
      const duplicateUpdate = {
        accountName: 'Test Second Account'
      }

      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${testAccountId}`, {
        method: 'PUT',
        body: JSON.stringify(duplicateUpdate),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await updateHandler(request, { params: { id: testAccountId } })
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Account name already exists')
    })
  })

  describe('DELETE /api/v1/admin/claude-accounts/:id', () => {
    it('should delete a Claude account successfully', async () => {
      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${testAccountId}`, {
        method: 'DELETE',
      })

      const response = await deleteHandler(request, { params: { id: testAccountId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Claude account deleted successfully')
      expect(data.data.id).toBe(testAccountId)

      // Verify account no longer exists in database
      const deletedAccount = await prisma.claudeAccount.findUnique({
        where: { id: testAccountId }
      })
      expect(deletedAccount).toBeNull()
    })

    it('should return 404 when deleting non-existent account', async () => {
      const fakeId = 'non-existent-id'
      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${fakeId}`, {
        method: 'DELETE',
      })

      const response = await deleteHandler(request, { params: { id: fakeId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Claude account not found')
    })

    it('should handle deletion of already deleted account', async () => {
      // Try to delete the same account again
      const request = new NextRequest(`http://localhost:3000/api/v1/admin/claude-accounts/${testAccountId}`, {
        method: 'DELETE',
      })

      const response = await deleteHandler(request, { params: { id: testAccountId } })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Claude account not found')
    })
  })

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Mock unauthenticated user
      const { getAuthenticatedUser } = require('@/lib/auth/middleware')
      getAuthenticatedUser.mockReturnValueOnce(null)

      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts')
      const response = await listHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  describe('API Key Encryption', () => {
    it('should encrypt API keys in the database', async () => {
      const accountData = {
        apiKey: 'sk-ant-api-encryption-test-key-123456',
        accountName: 'Test Encryption Account'
      }

      const request = new NextRequest('http://localhost:3000/api/v1/admin/claude-accounts', {
        method: 'POST',
        body: JSON.stringify(accountData),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await createHandler(request)
      const data = await response.json()
      const accountId = data.data.id

      // Check database storage
      const dbAccount = await prisma.claudeAccount.findUnique({
        where: { id: accountId }
      })

      expect(dbAccount!.apiKey).not.toBe(accountData.apiKey)
      
      // Verify we can decrypt it back
      const encryptedData = JSON.parse(dbAccount!.apiKey)
      const decryptedApiKey = EncryptionService.decrypt(encryptedData)
      expect(decryptedApiKey).toBe(accountData.apiKey)

      // Clean up
      await prisma.claudeAccount.delete({ where: { id: accountId } })
    })
  })
})