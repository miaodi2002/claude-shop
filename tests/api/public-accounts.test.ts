import { NextRequest } from 'next/server'
import { GET as getAccountsHandler } from '@/app/api/v1/accounts/route'
import { GET as getAccountHandler } from '@/app/api/v1/accounts/[id]/route'
import { GET as getFilterOptionsHandler } from '@/app/api/v1/filters/options/route'
import { GET as searchHandler } from '@/app/api/v1/search/route'

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    account: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    modelQuota: {
      groupBy: jest.fn(),
    },
  },
}))

jest.mock('@/lib/monitoring/logger', () => ({
  Logger: {
    timer: jest.fn(() => jest.fn()),
    info: jest.fn(),
    error: jest.fn(),
  },
}))

import { prisma } from '@/lib/prisma'

describe('Public Accounts API', () => {
  const mockAccount = {
    id: 'account-123',
    displayName: 'Test Account',
    instructions: 'Test instructions',
    status: 'AVAILABLE',
    priceAmount: 100,
    priceCurrency: 'USD',
    quotaLevel: 'HIGH',
    features: ['feature1', 'feature2'],
    limitations: ['limitation1'],
    createdAt: new Date(),
    quotas: [
      {
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
  })

  describe('GET /api/v1/accounts', () => {
    test('should return public accounts list', async () => {
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([mockAccount])
      ;(prisma.account.count as jest.Mock).mockResolvedValue(1)

      const url = new URL('http://localhost:3000/api/v1/accounts')
      const request = new NextRequest(url)

      const response = await getAccountsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].stockAvailable).toBe(true)
      expect(data.data[0].primaryModels).toContain('claude-3-sonnet-20240229')
    })

    test('should filter by quota level', async () => {
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.account.count as jest.Mock).mockResolvedValue(0)

      const url = new URL('http://localhost:3000/api/v1/accounts?quotaLevel=HIGH')
      const request = new NextRequest(url)

      await getAccountsHandler(request)

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { quotaLevel: 'HIGH' },
        include: expect.any(Object),
        skip: 0,
        take: 12,
        orderBy: { createdAt: 'desc' },
      })
    })

    test('should filter by price range', async () => {
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.account.count as jest.Mock).mockResolvedValue(0)

      const url = new URL('http://localhost:3000/api/v1/accounts?minPrice=50&maxPrice=150')
      const request = new NextRequest(url)

      await getAccountsHandler(request)

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          priceAmount: {
            gte: 50,
            lte: 150,
          },
        },
        include: expect.any(Object),
        skip: 0,
        take: 12,
        orderBy: { createdAt: 'desc' },
      })
    })

    test('should filter by model types', async () => {
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.account.count as jest.Mock).mockResolvedValue(0)

      const url = new URL('http://localhost:3000/api/v1/accounts?models=claude-3-sonnet-20240229,claude-3-haiku-20240307')
      const request = new NextRequest(url)

      await getAccountsHandler(request)

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          quotas: {
            some: {
              modelType: { in: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307'] },
              isAvailable: true,
            },
          },
        },
        include: expect.any(Object),
        skip: 0,
        take: 12,
        orderBy: { createdAt: 'desc' },
      })
    })

    test('should sort by price ascending', async () => {
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.account.count as jest.Mock).mockResolvedValue(0)

      const url = new URL('http://localhost:3000/api/v1/accounts?sortBy=price_asc')
      const request = new NextRequest(url)

      await getAccountsHandler(request)

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        skip: 0,
        take: 12,
        orderBy: { priceAmount: 'asc' },
      })
    })
  })

  describe('GET /api/v1/accounts/[id]', () => {
    test('should return account details for available account', async () => {
      ;(prisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount)

      const response = await getAccountHandler(
        new NextRequest('http://localhost:3000/api/v1/accounts/account-123'),
        { params: { id: 'account-123' } }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('account-123')
      expect(data.data.quotas).toHaveLength(1)
      expect(data.data.stockAvailable).toBe(true)

      // Should not expose sensitive information
      expect(data.data.awsCredentials).toBeUndefined()
    })

    test('should return 404 for unavailable or non-existent account', async () => {
      ;(prisma.account.findFirst as jest.Mock).mockResolvedValue(null)

      const response = await getAccountHandler(
        new NextRequest('http://localhost:3000/api/v1/accounts/non-existent'),
        { params: { id: 'non-existent' } }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Account not found or unavailable')

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'non-existent', status: 'AVAILABLE' },
        include: expect.any(Object),
      })
    })

    test('should include cache headers', async () => {
      ;(prisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount)

      const response = await getAccountHandler(
        new NextRequest('http://localhost:3000/api/v1/accounts/account-123'),
        { params: { id: 'account-123' } }
      )

      expect(response.headers.get('Cache-Control')).toBe('s-maxage=300, stale-while-revalidate=600')
    })
  })

  describe('GET /api/v1/filters/options', () => {
    test('should return filter options', async () => {
      // Mock quota levels
      ;(prisma.account.groupBy as jest.Mock).mockResolvedValueOnce([
        { quotaLevel: 'HIGH', _count: { quotaLevel: 5 } },
        { quotaLevel: 'MEDIUM', _count: { quotaLevel: 10 } },
        { quotaLevel: 'LOW', _count: { quotaLevel: 3 } },
      ])

      // Mock model types
      ;(prisma.modelQuota.groupBy as jest.Mock).mockResolvedValue([
        { modelType: 'claude-3-sonnet-20240229', _count: { modelType: 8 } },
        { modelType: 'claude-3-haiku-20240307', _count: { modelType: 12 } },
      ])

      // Mock price range
      ;(prisma.account.aggregate as jest.Mock).mockResolvedValue({
        _min: { priceAmount: 50 },
        _max: { priceAmount: 500 },
        _avg: { priceAmount: 200 },
      })

      // Mock account statuses
      ;(prisma.account.groupBy as jest.Mock).mockResolvedValueOnce([
        { status: 'AVAILABLE', _count: { status: 15 } },
        { status: 'SOLD', _count: { status: 3 } },
      ])

      // Mock features
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([
        { features: ['feature1', 'feature2'] },
        { features: ['feature2', 'feature3'] },
      ])

      const request = new NextRequest('http://localhost:3000/api/v1/filters/options')
      const response = await getFilterOptionsHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.quotaLevels).toHaveLength(3)
      expect(data.data.modelTypes).toHaveLength(2)
      expect(data.data.priceRange.min).toBe(50)
      expect(data.data.priceRange.max).toBe(500)
      expect(data.data.sortOptions).toHaveLength(4)
    })

    test('should include cache headers for filter options', async () => {
      // Mock all required data
      ;(prisma.account.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.modelQuota.groupBy as jest.Mock).mockResolvedValue([])
      ;(prisma.account.aggregate as jest.Mock).mockResolvedValue({
        _min: { priceAmount: 0 },
        _max: { priceAmount: 0 },
        _avg: { priceAmount: 0 },
      })
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/v1/filters/options')
      const response = await getFilterOptionsHandler(request)

      expect(response.headers.get('Cache-Control')).toBe('s-maxage=3600, stale-while-revalidate=7200')
    })
  })

  describe('GET /api/v1/search', () => {
    test('should search accounts by query', async () => {
      ;(prisma.account.findMany as jest.Mock).mockResolvedValue([mockAccount])
      ;(prisma.account.count as jest.Mock).mockResolvedValue(1)

      const url = new URL('http://localhost:3000/api/v1/search?q=claude')
      const request = new NextRequest(url)

      const response = await searchHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.query).toBe('claude')
      expect(data.data.results).toHaveLength(1)
      expect(data.data.results[0].type).toBe('account')
    })

    test('should validate search query', async () => {
      const url = new URL('http://localhost:3000/api/v1/search?q=')
      const request = new NextRequest(url)

      const response = await searchHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
    })

    test('should limit search query length', async () => {
      const longQuery = 'a'.repeat(101)
      const url = new URL(`http://localhost:3000/api/v1/search?q=${longQuery}`)
      const request = new NextRequest(url)

      const response = await searchHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})