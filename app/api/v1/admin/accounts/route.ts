import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { EncryptionService } from '@/lib/encryption/service'
import { createAccountSchema, accountQuerySchema } from '@/lib/validation/schemas'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { getAuthenticatedUser, logAuditEvent } from '@/lib/auth/middleware'
import { Logger } from '@/lib/monitoring/logger'

/**
 * GET /api/v1/admin/accounts - 获取所有账户（管理员）
 */
async function getAdminAccountsHandler(request: NextRequest) {
  const timer = Logger.timer('admin_accounts_list')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const query = accountQuerySchema.parse(searchParams)
    
    // 构建查询条件（管理员可以看到所有状态的账户）
    const where: any = {}
    
    if (query.quotaLevel) {
      where.quotaLevel = query.quotaLevel
    }
    
    // 价格过滤已移除 - priceAmount字段不再存在
    
    if (query.models) {
      const modelTypes = query.models.split(',')
      where.quotas = {
        some: {
          modelType: { in: modelTypes },
        },
      }
    }
    
    // 状态过滤（管理员特有）
    if (query.inStock !== undefined) {
      where.status = query.inStock ? 'AVAILABLE' : { not: 'AVAILABLE' }
    }
    
    // 排序
    const orderBy: any = {}
    switch (query.sortBy) {
      case 'created_asc':
        orderBy.createdAt = 'asc'
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
            select: {
              id: true,
              modelType: true,
              rpm: true,
              tpm: true,
              tpd: true,
              isAvailable: true,
            },
          },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy,
      }),
      prisma.account.count({ where }),
    ])
    
    // 转换为管理员响应格式（包含敏感信息）
    const adminAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      displayName: account.displayName,
      status: account.status,
      quotaLevel: account.quotaLevel,
      quotas: account.quotas,
      hasEncryptedCredentials: !!account.awsAccessKeyHash,
      instructions: account.instructions,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      lastQuotaUpdate: account.lastQuotaUpdate?.toISOString() || null,
    }))
    
    timer()
    
    // 记录访问日志
    Logger.audit('ADMIN_ACCOUNTS_LIST', user.adminId, {
      totalAccounts: total,
      page: query.page,
      limit: query.limit,
    })
    
    return ApiResponseHelper.successWithPagination(
      adminAccounts,
      {
        page: query.page,
        limit: query.limit,
        total,
      },
      `Found ${total} accounts`
    )
  } catch (error) {
    timer()
    Logger.error('Failed to fetch admin accounts', error as Error, { adminId: user.adminId })
    throw error
  }
}

/**
 * POST /api/v1/admin/accounts - 创建新账户
 */
async function createAccountHandler(request: NextRequest) {
  const timer = Logger.timer('admin_account_create')
  const user = getAuthenticatedUser(request)
  
  if (!user) {
    return ApiResponseHelper.unauthorized()
  }

  try {
    const body = await request.json()
    const accountData = createAccountSchema.parse(body)
    
    // 检查账户名是否已存在
    const existingAccount = await prisma.account.findUnique({
      where: { name: accountData.displayName },
    })
    
    if (existingAccount) {
      return ApiResponseHelper.conflict('Account name already exists')
    }
    
    // 加密 AWS 凭证
    const encryptedCredentials = EncryptionService.encryptAWSCredentials({
      accessKeyId: accountData.awsAccessKey,
      secretAccessKey: accountData.awsSecretKey,
      region: 'us-east-1' // default region
    })
    
    // 创建账户和配额
    const account = await prisma.account.create({
      data: {
        name: accountData.name,
        displayName: accountData.displayName,
        awsAccessKeyHash: JSON.stringify(encryptedCredentials),
        awsSecretKeyHash: '', // 暂时为空，后续可以分离存储
        status: accountData.status,
        instructions: accountData.instructions || '',
        quotaLevel: accountData.quotaLevel,
      },
      include: {
        quotas: true,
      },
    })
    
    timer()
    
    // 记录审计日志
    await logAuditEvent(
      user.adminId,
      'ACCOUNT_CREATED',
      'Account',
      account.id,
      {
        accountName: account.name,
        quotaLevel: account.quotaLevel,
      }
    )
    
    Logger.audit('ACCOUNT_CREATED', user.adminId, {
      accountId: account.id,
      accountName: account.name,
      quotaLevel: account.quotaLevel,
    })
    
    // 返回创建的账户（不包含敏感凭证）
    const response = {
      id: account.id,
      name: account.name,
      displayName: account.displayName,
      status: account.status,
      quotaLevel: account.quotaLevel,
      quotas: account.quotas,
      createdAt: account.createdAt.toISOString(),
    }
    
    return ApiResponseHelper.success(response, 'Account created successfully', 201)
  } catch (error) {
    timer()
    Logger.error('Failed to create account', error as Error, { adminId: user.adminId })
    throw error
  }
}

export const GET = withApiHandler(getAdminAccountsHandler)
export const POST = withApiHandler(createAccountHandler)