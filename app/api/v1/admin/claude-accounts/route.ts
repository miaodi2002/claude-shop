import { NextRequest, NextResponse } from 'next/server'
import { claudeAccountQuerySchema, type ClaudeAccount } from '@/lib/validation/claude-account'

// Simple mock auth check - for testing only
function isMockAuthValid(): boolean {
  // For testing, always return true
  // In production, this would check actual authentication
  return true
}

// Mock data for testing UI
const mockAccounts: ClaudeAccount[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    apiKey: 'sk-ant-********************masked********************',
    accountName: 'Production Claude Account',
    email: 'admin@acme.com',
    organization: 'Acme Corporation',
    status: 'ACTIVE',
    tier: 'ENTERPRISE',
    usageLimit: 1000000,
    currentUsage: 450000,
    features: {
      multiModal: true,
      functionCalling: true,
      customModels: true
    },
    metadata: {
      region: 'us-east-1',
      createdBy: 'admin',
      tags: ['production', 'enterprise']
    },
    createdAt: '2024-01-15T10:30:00.000Z',
    updatedAt: '2024-01-20T14:22:00.000Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    apiKey: 'sk-ant-********************masked********************',
    accountName: 'Development Team Account',
    email: 'dev@acme.com',
    organization: 'Acme Corporation',
    status: 'ACTIVE',
    tier: 'PRO',
    usageLimit: 250000,
    currentUsage: 125000,
    features: {
      multiModal: true,
      functionCalling: false,
      customModels: false
    },
    metadata: {
      region: 'us-west-2',
      createdBy: 'dev-lead',
      tags: ['development', 'team']
    },
    createdAt: '2024-01-10T09:15:00.000Z',
    updatedAt: '2024-01-19T11:30:00.000Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    apiKey: 'sk-ant-********************masked********************',
    accountName: 'Testing Environment',
    email: 'qa@acme.com',
    organization: 'Acme Corporation',
    status: 'SUSPENDED',
    tier: 'PRO',
    usageLimit: 100000,
    currentUsage: 95000,
    features: {
      multiModal: false,
      functionCalling: true,
      customModels: false
    },
    metadata: {
      region: 'eu-west-1',
      createdBy: 'qa-lead',
      tags: ['testing', 'qa']
    },
    createdAt: '2024-01-08T16:45:00.000Z',
    updatedAt: '2024-01-18T13:12:00.000Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    apiKey: 'sk-ant-********************masked********************',
    accountName: 'Demo Account',
    email: 'demo@acme.com',
    organization: 'Acme Corporation',
    status: 'EXPIRED',
    tier: 'FREE',
    usageLimit: 10000,
    currentUsage: 10000,
    features: {
      multiModal: false,
      functionCalling: false,
      customModels: false
    },
    metadata: {
      region: 'us-east-1',
      createdBy: 'sales',
      tags: ['demo', 'expired']
    },
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    apiKey: 'sk-ant-********************masked********************',
    accountName: 'Research Lab',
    email: 'research@acme.com',
    organization: 'Acme Research Division',
    status: 'PENDING',
    tier: 'ENTERPRISE',
    usageLimit: 2000000,
    currentUsage: 0,
    features: {
      multiModal: true,
      functionCalling: true,
      customModels: true
    },
    metadata: {
      region: 'us-west-2',
      createdBy: 'research-admin',
      tags: ['research', 'pending-approval']
    },
    createdAt: '2024-01-22T08:30:00.000Z',
    updatedAt: '2024-01-22T08:30:00.000Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440006',
    apiKey: 'sk-ant-********************masked********************',
    accountName: 'Customer Support',
    email: 'support@acme.com',
    organization: 'Acme Corporation',
    status: 'ACTIVE',
    tier: 'PRO',
    usageLimit: 150000,
    currentUsage: 80000,
    features: {
      multiModal: false,
      functionCalling: true,
      customModels: false
    },
    metadata: {
      region: 'us-east-1',
      createdBy: 'support-manager',
      tags: ['support', 'customer-facing']
    },
    createdAt: '2024-01-12T14:20:00.000Z',
    updatedAt: '2024-01-21T09:45:00.000Z'
  }
]

export async function GET(request: NextRequest) {
  // Mock auth check
  if (!isMockAuthValid()) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    // Parse query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = claudeAccountQuerySchema.parse(searchParams)

    // Filter accounts based on query parameters
    let filteredAccounts = [...mockAccounts]

    // Apply filters
    if (query.search) {
      const searchLower = query.search.toLowerCase()
      filteredAccounts = filteredAccounts.filter(account =>
        account.accountName.toLowerCase().includes(searchLower) ||
        account.email?.toLowerCase().includes(searchLower) ||
        account.organization?.toLowerCase().includes(searchLower)
      )
    }

    if (query.status) {
      filteredAccounts = filteredAccounts.filter(account => account.status === query.status)
    }

    if (query.tier) {
      filteredAccounts = filteredAccounts.filter(account => account.tier === query.tier)
    }

    // Apply sorting
    filteredAccounts.sort((a, b) => {
      let aValue: any, bValue: any

      switch (query.sortBy) {
        case 'accountName':
          aValue = a.accountName
          bValue = b.accountName
          break
        case 'email':
          aValue = a.email || ''
          bValue = b.email || ''
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'tier':
          aValue = a.tier
          bValue = b.tier
          break
        case 'updatedAt':
          aValue = new Date(a.updatedAt)
          bValue = new Date(b.updatedAt)
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt)
          bValue = new Date(b.createdAt)
          break
      }

      if (aValue < bValue) return query.sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return query.sortOrder === 'asc' ? 1 : -1
      return 0
    })

    // Apply pagination
    const total = filteredAccounts.length
    const totalPages = Math.ceil(total / query.limit)
    const startIndex = (query.page - 1) * query.limit
    const endIndex = startIndex + query.limit
    const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex)

    // Return response in expected format
    return NextResponse.json({
      success: true,
      data: paginatedAccounts,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages
      },
      message: `Found ${total} Claude accounts`
    })

  } catch (error) {
    console.error('Failed to fetch Claude accounts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Claude accounts',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  // Mock auth check
  if (!isMockAuthValid()) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    
    // Generate a new ID for the mock account
    const newId = `550e8400-e29b-41d4-a716-${Date.now().toString().slice(-12).padStart(12, '0')}`
    
    const newAccount: ClaudeAccount = {
      id: newId,
      apiKey: `sk-ant-********************masked********************`,
      accountName: body.accountName,
      email: body.email || null,
      organization: body.organization || null,
      status: body.status || 'ACTIVE',
      tier: body.tier || 'FREE',
      usageLimit: body.usageLimit || null,
      currentUsage: 0,
      features: body.features || {},
      metadata: body.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    // In a real implementation, this would save to database
    mockAccounts.push(newAccount)

    return NextResponse.json({
      success: true,
      data: newAccount,
      message: 'Claude account created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create Claude account:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create Claude account',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}