import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAuthenticatedUser } from '@/lib/auth/middleware'

export async function GET(request: NextRequest) {
  // Debug authentication
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('admin-session')
  
  const headers = Object.fromEntries(request.headers.entries())
  const user = getAuthenticatedUser(request)
  
  return NextResponse.json({
    sessionCookie: sessionCookie ? {
      name: sessionCookie.name,
      value: sessionCookie.value.substring(0, 10) + '...',
      exists: true
    } : null,
    adminHeaders: {
      'x-admin-id': headers['x-admin-id'] || null,
      'x-admin-username': headers['x-admin-username'] || null,
    },
    authenticatedUser: user,
    allHeaders: Object.keys(headers),
    middleware: 'Check if middleware ran'
  })
}