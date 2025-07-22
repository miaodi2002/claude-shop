import jwt from 'jsonwebtoken'
import { env } from '@/lib/config'
import crypto from 'crypto'

export interface JWTPayload {
  adminId: string
  username: string
  iat?: number
  exp?: number
}

export class JWTService {
  private static readonly secret = env.JWT_SECRET
  private static readonly expiresIn = '24h'

  /**
   * 生成 JWT token
   */
  static sign(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.expiresIn,
      issuer: 'claude-shop',
      audience: 'admin',
    })
  }

  /**
   * 验证并解析 JWT token
   */
  static verify(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'claude-shop',
        audience: 'admin',
      }) as JWTPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw new Error('Token verification failed')
    }
  }

  /**
   * 生成安全的随机 token (用于会话)
   */
  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * 检查 token 是否即将过期 (少于1小时)
   */
  static isExpiringSoon(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as JWTPayload
      if (!decoded.exp) return false
      
      const now = Math.floor(Date.now() / 1000)
      const timeUntilExpiry = decoded.exp - now
      
      // 如果少于1小时就过期，返回 true
      return timeUntilExpiry < 3600
    } catch {
      return true
    }
  }
}