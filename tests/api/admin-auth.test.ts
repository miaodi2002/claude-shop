import { NextRequest } from 'next/server'
import { POST as loginHandler } from '@/app/api/v1/admin/auth/login/route'
import { POST as logoutHandler } from '@/app/api/v1/admin/auth/logout/route'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    admin: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    adminSession: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

describe('Admin Authentication API', () => {
  const mockAdmin = {
    id: 'admin-123',
    username: 'testadmin',
    passwordHash: '$2b$10$hashedpassword',
    isActive: true,
    lastLogin: new Date(),
  }

  const mockSession = {
    adminId: 'admin-123',
    token: 'session-token-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/v1/admin/auth/login', () => {
    test('should login with valid credentials', async () => {
      // Mock database responses
      ;(prisma.admin.findUnique as jest.Mock).mockResolvedValue(mockAdmin)
      ;(prisma.admin.update as jest.Mock).mockResolvedValue(mockAdmin)
      ;(prisma.adminSession.create as jest.Mock).mockResolvedValue(mockSession)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testadmin',
          password: 'correctpassword',
        }),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.admin.username).toBe('testadmin')
      expect(data.data.expiresAt).toBeDefined()
    })

    test('should reject invalid username', async () => {
      ;(prisma.admin.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'nonexistent',
          password: 'anypassword',
        }),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid credentials')
    })

    test('should reject incorrect password', async () => {
      ;(prisma.admin.findUnique as jest.Mock).mockResolvedValue(mockAdmin)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testadmin',
          password: 'wrongpassword',
        }),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid credentials')
    })

    test('should reject inactive admin', async () => {
      const inactiveAdmin = { ...mockAdmin, isActive: false }
      ;(prisma.admin.findUnique as jest.Mock).mockResolvedValue(inactiveAdmin)
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'testadmin',
          password: 'correctpassword',
        }),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })

    test('should validate request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/admin/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: 'ab', // too short
          password: '123', // too short
        }),
        headers: {
          'content-type': 'application/json',
        },
      })

      const response = await loginHandler(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
    })
  })

  describe('POST /api/v1/admin/auth/logout', () => {
    test('should logout successfully', async () => {
      ;(prisma.adminSession.deleteMany as jest.Mock).mockResolvedValue({})
      ;(prisma.auditLog.create as jest.Mock).mockResolvedValue({})

      const request = new NextRequest('http://localhost:3000/api/v1/admin/auth/logout', {
        method: 'POST',
        headers: {
          cookie: 'admin-session=session-token-123',
        },
      })

      const response = await logoutHandler(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})