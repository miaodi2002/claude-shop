import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption/service'
import { 
  createClaudeAccountSchema, 
  claudeAccountQuerySchema,
  claudeAccountResponseSchema 
} from '@/lib/validation/schemas'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { logAuditEvent } from '@/lib/auth/middleware'
import { getAuthUser } from '@/lib/auth/auth-helper'
import { Logger } from '@/lib/monitoring/logger'

/**
 * GET /api/v1/admin/claude-accounts - List Claude accounts
 */
async function listClaudeAccountsHandler(request: NextRequest) {
  const timer = Logger.timer('claude_accounts_list')
  const user = await getAuthUser()
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = claudeAccountQuerySchema.parse(searchParams)
    
    // Build where conditions
    const where: any = {}
    
    if (query.status) {
      where.status = query.status
    }
    
    if (query.tier) {
      where.tier = query.tier
    }
    
    if (query.search) {
      where.OR = [
        { accountName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { organization: { contains: query.search, mode: 'insensitive' } }
      ]
    }
    
    // Build order by
    const orderBy: any = {}
    orderBy[query.sortBy] = query.sortOrder
    
    // Execute queries
    const [claudeAccounts, total] = await Promise.all([
      prisma.claudeAccount.findMany({
        where,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy,
      }),
      prisma.claudeAccount.count({ where }),
    ])
    
    // Format response (remove sensitive API key)
    const formattedAccounts = claudeAccounts.map(account => ({
      id: account.id,
      accountName: account.accountName,
      email: account.email,
      organization: account.organization,
      status: account.status,
      tier: account.tier,
      usageLimit: account.usageLimit,
      currentUsage: account.currentUsage,
      features: account.features,
      metadata: account.metadata,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString()
    }))
    
    timer()
    
    // Log audit event
    await logAuditEvent(
      user.adminId,
      'CLAUDE_ACCOUNT_VIEWED',
      'ClaudeAccount',
      'list',
      {
        totalAccounts: total,
        page: query.page,
        limit: query.limit,
        filters: { status: query.status, tier: query.tier, search: query.search }
      }
    )
    
    return ApiResponseHelper.successWithPagination(
      formattedAccounts,
      {
        page: query.page,
        limit: query.limit,
        total,
      },
      `Found ${total} Claude accounts`
    )
  } catch (error) {
    timer()
    Logger.error('Failed to fetch Claude accounts', error as Error, { 
      adminId: user.adminId 
    })
    throw error
  }
}

/**
 * POST /api/v1/admin/claude-accounts - Create Claude account
 */
async function createClaudeAccountHandler(request: NextRequest) {
  const timer = Logger.timer('claude_account_create')
  const user = await getAuthUser()
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const body = await request.json()
    
    // Parse and validate request data
    let accountData
    try {
      accountData = createClaudeAccountSchema.parse(body)
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const details: Record<string, string> = {}
        
        error.errors.forEach((err) => {
          const field = err.path.join('.')
          details[field] = err.message
        })
        
        return ApiResponseHelper.badRequest('Validation failed', details)
      }
      throw error
    }
    
    // Check for duplicate account name
    const existingAccount = await prisma.claudeAccount.findFirst({
      where: {
        accountName: accountData.accountName
      }
    })
    
    if (existingAccount) {
      return ApiResponseHelper.conflict('Account name conflict', {
        accountName: 'An account with this name already exists in the system'
      })
    }
    
    // Encrypt API key
    const encryptedApiKey = EncryptionService.encrypt(accountData.apiKey)
    const apiKeyHash = JSON.stringify(encryptedApiKey)
    
    // Create Claude account
    const claudeAccount = await prisma.claudeAccount.create({
      data: {
        apiKey: apiKeyHash,
        accountName: accountData.accountName,
        email: accountData.email,
        organization: accountData.organization,
        tier: accountData.tier || 'FREE',
        usageLimit: accountData.usageLimit,
        features: accountData.features,
        metadata: accountData.metadata,
      },
    })
    
    timer()
    
    // Log audit event
    await logAuditEvent(
      user.adminId,
      'CLAUDE_ACCOUNT_CREATED',
      'ClaudeAccount',
      claudeAccount.id,
      {
        accountName: claudeAccount.accountName,
        tier: claudeAccount.tier,
        hasUsageLimit: !!claudeAccount.usageLimit
      }
    )
    
    Logger.audit('CLAUDE_ACCOUNT_CREATED', user.adminId, {
      accountId: claudeAccount.id,
      accountName: claudeAccount.accountName,
      tier: claudeAccount.tier,
    })
    
    // Return response without API key
    const response = {
      id: claudeAccount.id,
      accountName: claudeAccount.accountName,
      email: claudeAccount.email,
      organization: claudeAccount.organization,
      status: claudeAccount.status,
      tier: claudeAccount.tier,
      usageLimit: claudeAccount.usageLimit,
      currentUsage: claudeAccount.currentUsage,
      features: claudeAccount.features,
      metadata: claudeAccount.metadata,
      createdAt: claudeAccount.createdAt.toISOString(),
      updatedAt: claudeAccount.updatedAt.toISOString()
    }
    
    return ApiResponseHelper.success(response, 'Claude account created successfully', 201)
  } catch (error) {
    timer()
    Logger.error('Failed to create Claude account', error as Error, { 
      adminId: user.adminId 
    })
    throw error
  }
}

export const GET = withApiHandler(listClaudeAccountsHandler)
export const POST = withApiHandler(createClaudeAccountHandler)