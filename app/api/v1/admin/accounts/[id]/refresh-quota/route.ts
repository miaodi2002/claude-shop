import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption/service'
import { refreshQuotaSchema } from '@/lib/validation/schemas'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { getAuthenticatedUser, logAuditEvent } from '@/lib/auth/middleware'
import { Logger } from '@/lib/monitoring/logger'

/**
 * POST /api/v1/admin/accounts/[id]/refresh-quota - 刷新账户配额
 */
async function refreshQuotaHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = Logger.timer('quota_refresh')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const accountId = params.id
    const body = await request.json()
    
    // 如果提供了新的配额数据，验证格式
    let newQuotas = null
    if (body.quotas) {
      const validatedData = refreshQuotaSchema.parse(body)
      newQuotas = validatedData.quotas
    }
    
    // 检查账户是否存在
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: {
        quotas: true,
      },
    })
    
    if (!account) {
      return ApiResponseHelper.notFound('Account not found')
    }
    
    // 如果没有提供新配额，模拟从 AWS 获取配额信息
    if (!newQuotas) {
      // 这里应该调用 AWS API 获取实际配额
      // 目前使用模拟数据
      newQuotas = await simulateAWSQuotaFetch(account.awsAccessKeyHash)
    }
    
    // 更新配额信息
    const updatedQuotas = await Promise.all(
      newQuotas.map(async (quota) => {
        // 查找现有配额记录
        const existingQuota = account.quotas.find(q => q.modelType === quota.modelType)
        
        if (existingQuota) {
          // 更新现有配额
          return await prisma.modelQuota.update({
            where: { id: existingQuota.id },
            data: {
              rpm: quota.totalQuota || existingQuota.rpm,
              tpm: quota.totalQuota ? quota.totalQuota * 1000 : existingQuota.tpm,
              tpd: quota.totalQuota ? quota.totalQuota * 1000 * 24 : existingQuota.tpd,
              isAvailable: quota.isAvailable ?? existingQuota.isAvailable,
            },
          })
        } else {
          // 创建新配额记录
          return await prisma.modelQuota.create({
            data: {
              accountId,
              modelType: quota.modelType as any,
              rpm: quota.totalQuota || 1000,
              tpm: quota.totalQuota ? quota.totalQuota * 1000 : 1000000,
              tpd: quota.totalQuota ? quota.totalQuota * 1000 * 24 : 24000000,
              isAvailable: quota.isAvailable ?? true,
            },
          })
        }
      })
    )
    
    // 更新账户的最后配额更新时间
    const updatedAccount = await prisma.account.update({
      where: { id: accountId },
      data: { lastQuotaUpdate: new Date() },
    })
    
    timer()
    
    // 记录审计日志
    await logAuditEvent(
      user.adminId,
      'QUOTA_UPDATED',
      'Account',
      accountId,
      {
        accountName: account.name,
        updatedQuotas: newQuotas.map(q => ({
          modelType: q.modelType,
          totalQuota: q.totalQuota,
          isAvailable: q.isAvailable,
        })),
        refreshMethod: body.quotas ? 'manual' : 'automatic',
      }
    )
    
    Logger.audit('QUOTA_REFRESHED', user.adminId, {
      accountId,
      accountName: account.name,
      quotaCount: updatedQuotas.length,
      refreshMethod: body.quotas ? 'manual' : 'automatic',
    })
    
    const response = {
      accountId,
      refreshedAt: updatedAccount.lastQuotaUpdate?.toISOString() || new Date().toISOString(),
      quotas: updatedQuotas.map(quota => ({
        id: quota.id,
        modelType: quota.modelType,
        rpm: quota.rpm,
        tpm: quota.tpm,
        tpd: quota.tpd,
        isAvailable: quota.isAvailable,
      })),
      refreshMethod: body.quotas ? 'manual' : 'automatic',
    }
    
    return ApiResponseHelper.success(response, 'Quotas refreshed successfully')
  } catch (error) {
    timer()
    Logger.error('Failed to refresh quota', error as Error, { 
      adminId: user.adminId, 
      accountId: params.id 
    })
    throw error
  }
}

/**
 * 模拟 AWS 配额获取（实际应用中应该调用真实的 AWS API）
 */
async function simulateAWSQuotaFetch(encryptedCredentials: string) {
  try {
    // 在实际应用中，这里应该：
    // 1. 解密 AWS 凭证
    // 2. 使用 AWS SDK 调用相关 API
    // 3. 获取实际的配额信息
    
    if (!encryptedCredentials) {
      throw new Error('AWS credentials not available')
    }
    
    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 返回模拟配额数据
    return [
      {
        modelType: 'CLAUDE_35_SONNET',
        totalQuota: 1000,
        usedQuota: 250,
        isAvailable: true,
      },
      {
        modelType: 'CLAUDE_35_HAIKU',
        totalQuota: 5000,
        usedQuota: 500,
        isAvailable: true,
      },
      {
        modelType: 'CLAUDE_40_OPUS_4_V1',
        totalQuota: 100,
        usedQuota: 0,
        isAvailable: true,
      },
    ]
  } catch (error) {
    Logger.warn('Failed to fetch AWS quotas, using default values', { error })
    
    // 返回默认配额
    return [
      {
        modelType: 'CLAUDE_35_SONNET',
        totalQuota: 1000,
        usedQuota: 0,
        isAvailable: true,
      },
    ]
  }
}

export const POST = withApiHandler(refreshQuotaHandler)