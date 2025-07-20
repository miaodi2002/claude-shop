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
      revenueStats,
      quotaStats,
      recentActivity,
      modelDistribution,
      priceDistribution,
    ] = await Promise.all([
      // 账户统计
      getAccountStatistics(),
      
      // 收入统计
      getRevenueStatistics(),
      
      // 配额统计
      getQuotaStatistics(),
      
      // 最近活动
      getRecentActivity(),
      
      // 模型分布
      getModelDistribution(),
      
      // 价格分布
      getPriceDistribution(),
    ])
    
    timer()
    
    Logger.audit('ADMIN_STATS_VIEWED', user.adminId, {
      totalAccounts: accountStats.total,
      availableAccounts: accountStats.available,
    })
    
    const response = {
      accounts: accountStats,
      revenue: revenueStats,
      quotas: quotaStats,
      recentActivity,
      distributions: {
        models: modelDistribution,
        prices: priceDistribution,
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

/**
 * 获取收入统计
 */
async function getRevenueStatistics() {
  const soldAccounts = await prisma.account.findMany({
    where: { status: 'SOLD' },
    select: { priceAmount: true, updatedAt: true },
  })
  
  const totalRevenue = soldAccounts.reduce((sum, account) => sum + Number(account.priceAmount), 0)
  const averagePrice = soldAccounts.length > 0 ? totalRevenue / soldAccounts.length : 0
  
  // 计算本月收入
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)
  
  const monthlyRevenue = soldAccounts
    .filter(account => account.updatedAt >= currentMonth)
    .reduce((sum, account) => sum + Number(account.priceAmount), 0)
  
  return {
    total: Number(totalRevenue.toFixed(2)),
    monthly: Number(monthlyRevenue.toFixed(2)),
    average: Number(averagePrice.toFixed(2)),
    currency: 'USD',
    soldCount: soldAccounts.length,
  }
}

/**
 * 获取配额统计
 */
async function getQuotaStatistics() {
  const quotaLevelStats = await prisma.account.groupBy({
    by: ['quotaLevel'],
    where: { status: { not: 'MAINTENANCE' } },
    _count: { quotaLevel: true },
    _avg: { priceAmount: true },
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
      averagePrice: Number(stat._avg.priceAmount || 0),
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

/**
 * 获取价格分布
 */
async function getPriceDistribution() {
  const accounts = await prisma.account.findMany({
    where: { status: { not: 'MAINTENANCE' } },
    select: { priceAmount: true },
  })
  
  const prices = accounts.map(account => Number(account.priceAmount))
  
  if (prices.length === 0) {
    return { ranges: [], min: 0, max: 0, average: 0 }
  }
  
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const average = prices.reduce((sum, price) => sum + price, 0) / prices.length
  
  // 创建价格区间
  const ranges = [
    { min: 0, max: 50, label: '$0 - $50' },
    { min: 51, max: 100, label: '$51 - $100' },
    { min: 101, max: 200, label: '$101 - $200' },
    { min: 201, max: 500, label: '$201 - $500' },
    { min: 501, max: Infinity, label: '$500+' },
  ].map(range => ({
    ...range,
    count: prices.filter(price => price >= range.min && price <= range.max).length,
  }))
  
  return {
    ranges: ranges.filter(range => range.count > 0),
    min,
    max,
    average: Number(average.toFixed(2)),
  }
}

export const GET = withApiHandler(getAdminStatsHandler)