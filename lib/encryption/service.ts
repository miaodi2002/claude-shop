import crypto from 'crypto'
import { env } from '@/lib/config'

export interface EncryptedData {
  encrypted: string
  iv: string
  tag: string
}

export class EncryptionService {
  private static readonly algorithm = 'aes-256-gcm'
  private static readonly key: Buffer = Buffer.from(env.ENCRYPTION_KEY, 'base64')

  /**
   * 验证加密密钥
   */
  private static validateKey(): void {
    if (this.key.length !== 32) {
      throw new Error('Encryption key must be exactly 32 bytes (256 bits)')
    }
  }

  /**
   * 加密文本数据
   */
  static encrypt(text: string): EncryptedData {
    try {
      this.validateKey()
      
      const iv = crypto.randomBytes(16) // 128-bit IV for GCM
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
      
      let encrypted = cipher.update(text, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      
      const tag = cipher.getAuthTag()
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
      }
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 解密文本数据
   */
  static decrypt(encryptedData: EncryptedData): string {
    try {
      this.validateKey()
      
      const { encrypted, iv, tag } = encryptedData
      
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.key,
        Buffer.from(iv, 'hex')
      )
      
      decipher.setAuthTag(Buffer.from(tag, 'hex'))
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      
      return decrypted
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 加密 AWS 凭证
   */
  static encryptAWSCredentials(credentials: {
    accessKeyId: string
    secretAccessKey: string
    region?: string
  }): EncryptedData {
    const credentialsJson = JSON.stringify(credentials)
    return this.encrypt(credentialsJson)
  }

  /**
   * 解密 AWS 凭证
   */
  static decryptAWSCredentials(encryptedData: EncryptedData): {
    accessKeyId: string
    secretAccessKey: string
    region?: string
  } {
    const credentialsJson = this.decrypt(encryptedData)
    return JSON.parse(credentialsJson)
  }

  /**
   * 生成安全的随机密钥
   */
  static generateKey(): string {
    return crypto.randomBytes(32).toString('base64')
  }

  /**
   * 哈希密码 (使用 bcrypt 的替代方案)
   */
  static hashPassword(password: string, salt?: string): string {
    const saltToUse = salt || crypto.randomBytes(16).toString('hex')
    const hash = crypto.pbkdf2Sync(password, saltToUse, 10000, 64, 'sha512')
    return `${saltToUse}:${hash.toString('hex')}`
  }

  /**
   * 验证密码
   */
  static verifyPassword(password: string, hashedPassword: string): boolean {
    try {
      const [salt, hash] = hashedPassword.split(':')
      const hashToVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      return hash === hashToVerify.toString('hex')
    } catch {
      return false
    }
  }

  /**
   * 创建安全的随机令牌
   */
  static createSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * 创建数据完整性哈希
   */
  static createHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex')
  }

  /**
   * 验证数据完整性
   */
  static verifyHash(data: string, hash: string): boolean {
    return this.createHash(data) === hash
  }
}