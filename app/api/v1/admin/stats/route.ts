import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { getAuthenticatedUser } from '@/lib/auth/middleware'
import { Logger } from '@/lib/monitoring/logger'

/**
 * GET /api/v1/admin/stats - 获取管理员统计数据
 */
async function getAdminStatsHandler(request: NextRequest) {
  const timer = Logger.timer('admin_stats')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    // 并行查询所有统计数据
    const [
      accountStats,
      quotaStats,
      recentActivity,
      modelDistribution,
    ] = await Promise.all([
      // 账户统计
      getAccountStatistics(),
      
      // 配额统计
      getQuotaStatistics(),
      
      // 最近活动
      getRecentActivity(),
      
      // 模型分布
      getModelDistribution(),
    ])
    
    timer()
    
    Logger.audit('ADMIN_STATS_VIEWED', user.adminId, {
      totalAccounts: accountStats.total,
      availableAccounts: accountStats.available,
    })
    
    const response = {
      accounts: accountStats,
      quotas: quotaStats,
      recentActivity,
      distributions: {
        models: modelDistribution,
      },
      generatedAt: new Date().toISOString(),
    }
    
    // 添加短期缓存
    const apiResponse = ApiResponseHelper.success(response, 'Statistics retrieved successfully')
    apiResponse.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600') // 5分钟缓存
    
    return apiResponse
  } catch (error) {
    timer()
    Logger.error('Failed to get admin stats', error as Error, { adminId: user.adminId })
    throw error
  }
}

/**
 * 获取账户统计
 */
async function getAccountStatistics() {
  const [
    total,
    available,
    sold,
    maintenance,
    totalQuotas,
    activeQuotas,
  ] = await Promise.all([
    prisma.account.count(),
    prisma.account.count({ where: { status: 'AVAILABLE' } }),
    prisma.account.count({ where: { status: 'SOLD' } }),
    prisma.account.count({ where: { status: 'MAINTENANCE' } }),
    prisma.modelQuota.count(),
    prisma.modelQuota.count({ where: { isAvailable: true } }),
  ])
  
  return {
    total,
    available,
    sold,
    maintenance,
    quotas: {
      total: totalQuotas,
      active: activeQuotas,
      inactive: totalQuotas - activeQuotas,
    },
  }
}

// 收入统计已移除 - priceAmount 字段不再存在

/**
 * 获取配额统计
 */
async function getQuotaStatistics() {
  const quotaLevelStats = await prisma.account.groupBy({
    by: ['quotaLevel'],
    where: { status: { not: 'MAINTENANCE' } },
    _count: { quotaLevel: true },
  })
  
  const modelQuotaStats = await prisma.modelQuota.groupBy({
    by: ['modelType'],
    where: { isAvailable: true },
    _count: { modelType: true },
    _avg: { rpm: true, tpm: true, tpd: true },
  })
  
  return {
    byLevel: quotaLevelStats.map(stat => ({
      level: stat.quotaLevel,
      count: stat._count.quotaLevel,
    })),
    byModel: modelQuotaStats.map(stat => ({
      modelType: stat.modelType,
      count: stat._count.modelType,
      averageRpm: Math.round(stat._avg.rpm || 0),
      averageTpm: Math.round(stat._avg.tpm || 0),
      averageTpd: Math.round(stat._avg.tpd || 0),
    })),
  }
}

/**
 * 获取最近活动
 */
async function getRecentActivity() {
  const recentLogs = await prisma.auditLog.findMany({
    include: {
      admin: { select: { username: true } },
      account: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  
  return recentLogs.map(log => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityName: log.account?.name || log.entityId,
    adminUsername: log.admin?.username || 'Unknown',
    metadata: log.metadata,
    createdAt: log.createdAt.toISOString(),
  }))
}

/**
 * 获取模型分布
 */
async function getModelDistribution() {
  const distribution = await prisma.modelQuota.groupBy({
    by: ['modelType'],
    where: { 
      isAvailable: true,
      account: { status: 'AVAILABLE' },
    },
    _count: { modelType: true },
  })
  
  const total = distribution.reduce((sum, item) => sum + item._count.modelType, 0)
  
  return distribution.map(item => ({
    modelType: item.modelType,
    count: item._count.modelType,
    percentage: total > 0 ? Math.round((item._count.modelType / total) * 100) : 0,
  }))
}

// 价格分布统计已移除 - priceAmount 字段不再存在

export const GET = withApiHandler(getAdminStatsHandler)