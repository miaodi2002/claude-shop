import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { Logger } from '@/lib/monitoring/logger'

/**
 * GET /api/v1/accounts/[id] - 获取公共账户详情
 */
async function getPublicAccountHandler(request: NextRequest, { params }: { params: { id: string } }) {
  const timer = Logger.timer('public_account_detail')
  
  try {
    const accountId = params.id
    
    // 只返回可用状态的账户
    const account = await prisma.account.findFirst({
      where: { 
        id: accountId,
        status: 'AVAILABLE', // 只显示可用账户
      },
      include: {
        quotas: {
          where: { isAvailable: true },
          select: {
            modelType: true,
            rpm: true,
            tpm: true,
            tpd: true,
            isAvailable: true,
          },
          orderBy: { modelType: 'asc' },
        },
      },
    })
    
    if (!account) {
      return ApiResponseHelper.notFound('Account not found or unavailable')
    }
    
    timer()
    
    // 记录访问日志（不含用户身份信息）
    Logger.info('Public account viewed', { 
      accountId, 
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
    })
    
    // 构建公共响应（不包含敏感信息）
    const response = {
      id: account.id,
      displayName: account.displayName,
      description: account.instructions || null,
      price: {
        amount: Number(account.priceAmount),
        currency: account.priceCurrency,
      },
      quotaLevel: account.quotaLevel,
      quotas: account.quotas.map(quota => ({
        modelType: quota.modelType,
        quotaLimits: {
          requestsPerMinute: quota.rpm,
          tokensPerMinute: quota.tpm,
          tokensPerDay: quota.tpd,
        },
        isAvailable: quota.isAvailable,
      })),
      features: account.features,
      limitations: account.limitations,
      stockAvailable: account.status === 'AVAILABLE',
      createdAt: account.createdAt.toISOString(),
    }
    
    // 添加缓存头
    const apiResponse = ApiResponseHelper.success(response, 'Account details retrieved successfully')
    apiResponse.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600') // 5分钟缓存
    
    return apiResponse
  } catch (error) {
    timer()
    Logger.error('Failed to get public account', error as Error, { accountId: params.id })
    throw error
  }
}

export const GET = withApiHandler(getPublicAccountHandler)