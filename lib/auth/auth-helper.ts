import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

export interface AuthUser {
  adminId: string
  username: string
}

/**
 * Get authenticated user directly from cookies
 * This is a workaround for Next.js middleware header passing issues
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = cookies()
    const sessionToken = cookieStore.get('admin-session')?.value
    
    console.log('Auth helper - token:', sessionToken?.substring(0, 20) + '...')
    
    if (!sessionToken) {
      console.log('Auth helper - no token found')
      return null
    }
    
    // Find session in database
    const session = await prisma.adminSession.findUnique({
      where: { token: sessionToken },
      include: { admin: true }
    })
    
    console.log('Auth helper - session found:', !!session)
    
    if (!session || session.expiresAt < new Date() || !session.admin.isActive) {
      console.log('Auth helper - session invalid or expired')
      return null
    }
    
    return {
      adminId: session.adminId,
      username: session.admin.username
    }
  } catch (error) {
    console.error('Auth helper error:', error)
    return null
  }
}