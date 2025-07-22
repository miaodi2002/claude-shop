import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption/service'
import { updateClaudeAccountSchema } from '@/lib/validation/schemas'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { logAuditEvent } from '@/lib/auth/middleware'
import { getAuthUser } from '@/lib/auth/auth-helper'
import { Logger } from '@/lib/monitoring/logger'

/**
 * GET /api/v1/admin/claude-accounts/:id - Get single Claude account
 */
async function getClaudeAccountHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = Logger.timer('claude_account_get')
  const user = await getAuthUser()
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const { id } = params
    
    const claudeAccount = await prisma.claudeAccount.findUnique({
      where: { id }
    })
    
    if (!claudeAccount) {
      return ApiResponseHelper.notFound('Claude account not found')
    }
    
    timer()
    
    // Log audit event
    await logAuditEvent(
      user.adminId,
      'CLAUDE_ACCOUNT_VIEWED',
      'ClaudeAccount',
      claudeAccount.id,
      {
        accountName: claudeAccount.accountName
      }
    )
    
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
    
    return ApiResponseHelper.success(response, 'Claude account retrieved successfully')
  } catch (error) {
    timer()
    Logger.error('Failed to fetch Claude account', error as Error, { 
      adminId: user.adminId,
      accountId: params.id
    })
    throw error
  }
}

/**
 * PUT /api/v1/admin/claude-accounts/:id - Update Claude account
 */
async function updateClaudeAccountHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = Logger.timer('claude_account_update')
  const user = await getAuthUser()
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const { id } = params
    const body = await request.json()
    
    // Parse and validate request data
    let updateData
    try {
      updateData = updateClaudeAccountSchema.parse(body)
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
    
    // Check if account exists
    const existingAccount = await prisma.claudeAccount.findUnique({
      where: { id }
    })
    
    if (!existingAccount) {
      return ApiResponseHelper.notFound('Claude account not found')
    }
    
    // Check for name conflicts if accountName is being updated
    if (updateData.accountName && updateData.accountName !== existingAccount.accountName) {
      const conflictingAccount = await prisma.claudeAccount.findFirst({
        where: {
          accountName: updateData.accountName,
          id: { not: id }
        }
      })
      
      if (conflictingAccount) {
        return ApiResponseHelper.conflict('Account name conflict', {
          accountName: 'An account with this name already exists in the system'
        })
      }
    }
    
    // Prepare data for update
    const dataToUpdate: any = {}
    if (updateData.accountName !== undefined) dataToUpdate.accountName = updateData.accountName
    if (updateData.email !== undefined) dataToUpdate.email = updateData.email
    if (updateData.organization !== undefined) dataToUpdate.organization = updateData.organization
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status
    if (updateData.tier !== undefined) dataToUpdate.tier = updateData.tier
    if (updateData.usageLimit !== undefined) dataToUpdate.usageLimit = updateData.usageLimit
    if (updateData.features !== undefined) dataToUpdate.features = updateData.features
    if (updateData.metadata !== undefined) dataToUpdate.metadata = updateData.metadata
    
    // Update Claude account
    const updatedAccount = await prisma.claudeAccount.update({
      where: { id },
      data: dataToUpdate
    })
    
    timer()
    
    // Log audit event with changes
    const changes = Object.keys(dataToUpdate).reduce((acc, key) => {
      acc[key] = {
        from: (existingAccount as any)[key],
        to: dataToUpdate[key]
      }
      return acc
    }, {} as Record<string, any>)
    
    await logAuditEvent(
      user.adminId,
      'CLAUDE_ACCOUNT_UPDATED',
      'ClaudeAccount',
      updatedAccount.id,
      {
        accountName: updatedAccount.accountName,
        changes
      }
    )
    
    Logger.audit('CLAUDE_ACCOUNT_UPDATED', user.adminId, {
      accountId: updatedAccount.id,
      accountName: updatedAccount.accountName,
      changedFields: Object.keys(dataToUpdate),
    })
    
    // Return response without API key
    const response = {
      id: updatedAccount.id,
      accountName: updatedAccount.accountName,
      email: updatedAccount.email,
      organization: updatedAccount.organization,
      status: updatedAccount.status,
      tier: updatedAccount.tier,
      usageLimit: updatedAccount.usageLimit,
      currentUsage: updatedAccount.currentUsage,
      features: updatedAccount.features,
      metadata: updatedAccount.metadata,
      createdAt: updatedAccount.createdAt.toISOString(),
      updatedAt: updatedAccount.updatedAt.toISOString()
    }
    
    return ApiResponseHelper.success(response, 'Claude account updated successfully')
  } catch (error) {
    timer()
    Logger.error('Failed to update Claude account', error as Error, { 
      adminId: user.adminId,
      accountId: params.id
    })
    throw error
  }
}

/**
 * DELETE /api/v1/admin/claude-accounts/:id - Delete Claude account
 */
async function deleteClaudeAccountHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timer = Logger.timer('claude_account_delete')
  const user = await getAuthUser()
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const { id } = params
    
    // Check if account exists
    const existingAccount = await prisma.claudeAccount.findUnique({
      where: { id }
    })
    
    if (!existingAccount) {
      return ApiResponseHelper.notFound('Claude account not found')
    }
    
    // Delete Claude account (cascade will handle audit logs)
    await prisma.claudeAccount.delete({
      where: { id }
    })
    
    timer()
    
    // Log audit event
    await logAuditEvent(
      user.adminId,
      'CLAUDE_ACCOUNT_DELETED',
      'ClaudeAccount',
      id,
      {
        accountName: existingAccount.accountName,
        tier: existingAccount.tier
      }
    )
    
    Logger.audit('CLAUDE_ACCOUNT_DELETED', user.adminId, {
      accountId: id,
      accountName: existingAccount.accountName,
      tier: existingAccount.tier,
    })
    
    return ApiResponseHelper.success(
      { id },
      'Claude account deleted successfully'
    )
  } catch (error) {
    timer()
    Logger.error('Failed to delete Claude account', error as Error, { 
      adminId: user.adminId,
      accountId: params.id
    })
    throw error
  }
}

export const GET = withApiHandler(getClaudeAccountHandler)
export const PUT = withApiHandler(updateClaudeAccountHandler) 
export const DELETE = withApiHandler(deleteClaudeAccountHandler)