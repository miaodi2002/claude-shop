import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption/service'
import { updateCredentialsSchema } from '@/lib/validation/schemas'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { getAuthenticatedUser, logAuditEvent } from '@/lib/auth/middleware'
import { Logger } from '@/lib/monitoring/logger'

/**
 * PUT /api/v1/admin/accounts/[id]/credentials - 更新 AWS 凭证
 */
async function updateCredentialsHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = Logger.timer('credentials_update')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const accountId = params.id
    const body = await request.json()
    const credentialsData = updateCredentialsSchema.parse(body)
    
    // 检查账户是否存在
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, awsAccessKeyHash: true },
    })
    
    if (!account) {
      return ApiResponseHelper.notFound('Account not found')
    }
    
    // 验证新的 AWS 凭证格式
    if (!credentialsData.accessKeyId.startsWith('AKIA')) {
      return ApiResponseHelper.error('Invalid AWS Access Key ID format', 400)
    }
    
    if (credentialsData.secretAccessKey.length < 40) {
      return ApiResponseHelper.error('AWS Secret Access Key too short', 400)
    }
    
    // 加密新的凭证
    const encryptedCredentials = EncryptionService.encryptAWSCredentials({
      accessKeyId: credentialsData.accessKeyId,
      secretAccessKey: credentialsData.secretAccessKey,
      region: credentialsData.region,
    })
    
    // 更新账户凭证
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        awsAccessKeyHash: JSON.stringify(encryptedCredentials),
        updatedAt: new Date(),
      },
    })
    
    timer()
    
    // 记录敏感操作审计日志
    await logAuditEvent(
      user.adminId,
      'AWS_CREDENTIALS_UPDATED',
      'Account',
      accountId,
      {
        accountName: account.name,
        accessKeyIdPrefix: credentialsData.accessKeyId.slice(0, 8),
        region: credentialsData.region,
        previousCredentials: !!account.awsAccessKeyHash,
      }
    )
    
    Logger.audit('AWS_CREDENTIALS_UPDATED', user.adminId, {
      accountId,
      accountName: account.name,
      accessKeyIdPrefix: credentialsData.accessKeyId.slice(0, 8),
      region: credentialsData.region,
    })
    
    // 安全警告日志
    Logger.security('AWS_CREDENTIALS_CHANGE', 'high', {
      adminId: user.adminId,
      accountId,
      accountName: account.name,
      action: 'credentials_updated',
    })
    
    const response = {
      accountId,
      credentialsUpdated: true,
      accessKeyIdPrefix: `${credentialsData.accessKeyId.slice(0, 8)}****`,
      region: credentialsData.region,
      updatedAt: updatedAccount.updatedAt.toISOString(),
    }
    
    return ApiResponseHelper.success(response, 'AWS credentials updated successfully')
  } catch (error) {
    timer()
    Logger.error('Failed to update AWS credentials', error as Error, { 
      adminId: user.adminId, 
      accountId: params.id 
    })
    throw error
  }
}

/**
 * DELETE /api/v1/admin/accounts/[id]/credentials - 删除 AWS 凭证
 */
async function deleteCredentialsHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = Logger.timer('credentials_delete')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const accountId = params.id
    
    // 检查账户是否存在
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, name: true, awsAccessKeyHash: true },
    })
    
    if (!account) {
      return ApiResponseHelper.notFound('Account not found')
    }
    
    if (!account.awsAccessKeyHash) {
      return ApiResponseHelper.error('No AWS credentials to delete', 400)
    }
    
    // 清除凭证
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: {
        awsAccessKeyHash: '',
        awsSecretKeyHash: '',
        updatedAt: new Date(),
      },
    })
    
    timer()
    
    // 记录敏感操作审计日志
    await logAuditEvent(
      user.adminId,
      'AWS_CREDENTIALS_DELETED',
      'Account',
      accountId,
      {
        accountName: account.name,
        action: 'credentials_removed',
      }
    )
    
    Logger.audit('AWS_CREDENTIALS_DELETED', user.adminId, {
      accountId,
      accountName: account.name,
    })
    
    // 安全警告日志
    Logger.security('AWS_CREDENTIALS_DELETION', 'high', {
      adminId: user.adminId,
      accountId,
      accountName: account.name,
      action: 'credentials_deleted',
    })
    
    const response = {
      accountId,
      credentialsDeleted: true,
      deletedAt: updatedAccount.updatedAt.toISOString(),
    }
    
    return ApiResponseHelper.success(response, 'AWS credentials deleted successfully')
  } catch (error) {
    timer()
    Logger.error('Failed to delete AWS credentials', error as Error, { 
      adminId: user.adminId, 
      accountId: params.id 
    })
    throw error
  }
}

/**
 * GET /api/v1/admin/accounts/[id]/credentials - 获取凭证状态
 */
async function getCredentialsStatusHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = Logger.timer('credentials_status')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const accountId = params.id
    
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { 
        id: true, 
        name: true, 
        awsAccessKeyHash: true, 
        updatedAt: true,
      },
    })
    
    if (!account) {
      return ApiResponseHelper.notFound('Account not found')
    }
    
    timer()
    
    let credentialsInfo = {
      hasCredentials: false,
      accessKeyIdPrefix: null as string | null,
      region: null as string | null,
      lastUpdated: null as string | null,
    }
    
    if (account.awsAccessKeyHash) {
      try {
        const encrypted = JSON.parse(account.awsAccessKeyHash)
        const decrypted = EncryptionService.decryptAWSCredentials(encrypted)
        
        credentialsInfo = {
          hasCredentials: true,
          accessKeyIdPrefix: `${decrypted.accessKeyId.slice(0, 8)}****`,
          region: decrypted.region || null,
          lastUpdated: account.updatedAt.toISOString(),
        }
      } catch (error) {
        Logger.warn('Failed to decrypt credentials for status check', { accountId, error })
        credentialsInfo.hasCredentials = false
      }
    }
    
    Logger.audit('CREDENTIALS_STATUS_VIEWED', user.adminId, {
      accountId,
      hasCredentials: credentialsInfo.hasCredentials,
    })
    
    const response = {
      accountId,
      accountName: account.name,
      credentials: credentialsInfo,
    }
    
    return ApiResponseHelper.success(response, 'Credentials status retrieved successfully')
  } catch (error) {
    timer()
    Logger.error('Failed to get credentials status', error as Error, { 
      adminId: user.adminId, 
      accountId: params.id 
    })
    throw error
  }
}

export const PUT = withApiHandler(updateCredentialsHandler)
export const DELETE = withApiHandler(deleteCredentialsHandler)
export const GET = withApiHandler(getCredentialsStatusHandler)