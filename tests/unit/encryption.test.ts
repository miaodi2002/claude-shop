import { EncryptionService } from '@/lib/encryption/service'

describe('EncryptionService', () => {
  const testData = 'sensitive data to encrypt'
  const testCredentials = {
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    region: 'us-east-1',
  }

  describe('Basic Encryption/Decryption', () => {
    test('should encrypt and decrypt text successfully', () => {
      const encrypted = EncryptionService.encrypt(testData)
      
      expect(encrypted).toHaveProperty('encrypted')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('tag')
      expect(encrypted.encrypted).not.toBe(testData)
      
      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(testData)
    })

    test('should produce different ciphertext for same plaintext', () => {
      const encrypted1 = EncryptionService.encrypt(testData)
      const encrypted2 = EncryptionService.encrypt(testData)
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
    })

    test('should fail to decrypt with wrong tag', () => {
      const encrypted = EncryptionService.encrypt(testData)
      encrypted.tag = 'invalid-tag'
      
      expect(() => {
        EncryptionService.decrypt(encrypted)
      }).toThrow('Decryption failed')
    })
  })

  describe('AWS Credentials Encryption', () => {
    test('should encrypt and decrypt AWS credentials', () => {
      const encrypted = EncryptionService.encryptAWSCredentials(testCredentials)
      const decrypted = EncryptionService.decryptAWSCredentials(encrypted)
      
      expect(decrypted).toEqual(testCredentials)
    })

    test('should handle missing region in credentials', () => {
      const credentialsWithoutRegion = {
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      }
      
      const encrypted = EncryptionService.encryptAWSCredentials(credentialsWithoutRegion)
      const decrypted = EncryptionService.decryptAWSCredentials(encrypted)
      
      expect(decrypted).toEqual(credentialsWithoutRegion)
    })
  })

  describe('Password Hashing', () => {
    const password = 'test-password-123'

    test('should hash password with salt', () => {
      const hashed = EncryptionService.hashPassword(password)
      
      expect(hashed).toMatch(/^[a-f0-9]+:[a-f0-9]+$/)
      expect(hashed).not.toBe(password)
    })

    test('should verify correct password', () => {
      const hashed = EncryptionService.hashPassword(password)
      const isValid = EncryptionService.verifyPassword(password, hashed)
      
      expect(isValid).toBe(true)
    })

    test('should reject incorrect password', () => {
      const hashed = EncryptionService.hashPassword(password)
      const isValid = EncryptionService.verifyPassword('wrong-password', hashed)
      
      expect(isValid).toBe(false)
    })

    test('should handle malformed hash', () => {
      const isValid = EncryptionService.verifyPassword(password, 'malformed-hash')
      expect(isValid).toBe(false)
    })
  })

  describe('Utility Functions', () => {
    test('should generate secure tokens', () => {
      const token1 = EncryptionService.createSecureToken()
      const token2 = EncryptionService.createSecureToken()
      
      expect(token1).toHaveLength(64) // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64)
      expect(token1).not.toBe(token2)
    })

    test('should generate tokens of specified length', () => {
      const token = EncryptionService.createSecureToken(16)
      expect(token).toHaveLength(32) // 16 bytes = 32 hex chars
    })

    test('should create and verify data hashes', () => {
      const data = 'test data for hashing'
      const hash = EncryptionService.createHash(data)
      
      expect(hash).toHaveLength(64) // SHA-256 produces 64 hex chars
      expect(EncryptionService.verifyHash(data, hash)).toBe(true)
      expect(EncryptionService.verifyHash('different data', hash)).toBe(false)
    })

    test('should generate base64 encryption key', () => {
      const key = EncryptionService.generateKey()
      
      expect(key).toMatch(/^[A-Za-z0-9+/=]+$/)
      expect(Buffer.from(key, 'base64')).toHaveLength(32)
    })
  })
})