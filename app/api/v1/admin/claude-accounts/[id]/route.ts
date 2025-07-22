import { NextRequest, NextResponse } from 'next/server'
import { type ClaudeAccount } from '@/lib/validation/claude-account'

// Simple mock auth check - for testing only
function isMockAuthValid(): boolean {
  // For testing, always return true
  return true
}

// Mock data - in a real app this would come from database
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
  }
]

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const account = mockAccounts.find(acc => acc.id === params.id)

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found',
          message: `Claude account with ID ${params.id} not found`
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: account,
      message: 'Claude account retrieved successfully'
    })

  } catch (error) {
    console.error('Failed to fetch Claude account:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch Claude account',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const accountIndex = mockAccounts.findIndex(acc => acc.id === params.id)

    if (accountIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found',
          message: `Claude account with ID ${params.id} not found`
        },
        { status: 404 }
      )
    }

    // Update the account (partial update)
    const existingAccount = mockAccounts[accountIndex]
    const updatedAccount: ClaudeAccount = {
      ...existingAccount,
      ...body,
      id: existingAccount.id, // Preserve ID
      apiKey: existingAccount.apiKey, // Preserve API key
      updatedAt: new Date().toISOString()
    }

    mockAccounts[accountIndex] = updatedAccount

    return NextResponse.json({
      success: true,
      data: updatedAccount,
      message: 'Claude account updated successfully'
    })

  } catch (error) {
    console.error('Failed to update Claude account:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update Claude account',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountIndex = mockAccounts.findIndex(acc => acc.id === params.id)

    if (accountIndex === -1) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account not found',
          message: `Claude account with ID ${params.id} not found`
        },
        { status: 404 }
      )
    }

    // Remove the account
    const deletedAccount = mockAccounts.splice(accountIndex, 1)[0]

    return NextResponse.json({
      success: true,
      data: deletedAccount,
      message: 'Claude account deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete Claude account:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete Claude account',
        message: 'Internal server error'
      },
      { status: 500 }
    )
  }
}