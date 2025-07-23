import { EncryptionService } from '@/lib/encryption/service'

describe('Claude Account Encryption Service', () => {
  const testApiKey = 'sk-ant-api03-test-key-12345678901234567890123456789012345678901234567890abcdef'
  const testShortKey = 'sk-ant-short-key'
  const testLongKey = 'sk-ant-api03-' + 'x'.repeat(500)

  beforeAll(() => {
    // Ensure encryption key is set for tests
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = EncryptionService.generateKey()
    }
  })

  describe('Basic Encryption and Decryption', () => {
    it('should encrypt and decrypt Claude API keys successfully', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      
      expect(encrypted).toHaveProperty('encrypted')
      expect(encrypted).toHaveProperty('iv')
      expect(encrypted).toHaveProperty('tag')
      expect(encrypted.encrypted).not.toBe(testApiKey)
      expect(encrypted.encrypted).toMatch(/^[a-f0-9]+$/)
      expect(encrypted.iv).toMatch(/^[a-f0-9]{32}$/) // 16 bytes = 32 hex chars
      expect(encrypted.tag).toMatch(/^[a-f0-9]{32}$/) // 16 bytes = 32 hex chars

      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(testApiKey)
    })

    it('should generate unique encryption results for same input', () => {
      const encrypted1 = EncryptionService.encrypt(testApiKey)
      const encrypted2 = EncryptionService.encrypt(testApiKey)
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted)
      expect(encrypted1.iv).not.toBe(encrypted2.iv)
      expect(encrypted1.tag).not.toBe(encrypted2.tag)

      const decrypted1 = EncryptionService.decrypt(encrypted1)
      const decrypted2 = EncryptionService.decrypt(encrypted2)
      
      expect(decrypted1).toBe(testApiKey)
      expect(decrypted2).toBe(testApiKey)
    })

    it('should handle short API keys', () => {
      const encrypted = EncryptionService.encrypt(testShortKey)
      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(testShortKey)
    })

    it('should handle long API keys', () => {
      const encrypted = EncryptionService.encrypt(testLongKey)
      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(testLongKey)
    })

    it('should handle empty string', () => {
      const encrypted = EncryptionService.encrypt('')
      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe('')
    })

    it('should handle special characters in API keys', () => {
      const specialKey = 'sk-ant-api-key-with-special-chars-!@#$%^&*()_+-=[]{}|;:,.<>?'
      const encrypted = EncryptionService.encrypt(specialKey)
      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(specialKey)
    })
  })

  describe('Data Integrity and Security', () => {
    it('should fail decryption with tampered encrypted data', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      
      // Tamper with encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        encrypted: encrypted.encrypted.replace(/.$/, '0') // Change last character
      }
      
      expect(() => EncryptionService.decrypt(tamperedEncrypted)).toThrow('Decryption failed')
    })

    it('should fail decryption with tampered IV', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      
      // Tamper with IV more significantly
      const tamperedIV = {
        ...encrypted,
        iv: '00000000000000000000000000000000' // Replace with zeros
      }
      
      expect(() => EncryptionService.decrypt(tamperedIV)).toThrow('Decryption failed')
    })

    it('should fail decryption with tampered tag', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      
      // Tamper with authentication tag
      const tamperedTag = {
        ...encrypted,
        tag: encrypted.tag.replace(/.$/, '0') // Change last character
      }
      
      expect(() => EncryptionService.decrypt(tamperedTag)).toThrow('Decryption failed')
    })

    it('should fail decryption with invalid hex data', () => {
      const invalidData = {
        encrypted: 'invalid-hex-data',
        iv: '0123456789abcdef0123456789abcdef',
        tag: '0123456789abcdef0123456789abcdef'
      }
      
      expect(() => EncryptionService.decrypt(invalidData)).toThrow('Decryption failed')
    })

    it('should fail decryption with wrong IV length', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      
      const wrongIVLength = {
        ...encrypted,
        iv: encrypted.iv.slice(0, -2) // Shorten IV
      }
      
      expect(() => EncryptionService.decrypt(wrongIVLength)).toThrow('Decryption failed')
    })

    it('should fail decryption with completely invalid tag', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      
      const invalidTag = {
        ...encrypted,
        tag: 'invalid-hex-characters-xyz' // Invalid hex
      }
      
      expect(() => EncryptionService.decrypt(invalidTag)).toThrow('Decryption failed')
    })
  })

  describe('JSON Serialization for Database Storage', () => {
    it('should properly serialize and deserialize for database storage', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      
      // Simulate database storage (JSON serialization)
      const serialized = JSON.stringify(encrypted)
      const deserialized = JSON.parse(serialized)
      
      // Should be able to decrypt from deserialized data
      const decrypted = EncryptionService.decrypt(deserialized)
      expect(decrypted).toBe(testApiKey)
    })

    it('should handle multiple API keys with serialization', () => {
      const apiKeys = [
        'sk-ant-api-key-1-abcdef123456',
        'sk-ant-api-key-2-fedcba654321',
        'sk-ant-api-key-3-123abc456def'
      ]
      
      const encryptedKeys = apiKeys.map(key => {
        const encrypted = EncryptionService.encrypt(key)
        return JSON.parse(JSON.stringify(encrypted)) // Simulate DB storage
      })
      
      const decryptedKeys = encryptedKeys.map(encrypted => 
        EncryptionService.decrypt(encrypted)
      )
      
      expect(decryptedKeys).toEqual(apiKeys)
    })

    it('should validate encrypted data structure before decryption', () => {
      const incompleteData = {
        encrypted: '1234567890abcdef',
        iv: '0123456789abcdef0123456789abcdef'
        // missing tag
      }
      
      expect(() => EncryptionService.decrypt(incompleteData as any)).toThrow('Decryption failed')
    })
  })

  describe('Performance and Efficiency', () => {
    it('should encrypt and decrypt within reasonable time limits', () => {
      const iterations = 100
      const startTime = Date.now()
      
      for (let i = 0; i < iterations; i++) {
        const encrypted = EncryptionService.encrypt(testApiKey)
        const decrypted = EncryptionService.decrypt(encrypted)
        expect(decrypted).toBe(testApiKey)
      }
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / iterations
      
      // Should complete in reasonable time (adjust threshold as needed)
      expect(averageTime).toBeLessThan(10) // 10ms average per encrypt/decrypt cycle
    })

    it('should handle concurrent encryption operations', async () => {
      const promises = Array.from({ length: 50 }, (_, i) => 
        new Promise<void>((resolve) => {
          const key = `${testApiKey}-${i}`
          const encrypted = EncryptionService.encrypt(key)
          const decrypted = EncryptionService.decrypt(encrypted)
          expect(decrypted).toBe(key)
          resolve()
        })
      )
      
      await expect(Promise.all(promises)).resolves.toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should provide meaningful error messages', () => {
      try {
        EncryptionService.decrypt({
          encrypted: 'invalid',
          iv: 'invalid',
          tag: 'invalid'
        })
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Decryption failed')
      }
    })

    it('should handle null/undefined inputs gracefully', () => {
      expect(() => EncryptionService.encrypt(null as any)).toThrow()
      expect(() => EncryptionService.encrypt(undefined as any)).toThrow()
      expect(() => EncryptionService.decrypt(null as any)).toThrow('Decryption failed')
      expect(() => EncryptionService.decrypt(undefined as any)).toThrow('Decryption failed')
    })
  })

  describe('Unicode and Character Encoding', () => {
    it('should handle Unicode characters in API keys', () => {
      const unicodeKey = 'sk-ant-api-key-with-unicode-🔑-中文-emoji'
      const encrypted = EncryptionService.encrypt(unicodeKey)
      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(unicodeKey)
    })

    it('should handle newlines and control characters', () => {
      const keyWithNewlines = 'sk-ant-api-key\n\r\t-with-control-chars'
      const encrypted = EncryptionService.encrypt(keyWithNewlines)
      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(keyWithNewlines)
    })

    it('should preserve exact byte sequences', () => {
      const binaryLikeKey = 'sk-ant-\x00\x01\x02\x03-binary-like-key'
      const encrypted = EncryptionService.encrypt(binaryLikeKey)
      const decrypted = EncryptionService.decrypt(encrypted)
      expect(decrypted).toBe(binaryLikeKey)
    })
  })

  describe('Compatibility with Database Storage', () => {
    it('should create database-safe JSON strings', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      const jsonString = JSON.stringify(encrypted)
      
      // Should not contain problematic characters for most databases
      expect(jsonString).not.toMatch(/[\x00-\x1f\x7f-\x9f]/) // No control characters
      expect(jsonString).toMatch(/^{.*}$/) // Valid JSON object format
      
      // Should be parseable back
      const parsed = JSON.parse(jsonString)
      expect(parsed).toEqual(encrypted)
      
      // Should decrypt correctly after JSON round trip
      const decrypted = EncryptionService.decrypt(parsed)
      expect(decrypted).toBe(testApiKey)
    })

    it('should maintain consistency across multiple JSON serialization cycles', () => {
      const encrypted = EncryptionService.encrypt(testApiKey)
      
      // Multiple serialization/deserialization cycles
      let current = encrypted
      for (let i = 0; i < 5; i++) {
        const serialized = JSON.stringify(current)
        current = JSON.parse(serialized)
      }
      
      // Should still decrypt correctly
      const decrypted = EncryptionService.decrypt(current)
      expect(decrypted).toBe(testApiKey)
    })
  })
})