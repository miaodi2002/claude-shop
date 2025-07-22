import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { Logger } from '@/lib/monitoring/logger'

/**
 * GET /api/v1/filters/options - 获取过滤选项
 */
async function getFilterOptionsHandler(request: NextRequest) {
  const timer = Logger.timer('filter_options')
  
  try {
    // 并行查询所有过滤选项数据
    const [
      quotaLevels,
      modelTypes,
      priceRange,
      accountStatuses,
      availableFeatures,
    ] = await Promise.all([
      // 配额级别统计
      prisma.account.groupBy({
        by: ['quotaLevel'],
        where: { status: 'AVAILABLE' },
        _count: { quotaLevel: true },
      }),
      
      // 可用模型类型
      prisma.modelQuota.groupBy({
        by: ['modelType'],
        where: { 
          isAvailable: true,
          account: { status: 'AVAILABLE' },
        },
        _count: { modelType: true },
      }),
      
      // 价格范围
      prisma.account.aggregate({
        where: { status: 'AVAILABLE' },
        _min: { priceAmount: true },
        _max: { priceAmount: true },
        _avg: { priceAmount: true },
      }),
      
      // 账户状态统计（为管理员使用）
      prisma.account.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      
      // 可用功能特性
      prisma.account.findMany({
        where: { 
          status: 'AVAILABLE',
          features: { isEmpty: false },
        },
        select: { features: true },
      }),
    ])
    
    timer()
    
    // 处理功能特性（去重）
    const allFeatures = availableFeatures.flatMap(account => account.features)
    const uniqueFeatures = Array.from(new Set(allFeatures))
    
    // 构建响应
    const response = {
      quotaLevels: quotaLevels.map(item => ({
        value: item.quotaLevel,
        label: item.quotaLevel,
        count: item._count.quotaLevel,
      })),
      modelTypes: modelTypes.map(item => ({
        value: item.modelType,
        label: item.modelType.replace(/_/g, ' '),
        count: item._count.modelType,
      })),
      priceRange: {
        min: Number(priceRange._min.priceAmount) || 0,
        max: Number(priceRange._max.priceAmount) || 1000,
        average: Number(priceRange._avg.priceAmount) || 0,
      },
      accountStatuses: accountStatuses.map(item => ({
        value: item.status,
        label: item.status,
        count: item._count.status,
      })),
      features: uniqueFeatures.map(feature => ({
        value: feature,
        label: feature,
      })),
      sortOptions: [
        { value: 'created_desc', label: 'Newest First' },
        { value: 'created_asc', label: 'Oldest First' },
        { value: 'price_asc', label: 'Price: Low to High' },
        { value: 'price_desc', label: 'Price: High to Low' },
      ],
    }
    
    Logger.info('Filter options generated', {
      quotaLevelsCount: quotaLevels.length,
      modelTypesCount: modelTypes.length,
      featuresCount: uniqueFeatures.length,
    })
    
    // 添加长期缓存头（过滤选项变化不频繁）
    const apiResponse = ApiResponseHelper.success(
      response, 
      'Filter options retrieved successfully'
    )
    apiResponse.headers.set('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200') // 1小时缓存
    
    return apiResponse
  } catch (error) {
    timer()
    Logger.error('Failed to get filter options', error as Error)
    throw error
  }
}

export const GET = withApiHandler(getFilterOptionsHandler)