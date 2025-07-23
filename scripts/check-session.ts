import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSession() {
  try {
    const token = '5806654898f1b5412e3e718d5c56bd97dc2036916b175647dcc93887330ecee0'
    
    // Find session
    const session = await prisma.adminSession.findUnique({
      where: { token },
      include: { admin: true }
    })
    
    if (!session) {
      console.log('❌ Session not found in database')
      
      // List all sessions
      const allSessions = await prisma.adminSession.findMany({
        include: { admin: true }
      })
      
      console.log('\n📋 All sessions in database:')
      allSessions.forEach(s => {
        console.log(`- Token: ${s.token.substring(0, 10)}...`)
        console.log(`  Admin: ${s.admin.username}`)
        console.log(`  Expires: ${s.expiresAt}`)
        console.log(`  Expired: ${s.expiresAt < new Date() ? 'Yes' : 'No'}`)
      })
    } else {
      console.log('✅ Session found:')
      console.log('  Admin:', session.admin.username)
      console.log('  Expires:', session.expiresAt)
      console.log('  Expired:', session.expiresAt < new Date() ? 'Yes' : 'No')
      console.log('  Admin active:', session.admin.isActive)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSession()