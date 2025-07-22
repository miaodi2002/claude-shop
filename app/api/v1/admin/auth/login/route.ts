import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { SessionService } from '@/lib/auth/session'
import { adminLoginSchema } from '@/lib/validation/schemas'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { logAuditEvent, getClientIP } from '@/lib/auth/middleware'

async function loginHandler(request: NextRequest) {
  const body = await request.json()
  const { username, password } = adminLoginSchema.parse(body)
  
  // 查找管理员
  const admin = await prisma.admin.findUnique({
    where: { username },
  })
  
  if (!admin || !admin.isActive) {
    // 记录失败的登录尝试
    await logAuditEvent(
      admin?.id || 'unknown',
      'ADMIN_LOGIN_FAILED',
      'Admin',
      admin?.id || 'unknown',
      {
        username,
        reason: !admin ? 'user_not_found' : 'user_inactive',
        userAgent: request.headers.get('user-agent'),
        ip: getClientIP(request),
      }
    )
    
    return ApiResponseHelper.unauthorized('Invalid credentials')
  }
  
  // 验证密码
  const isValidPassword = await bcrypt.compare(password, admin.passwordHash)
  if (!isValidPassword) {
    // 记录失败的登录尝试
    await logAuditEvent(
      admin.id,
      'ADMIN_LOGIN_FAILED',
      'Admin',
      admin.id,
      {
        username,
        reason: 'invalid_password',
        userAgent: request.headers.get('user-agent'),
        ip: getClientIP(request),
      }
    )
    
    return ApiResponseHelper.unauthorized('Invalid credentials')
  }
  
  // 创建会话
  const session = await SessionService.createSession(admin.id, admin.username)
  
  // 更新最后登录时间
  await prisma.admin.update({
    where: { id: admin.id },
    data: { lastLogin: new Date() },
  })
  
  // 记录成功的登录
  await logAuditEvent(
    admin.id,
    'ADMIN_LOGIN_SUCCESS',
    'Admin',
    admin.id,
    {
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
    }
  )
  
  return ApiResponseHelper.success({
    admin: {
      id: admin.id,
      username: admin.username,
      lastLogin: admin.lastLogin,
    },
    expiresAt: session.expiresAt,
  }, 'Login successful')
}

export const POST = withApiHandler(loginHandler)