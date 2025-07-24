import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { accountQuerySchema, validateSortBy } from '@/lib/validation/schemas'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'

async function getAccountsHandler(request: NextRequest) {
  const searchParams = Object.fromEntries(request.nextUrl.searchParams)
  const query = accountQuerySchema.parse(searchParams)
  
  // 构建查询条件
  const where: any = {
    status: query.inStock ? 'AVAILABLE' : undefined,
  }
  
  // 配额级别过滤
  if (query.quotaLevel) {
    where.quotaLevel = query.quotaLevel
  }
  
  // 价格范围过滤已移除 - priceAmount字段不再存在
  
  // 模型类型过滤
  if (query.models) {
    const modelTypes = query.models.split(',')
    where.quotas = {
      some: {
        modelType: { in: modelTypes },
        isAvailable: true,
      },
    }
  }
  
  // 排序逻辑
  const { field, direction } = validateSortBy(query.sortBy)
  const orderBy: any = {}
  
  switch (field) {
    case 'created':
      orderBy.createdAt = direction
      break
    default:
      orderBy.createdAt = 'desc'
  }
  
  // 执行查询
  const [accounts, total] = await Promise.all([
    prisma.account.findMany({
      where,
      include: {
        quotas: {
          where: { isAvailable: true },
          select: { modelType: true },
        },
      },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      orderBy,
    }),
    prisma.account.count({ where }),
  ])
  
  // 转换为公共响应格式
  const listings = accounts.map(account => ({
    id: account.id,
    displayName: account.displayName,
    description: account.instructions || null, // 使用 instructions 字段作为描述
    quotaLevel: account.quotaLevel,
    primaryModels: account.quotas.map(q => q.modelType),
    stockAvailable: account.status === 'AVAILABLE',
    createdAt: account.createdAt.toISOString(),
  }))
  
  return ApiResponseHelper.successWithPagination(
    listings,
    {
      page: query.page,
      limit: query.limit,
      total,
    },
    `Found ${total} accounts`
  )
}

export const GET = withApiHandler(getAccountsHandler)