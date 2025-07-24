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
      accountStatuses,
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
      
      // 账户状态统计（为管理员使用）
      prisma.account.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ])
    
    timer()
    
    // 功能特性处理已移除 - features 字段不再存在
    
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
      accountStatuses: accountStatuses.map(item => ({
        value: item.status,
        label: item.status,
        count: item._count.status,
      })),
      sortOptions: [
        { value: 'created_desc', label: 'Newest First' },
        { value: 'created_asc', label: 'Oldest First' },
      ],
    }
    
    Logger.info('Filter options generated', {
      quotaLevelsCount: quotaLevels.length,
      modelTypesCount: modelTypes.length,
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