import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('admin-session')
    
    return NextResponse.json({
      hasCookie: !!sessionCookie,
      cookieValue: sessionCookie?.value ? sessionCookie.value.substring(0, 20) + '...' : null,
      allCookies: cookieStore.getAll().map(c => ({ name: c.name, valueLength: c.value.length }))
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}