import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { JWTService } from '@/lib/auth/jwt'
import { isProduction } from '@/lib/config'

export interface SessionData {
  adminId: string
  username: string
  token: string
  expiresAt: Date
}

export class SessionService {
  private static readonly COOKIE_NAME = 'admin-session'
  private static readonly COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
  }

  /**
   * 创建新的管理员会话
   */
  static async createSession(adminId: string, username: string): Promise<SessionData> {
    const token = JWTService.generateSecureToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时
    
    // 在数据库中存储会话
    const session = await prisma.adminSession.create({
      data: {
        adminId,
        token,
        expiresAt,
      },
    })
    
    // 设置 HTTP-only cookie
    cookies().set(this.COOKIE_NAME, token, {
      ...this.COOKIE_OPTIONS,
      expires: expiresAt,
    })
    
    return {
      adminId,
      username,
      token,
      expiresAt,
    }
  }

  /**
   * 验证会话 token
   */
  static async validateSession(token?: string): Promise<SessionData | null> {
    const sessionToken = token || cookies().get(this.COOKIE_NAME)?.value
    
    if (!sessionToken) {
      return null
    }
    
    try {
      // 在数据库中查找会话
      const session = await prisma.adminSession.findUnique({
        where: { token: sessionToken },
        include: { admin: true },
      })
      
      if (!session || session.expiresAt < new Date()) {
        // 清理过期会话
        if (session) {
          await this.destroySession(sessionToken)
        }
        return null
      }
      
      // 检查管理员是否仍然活跃
      if (!session.admin.isActive) {
        await this.destroySession(sessionToken)
        return null
      }
      
      return {
        adminId: session.adminId,
        username: session.admin.username,
        token: sessionToken,
        expiresAt: session.expiresAt,
      }
    } catch (error) {
      console.error('Session validation error:', error)
      return null
    }
  }

  /**
   * 销毁会话
   */
  static async destroySession(token?: string): Promise<void> {
    const sessionToken = token || cookies().get(this.COOKIE_NAME)?.value
    
    if (sessionToken) {
      // 从数据库删除会话
      await prisma.adminSession.deleteMany({
        where: { token: sessionToken },
      })
      
      // 清除 cookie
      cookies().set(this.COOKIE_NAME, '', {
        ...this.COOKIE_OPTIONS,
        expires: new Date(0),
      })
    }
  }

  /**
   * 清理所有过期会话
   */
  static async cleanupExpiredSessions(): Promise<void> {
    await prisma.adminSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    })
  }

  /**
   * 刷新会话（延长过期时间）
   */
  static async refreshSession(token: string): Promise<SessionData | null> {
    const session = await this.validateSession(token)
    
    if (!session) {
      return null
    }
    
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    
    // 更新数据库中的过期时间
    await prisma.adminSession.update({
      where: { token },
      data: { expiresAt: newExpiresAt },
    })
    
    // 更新 cookie
    cookies().set(this.COOKIE_NAME, token, {
      ...this.COOKIE_OPTIONS,
      expires: newExpiresAt,
    })
    
    return {
      ...session,
      expiresAt: newExpiresAt,
    }
  }
}