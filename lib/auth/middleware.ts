import { NextRequest, NextResponse } from 'next/server'
import { SessionService } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    adminId: string
    username: string
  }
}

/**
 * 认证中间件 - 验证管理员身份
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
  try {
    const session = await SessionService.validateSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Clone the request with additional headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-admin-id', session.adminId)
    requestHeaders.set('x-admin-username', session.username)
    
    // Create a new request with the modified headers
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    
    return response
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}

/**
 * 从请求头中获取认证用户信息
 */
export function getAuthenticatedUser(request: NextRequest) {
  const adminId = request.headers.get('x-admin-id')
  const username = request.headers.get('x-admin-username')
  
  if (!adminId || !username) {
    return null
  }
  
  return { adminId, username }
}

/**
 * 记录审计日志
 */
export async function logAuditEvent(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, any>
) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        action: action as any, // 临时类型断言，生产环境应该使用正确的枚举值
        entityType,
        entityId,
        metadata: metadata || {},
      },
    })
  } catch (error) {
    console.error('Audit logging failed:', error)
  }
}

/**
 * 获取客户端IP地址
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return 'unknown'
}

/**
 * 速率限制检查
 */
export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 3600000 // 1小时
): boolean {
  // 简单的内存速率限制实现
  // 生产环境建议使用 Redis
  const key = `rate_limit:${identifier}`
  const now = Date.now()
  
  // 这里应该使用 Redis 或其他持久化存储
  // 暂时返回 true (允许请求)
  return true
}