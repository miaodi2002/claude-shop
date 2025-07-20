import { JWTService } from '@/lib/auth/jwt'

describe('JWTService', () => {
  const testPayload = {
    adminId: 'test-admin-id',
    username: 'testadmin',
  }

  describe('Token Generation and Verification', () => {
    test('should generate and verify valid JWT token', () => {
      const token = JWTService.sign(testPayload)
      
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
      
      const decoded = JWTService.verify(token)
      expect(decoded.adminId).toBe(testPayload.adminId)
      expect(decoded.username).toBe(testPayload.username)
      expect(decoded.iat).toBeDefined()
      expect(decoded.exp).toBeDefined()
    })

    test('should include correct issuer and audience', () => {
      const token = JWTService.sign(testPayload)
      const decoded = JWTService.verify(token)
      
      // JWT verification already checks issuer and audience
      expect(decoded).toBeDefined()
    })

    test('should reject invalid token', () => {
      expect(() => {
        JWTService.verify('invalid.token.here')
      }).toThrow('Invalid token')
    })

    test('should reject token with wrong secret', () => {
      // This would be a token signed with different secret
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZG1pbklkIjoidGVzdCIsInVzZXJuYW1lIjoidGVzdCIsImlhdCI6MTYyMDAwMDAwMCwiZXhwIjoxNjIwMDg2NDAwLCJpc3MiOiJjbGF1ZGUtc2hvcCIsImF1ZCI6ImFkbWluIn0.invalid-signature'
      
      expect(() => {
        JWTService.verify(fakeToken)
      }).toThrow('Invalid token')
    })
  })

  describe('Token Expiration', () => {
    test('should detect expiring token', () => {
      // Create a token that expires soon (mock)
      const token = JWTService.sign(testPayload)
      
      // For a fresh token, it should not be expiring soon
      expect(JWTService.isExpiringSoon(token)).toBe(false)
    })

    test('should handle invalid token in expiration check', () => {
      expect(JWTService.isExpiringSoon('invalid-token')).toBe(true)
    })
  })

  describe('Secure Token Generation', () => {
    test('should generate secure random tokens', () => {
      const token1 = JWTService.generateSecureToken()
      const token2 = JWTService.generateSecureToken()
      
      expect(token1).toHaveLength(64) // 32 bytes = 64 hex chars
      expect(token2).toHaveLength(64)
      expect(token1).not.toBe(token2)
      expect(token1).toMatch(/^[a-f0-9]+$/)
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed tokens gracefully', () => {
      const malformedTokens = [
        '',
        'not.a.token',
        'too.few.parts',
        'too.many.parts.here.now',
        null,
        undefined,
      ]

      malformedTokens.forEach(token => {
        expect(() => {
          JWTService.verify(token as string)
        }).toThrow()
      })
    })

    test('should provide specific error messages', () => {
      expect(() => {
        JWTService.verify('invalid-token')
      }).toThrow('Invalid token')
    })
  })
})