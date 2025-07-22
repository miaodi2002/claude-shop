import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware } from '@/lib/auth/middleware'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Apply security headers to all routes
  const response = NextResponse.next()
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }
  
  // Rate limiting for API routes
  if (pathname.startsWith('/api/')) {
    // Simple rate limiting (in production, use Redis)
    const rateLimitResult = await checkAPIRateLimit(request)
    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Too many requests',
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': rateLimitResult.retryAfter.toString(),
          },
        }
      )
    }
  }
  
  // Apply authentication middleware to admin routes
  if (pathname.startsWith('/api/v1/admin') && !pathname.includes('/auth/login')) {
    const authResult = await authMiddleware(request)
    if (authResult) {
      return authResult // Return error response if authentication fails
    }
  }
  
  // CORS handling for API routes
  if (pathname.startsWith('/api/v1/accounts')) {
    // Allow CORS for public account endpoints
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type')
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }
  
  return response
}

async function checkAPIRateLimit(request: NextRequest): Promise<{
  allowed: boolean
  retryAfter: number
}> {
  // Simple in-memory rate limiting
  // In production, use Redis or a proper rate limiting service
  
  const ip = getClientIP(request)
  const key = `rate_limit:${ip}`
  
  // For demo purposes, allow all requests
  // In production, implement proper rate limiting
  return { allowed: true, retryAfter: 0 }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return request.ip || 'unknown'
}

export const config = {
  matcher: [
    '/api/(.*)',
    '/admin/(.*)',
  ],
}