import { NextRequest } from 'next/server'
import { GET as getAccountsHandler, POST as createAccountHandler } from '@/app/api/v1/admin/accounts/route'
import { GET as getAccountHandler, PUT as updateAccountHandler, DELETE as deleteAccountHandler } from '@/app/api/v1/admin/accounts/[id]/route'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    modelQuota: {
      update: jest.fn(),
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/encryption/service', () => ({
  EncryptionService: {
    encryptAWSCredentials: jest.fn(),
    decryptAWSCredentials: jest.fn(),
  },
}))

jest.mock('@/lib/auth/middleware', () => ({
  getAuthenticatedUser: jest.fn(),
  logAuditEvent: jest.fn(),
}))

jest.mock('@/lib/monitoring/logger', () => ({
  Logger: {
    timer: jest.fn(() => jest.fn()),
    audit: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption/service'
import { getAuthenticatedUser } from '@/lib/auth/middleware'

describe('Admin Accounts API', () => {
  const mockUser = {
    adminId: 'admin-123',
    username: 'testadmin',
  }

  const mockAccount = {
    id: 'account-123',
    name: 'Test Account',
    displayName: 'Test Account',
    status: 'AVAILABLE',
    priceAmount: 100,
    priceCurrency: 'USD',
    quotaLevel: 'HIGH',
    awsAccessKeyHash: '',
    features: [],
    limitations: [],
    instructions: 'Test instructions',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastQuotaUpdate: null,
    quotas: [
      {
        id: 'quota-123',
        modelType: 'claude-3-sonnet-20240229',
        rpm: 1000,
        tpm: 1000000,
        tpd: 24000000,
        isAvailable: true,
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAuthenticatedUser as jest.Mock).mockReturnValue(mockUser)
  })

  describe('GET /api/v1/admin/accounts', () => {
    test('should return paginated accounts list', async () => {
      const mockAccounts = [mockAccount]
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue(mockAccounts)
      ;(prisma.account.count as jest.Mock).mockResolvedValue(1)

      const url = new URL('http://localhost:3000/api/v1/admin/accounts?page=1&limit=10')
      const request = new NextRequest(url)
      request.headers.set('x-admin-id', mockUser.adminId)
      request.headers.set('x-admin-username', mockUser.username)

      const response = await getAccountsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.pagination.total).toBe(1)
      expect(data.data[0].id).toBe(mockAccount.id)
    })

    test('should filter accounts by quota level', async () => {
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.account.count as jest.Mock).mockResolvedValue(0)

      const url = new URL('http://localhost:3000/api/v1/admin/accounts?quotaLevel=HIGH')
      const request = new NextRequest(url)
      request.headers.set('x-admin-id', mockUser.adminId)
      request.headers.set('x-admin-username', mockUser.username)

      const response = await getAccountsHandler(request)

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { quotaLevel: 'HIGH' },
        include: expect.any(Object),
        skip: 0,
        take: 12,
        orderBy: { createdAt: 'desc' },
      })
    })

    test('should require authentication', async () => {
      ;(getAuthenticatedUser as jest.Mock).mockReturnValue(null)

      const url = new URL('http://localhost:3000/api/v1/admin/accounts')
      const request = new NextRequest(url)

      const response = await getAccountsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('POST /api/v1/admin/accounts', () => {
    const validAccountData = {
      displayName: 'New Test Account',
      instructions: 'Test instructions',
      priceAmount: 150,
      priceCurrency: 'USD',
      quotaLevel: 'MEDIUM',
      status: 'AVAILABLE',
      awsCredentials: {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
        region: 'us-east-1',
      },
      quotas: [
        {
          modelType: 'claude-3-sonnet-20240229',
          totalQuota: 1000,
          usedQuota: 0,
          isAvailable: true,
        },
      ],
    }

    test('should create new account successfully', async () => {
      ;(prisma.account.findUnique as jest.Mock).mockResolvedValue(null) // No existing account
      ;(prisma.account.create as jest.Mock).mockResolvedValue({
        ...mockAccount,
        ...validAccountData,
        quotas: validAccountData.quotas,
      })
      ;(EncryptionService.encryptAWSCredentials as jest.Mock).mockReturnValue({
        encrypted: 'encrypted-data',
        iv: 'iv-data',
        tag: 'tag-data',
      })

      const request = new NextRequest('http://localhost:3000/api/v1/admin/accounts', {
        method: 'POST',
        body: JSON.stringify(validAccountData),
        headers: {
          'content-type': 'application/json',
          'x-admin-id': mockUser.adminId,
          'x-admin-username': mockUser.username,
        },
      })

      const response = await createAccountHandler(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.displayName).toBe(validAccountData.displayName)
      expect(EncryptionService.encryptAWSCredentials).toHaveBeenCalledWith(validAccountData.awsCredentials)
    })

    test('should reject duplicate account names', async () => {
      ;(prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount)

      const request = new NextRequest('http://localhost:3000/api/v1/admin/accounts', {
        method: 'POST',
        body: JSON.stringify(validAccountData),
        headers: {
          'content-type': 'application/json',
          'x-admin-id': mockUser.adminId,
          'x-admin-username': mockUser.username,
        },
      })

      const response = await createAccountHandler(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Account name already exists')
    })

    test('should validate request body', async () => {
      const invalidData = {
        displayName: '', // Empty name
        priceAmount: -10, // Negative price
      }

      const request = new NextRequest('http://localhost:3000/api/v1/admin/accounts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: {
          'content-type': 'application/json',
          'x-admin-id': mockUser.adminId,
          'x-admin-username': mockUser.username,
        },
      })

      const response = await createAccountHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('GET /api/v1/admin/accounts/[id]', () => {
    test('should return account details with decrypted credentials preview', async () => {
      const accountWithAuditLogs = {
        ...mockAccount,
        awsAccessKeyHash: JSON.stringify({ encrypted: 'data', iv: 'iv', tag: 'tag' }),
        auditLogs: [
          {
            id: 'log-123',
            action: 'ACCOUNT_CREATED',
            admin: { username: 'testadmin' },
            metadata: {},
            createdAt: new Date(),
          },
        ],
      }

      ;(prisma.account.findUnique as jest.Mock).mockResolvedValue(accountWithAuditLogs)
      ;(EncryptionService.decryptAWSCredentials as jest.Mock).mockReturnValue({
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'secret',
        region: 'us-east-1',
      })

      const response = await getAccountHandler(
        new NextRequest('http://localhost:3000/api/v1/admin/accounts/account-123'),
        { params: { id: 'account-123' } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('account-123')
      expect(data.data.awsCredentials.accessKeyId).toBe('AKIAIOSF****')
      expect(data.data.awsCredentials.hasCredentials).toBe(true)
      expect(data.data.recentActivity).toHaveLength(1)
    })

    test('should return 404 for non-existent account', async () => {
      ;(prisma.account.findUnique as jest.Mock).mockResolvedValue(null)

      const response = await getAccountHandler(
        new NextRequest('http://localhost:3000/api/v1/admin/accounts/non-existent'),
        { params: { id: 'non-existent' } }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Account not found')
    })
  })

  describe('PUT /api/v1/admin/accounts/[id]', () => {
    test('should update account successfully', async () => {
      const updateData = {
        displayName: 'Updated Account Name',
        status: 'RESERVED',
        priceAmount: 200,
      }

      ;(prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount)
      ;(prisma.account.update as jest.Mock).mockResolvedValue({
        ...mockAccount,
        ...updateData,
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/v1/admin/accounts/account-123', {
        method: 'PUT',
        body: JSON.stringify(updateData),
        headers: {
          'content-type': 'application/json',
          'x-admin-id': mockUser.adminId,
          'x-admin-username': mockUser.username,
        },
      })

      const response = await updateAccountHandler(request, { params: { id: 'account-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.displayName).toBe(updateData.displayName)
      expect(data.data.status).toBe(updateData.status)
    })
  })

  describe('DELETE /api/v1/admin/accounts/[id]', () => {
    test('should soft delete account', async () => {
      ;(prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount)
      ;(prisma.account.update as jest.Mock).mockResolvedValue({
        ...mockAccount,
        status: 'INACTIVE',
        updatedAt: new Date(),
      })

      const request = new NextRequest('http://localhost:3000/api/v1/admin/accounts/account-123', {
        method: 'DELETE',
        headers: {
          'x-admin-id': mockUser.adminId,
          'x-admin-username': mockUser.username,
        },
      })

      const response = await deleteAccountHandler(request, { params: { id: 'account-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.status).toBe('INACTIVE')

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'account-123' },
        data: { status: 'INACTIVE', updatedAt: expect.any(Date) },
      })
    })
  })
})