import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { Logger } from '@/lib/monitoring/logger'

const searchSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  type: z.enum(['accounts', 'features', 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

/**
 * GET /api/v1/search - 全文搜索账户
 */
async function searchHandler(request: NextRequest) {
  const timer = Logger.timer('search_accounts')
  
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = searchSchema.parse(searchParams)
    
    const searchTerm = query.q.toLowerCase()
    
    // 构建搜索条件
    const searchConditions = {
      OR: [
        { displayName: { contains: searchTerm, mode: 'insensitive' as const } },
        { instructions: { contains: searchTerm, mode: 'insensitive' as const } },
        { features: { hasSome: [searchTerm] } },
        { 
          quotas: {
            some: {
              modelType: { contains: searchTerm.toUpperCase().replace(/ /g, '_') }
            }
          }
        },
      ],
      AND: [
        { status: 'AVAILABLE' as any }, // 只搜索可用账户
      ],
    }
    
    let results: any[] = []
    let total = 0
    
    if (query.type === 'accounts' || query.type === 'all') {
      const [accounts, accountCount] = await Promise.all([
        prisma.account.findMany({
          where: searchConditions as any,
          include: {
            quotas: {
              where: { isAvailable: true },
              select: { modelType: true },
            },
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          orderBy: [
            { displayName: 'asc' },
            { createdAt: 'desc' },
          ],
        }),
        prisma.account.count({ where: searchConditions as any }),
      ])
      
      const accountResults = accounts.map(account => ({
        type: 'account',
        id: account.id,
        title: account.displayName,
        description: account.instructions ? 
          `${account.instructions.slice(0, 100)}${account.instructions.length > 100 ? '...' : ''}` : 
          null,
        price: {
          amount: Number(account.priceAmount),
          currency: account.priceCurrency,
        },
        quotaLevel: account.quotaLevel,
        modelTypes: account.quotas.map(q => q.modelType),
        url: `/account/${account.id}`,
        relevanceScore: calculateRelevanceScore(searchTerm, account),
      }))
      
      results = accountResults
      total = accountCount
    }
    
    // 按相关性排序
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    timer()
    
    Logger.info('Search performed', {
      query: searchTerm,
      type: query.type,
      resultsCount: results.length,
      totalResults: total,
    })
    
    const response = {
      query: query.q,
      searchType: query.type,
      results: results.map(({ relevanceScore, ...result }) => result), // 移除评分
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
      suggestions: await generateSearchSuggestions(searchTerm),
    }
    
    // 添加缓存头
    const apiResponse = ApiResponseHelper.success(response, `Found ${total} results`)
    apiResponse.headers.set('Cache-Control', 's-maxage=300, stale-while-revalidate=600') // 5分钟缓存
    
    return apiResponse
  } catch (error) {
    timer()
    Logger.error('Search failed', error as Error, { 
      query: request.nextUrl.searchParams.get('q') 
    })
    throw error
  }
}

/**
 * 计算搜索相关性评分
 */
function calculateRelevanceScore(searchTerm: string, account: any): number {
  let score = 0
  const term = searchTerm.toLowerCase()
  
  // 标题完全匹配
  if (account.displayName.toLowerCase() === term) {
    score += 100
  }
  // 标题包含搜索词
  else if (account.displayName.toLowerCase().includes(term)) {
    score += 50
  }
  
  // 描述包含搜索词
  if (account.instructions && account.instructions.toLowerCase().includes(term)) {
    score += 30
  }
  
  // 特性匹配
  if (account.features && account.features.some((f: string) => f.toLowerCase().includes(term))) {
    score += 40
  }
  
  // 模型类型匹配
  const hasModelMatch = account.quotas && account.quotas.some((q: any) => 
    q.modelType.toLowerCase().includes(term.replace(/ /g, '_'))
  )
  if (hasModelMatch) {
    score += 60
  }
  
  // 配额级别匹配
  if (account.quotaLevel.toLowerCase().includes(term)) {
    score += 20
  }
  
  return score
}

/**
 * 生成搜索建议
 */
async function generateSearchSuggestions(searchTerm: string): Promise<string[]> {
  try {
    const suggestions: Set<string> = new Set()
    
    // 获取相似的账户名称
    const similarAccounts = await prisma.account.findMany({
      where: {
        displayName: { contains: searchTerm.slice(0, 3), mode: 'insensitive' },
        status: 'AVAILABLE' as any,
      },
      select: { displayName: true },
      take: 3,
    })
    
    similarAccounts.forEach(account => {
      suggestions.add(account.displayName)
    })
    
    // 获取相关特性
    const accounts = await prisma.account.findMany({
      where: { status: 'AVAILABLE' as any },
      select: { features: true },
      take: 20,
    })
    
    accounts.forEach(account => {
      account.features.forEach(feature => {
        if (feature.toLowerCase().includes(searchTerm.toLowerCase())) {
          suggestions.add(feature)
        }
      })
    })
    
    // 添加热门搜索词
    const popularTerms = ['claude', 'sonnet', 'haiku', 'opus', 'high quota', 'low price']
    popularTerms.forEach(term => {
      if (term.includes(searchTerm.toLowerCase()) && term !== searchTerm.toLowerCase()) {
        suggestions.add(term)
      }
    })
    
    return Array.from(suggestions).slice(0, 5)
  } catch (error) {
    Logger.warn('Failed to generate search suggestions', { searchTerm, error })
    return []
  }
}

export const GET = withApiHandler(searchHandler)