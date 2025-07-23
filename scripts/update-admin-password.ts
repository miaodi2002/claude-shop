import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function updateAdminPassword() {
  try {
    // Generate hash for a simple password
    const simplePassword = 'admin123'
    const passwordHash = await bcrypt.hash(simplePassword, 10)
    
    // Update admin password
    const admin = await prisma.admin.update({
      where: { username: 'admin' },
      data: { passwordHash }
    })
    
    console.log('✅ Admin password updated successfully!')
    console.log('Username:', admin.username)
    console.log('New Password:', simplePassword)
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAdminPassword()