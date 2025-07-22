import { NextRequest } from 'next/server'
import { SessionService } from '@/lib/auth/session'
import { ApiResponseHelper, withApiHandler } from '@/lib/api/response'
import { logAuditEvent, getClientIP } from '@/lib/auth/middleware'

async function logoutHandler(request: NextRequest) {
  // 获取当前会话
  const session = await SessionService.validateSession()
  
  if (session) {
    // 记录登出事件
    await logAuditEvent(
      session.adminId,
      'ADMIN_LOGOUT',
      'Admin',
      session.adminId,
      {
        userAgent: request.headers.get('user-agent'),
        ip: getClientIP(request),
      }
    )
  }
  
  // 销毁会话
  await SessionService.destroySession()
  
  return ApiResponseHelper.success(
    { message: 'Logged out successfully' },
    'Logout successful'
  )
}

export const POST = withApiHandler(logoutHandler)