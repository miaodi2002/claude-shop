import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption/service'
import { updateAccountSchema, updateCredentialsSchema } from '@/lib/validation/schemas'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { getAuthenticatedUser, logAuditEvent } from '@/lib/auth/middleware'
import { Logger } from '@/lib/monitoring/logger'

/**
 * GET /api/v1/admin/accounts/[id] - 获取账户详情
 */
async function getAccountHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = Logger.timer('admin_account_get')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const accountId = params.id
    
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        quotas: {
          orderBy: { modelType: 'asc' },
        },
        auditLogs: {
          where: { accountId },
          include: { admin: { select: { username: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20, // 最近20条记录
        },
      },
    })
    
    if (!account) {
      return ApiResponseHelper.notFound('Account not found')
    }
    
    timer()
    
    // 解密 AWS 凭证用于显示（仅显示部分信息）
    let awsCredentials = null
    if (account.awsAccessKeyHash) {
      try {
        const encrypted = JSON.parse(account.awsAccessKeyHash)
        const decrypted = EncryptionService.decryptAWSCredentials(encrypted)
        awsCredentials = {
          accessKeyId: `${decrypted.accessKeyId.slice(0, 8)}****`,
          region: decrypted.region,
          hasCredentials: true,
        }
      } catch (error) {
        Logger.warn('Failed to decrypt AWS credentials for display', { accountId, error })
        awsCredentials = { hasCredentials: false }
      }
    }
    
    Logger.audit('ACCOUNT_VIEWED', user.adminId, { accountId, accountName: account.name })
    
    const response = {
      id: account.id,
      name: account.name,
      displayName: account.displayName,
      status: account.status,
      quotaLevel: account.quotaLevel,
      quotas: account.quotas.map(quota => ({
        id: quota.id,
        modelType: quota.modelType,
        rpm: quota.rpm,
        tpm: quota.tpm,
        tpd: quota.tpd,
        isAvailable: quota.isAvailable,
      })),
      awsCredentials,
      instructions: account.instructions,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      lastQuotaUpdate: account.lastQuotaUpdate?.toISOString() || null,
      recentActivity: account.auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        adminUsername: log.admin?.username || 'Unknown',
        metadata: log.metadata,
        createdAt: log.createdAt.toISOString(),
      })),
    }
    
    return ApiResponseHelper.success(response, 'Account retrieved successfully')
  } catch (error) {
    timer()
    Logger.error('Failed to get account', error as Error, { 
      adminId: user.adminId, 
      accountId: params.id 
    })
    throw error
  }
}

/**
 * PUT /api/v1/admin/accounts/[id] - 更新账户
 */
async function updateAccountHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = Logger.timer('admin_account_update')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const accountId = params.id
    const body = await request.json()
    const updateData = updateAccountSchema.parse(body)
    
    // 检查账户是否存在
    const existingAccount = await prisma.account.findUnique({
      where: { id: accountId },
    })
    
    if (!existingAccount) {
      return ApiResponseHelper.notFound('Account not found')
    }
    
    // 准备更新数据
    const updatePayload: any = {}
    
    if (updateData.displayName) {
      updatePayload.displayName = updateData.displayName
    }
    
    if (updateData.status) {
      updatePayload.status = updateData.status
    }
    
    
    if (updateData.quotaLevel) {
      updatePayload.quotaLevel = updateData.quotaLevel
    }
    
    if (updateData.instructions !== undefined) {
      updatePayload.instructions = updateData.instructions
    }
    
    // 更新账户
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: updatePayload,
      include: {
        quotas: true,
      },
    })
    
    timer()
    
    // 记录审计日志
    await logAuditEvent(
      user.adminId,
      'ACCOUNT_UPDATED',
      'Account',
      accountId,
      {
        updatedFields: Object.keys(updatePayload),
        previousStatus: existingAccount.status,
        newStatus: updatedAccount.status,
      }
    )
    
    Logger.audit('ACCOUNT_UPDATED', user.adminId, {
      accountId,
      updatedFields: Object.keys(updatePayload),
    })
    
    const response = {
      id: updatedAccount.id,
      name: updatedAccount.name,
      displayName: updatedAccount.displayName,
      status: updatedAccount.status,
      quotaLevel: updatedAccount.quotaLevel,
      quotas: updatedAccount.quotas,
      updatedAt: updatedAccount.updatedAt.toISOString(),
    }
    
    return ApiResponseHelper.success(response, 'Account updated successfully')
  } catch (error) {
    timer()
    Logger.error('Failed to update account', error as Error, { 
      adminId: user.adminId, 
      accountId: params.id 
    })
    throw error
  }
}

/**
 * DELETE /api/v1/admin/accounts/[id] - 删除账户
 */
async function deleteAccountHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = Logger.timer('admin_account_delete')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const accountId = params.id
    
    // 检查账户是否存在
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, status: true },
    })
    
    if (!account) {
      return ApiResponseHelper.notFound('Account not found')
    }
    
    // 软删除：更新状态为 INACTIVE
    const deletedAccount = await prisma.account.update({
      where: { id: accountId },
      data: { 
        status: 'MAINTENANCE',
        updatedAt: new Date(),
      },
    })
    
    timer()
    
    // 记录审计日志
    await logAuditEvent(
      user.adminId,
      'ACCOUNT_DELETED',
      'Account',
      accountId,
      {
        accountName: account.name,
        previousStatus: account.status,
        deletionType: 'soft_delete',
      }
    )
    
    Logger.audit('ACCOUNT_DELETED', user.adminId, {
      accountId,
      accountName: account.name,
      deletionType: 'soft_delete',
    })
    
    return ApiResponseHelper.success(
      { 
        id: accountId, 
        status: 'MAINTENANCE',
        deletedAt: deletedAccount.updatedAt.toISOString(),
      },
      'Account deleted successfully'
    )
  } catch (error) {
    timer()
    Logger.error('Failed to delete account', error as Error, { 
      adminId: user.adminId, 
      accountId: params.id 
    })
    throw error
  }
}

export const GET = withApiHandler(getAccountHandler)
export const PUT = withApiHandler(updateAccountHandler)
export const DELETE = withApiHandler(deleteAccountHandler)