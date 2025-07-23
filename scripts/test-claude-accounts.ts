import { PrismaClient } from '@prisma/client'
import { EncryptionService } from '../lib/encryption/service'

const prisma = new PrismaClient()

async function testClaudeAccounts() {
  try {
    console.log('🔍 Testing Claude Accounts CRUD...')
    
    // Create a test account
    const testAccount = {
      apiKey: 'sk-ant-test-key-123456789',
      accountName: 'Test Integration Account',
      email: 'test@example.com',
      organization: 'Test Organization',
      tier: 'FREE' as const,
      usageLimit: 10000
    }
    
    // Encrypt API key
    const encryptedApiKey = EncryptionService.encrypt(testAccount.apiKey)
    const apiKeyHash = JSON.stringify(encryptedApiKey)
    
    console.log('✅ Creating test account...')
    const created = await prisma.claudeAccount.create({
      data: {
        ...testAccount,
        apiKey: apiKeyHash,
      }
    })
    
    console.log('✅ Account created:', {
      id: created.id,
      accountName: created.accountName,
      status: created.status,
      tier: created.tier
    })
    
    // List all accounts
    console.log('\n📋 Listing all accounts...')
    const accounts = await prisma.claudeAccount.findMany({
      select: {
        id: true,
        accountName: true,
        status: true,
        tier: true,
        email: true
      }
    })
    
    console.log(`Found ${accounts.length} accounts:`)
    accounts.forEach(acc => {
      console.log(`  - ${acc.accountName} (${acc.status}, ${acc.tier})`)
    })
    
    // Clean up - delete the test account
    console.log('\n🧹 Cleaning up test account...')
    await prisma.claudeAccount.delete({
      where: { id: created.id }
    })
    console.log('✅ Test account deleted')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testClaudeAccounts()