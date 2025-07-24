import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create initial admin user
  const adminUsername = 'admin'
  const adminPassword = 'Password1!'
  const passwordHash = await bcrypt.hash(adminPassword, 10)

  // Check if admin user already exists
  const existingAdmin = await prisma.admin.findUnique({
    where: { username: adminUsername }
  })

  if (existingAdmin) {
    console.log(`👤 Admin user '${adminUsername}' already exists, updating password...`)
    await prisma.admin.update({
      where: { username: adminUsername },
      data: {
        passwordHash,
        isActive: true,
        updatedAt: new Date()
      }
    })
    console.log(`✅ Admin user '${adminUsername}' password updated successfully!`)
  } else {
    const admin = await prisma.admin.create({
      data: {
        username: adminUsername,
        passwordHash,
        isActive: true,
      }
    })
    console.log(`✅ Admin user '${adminUsername}' created successfully!`)
    console.log(`📋 Admin ID: ${admin.id}`)
  }

  // Create some sample accounts for demonstration
  console.log('🏪 Creating sample accounts...')

  const sampleAccounts = [
    {
      name: 'claude-high-tier-001',
      displayName: 'Claude High Tier Account #001',
      awsAccessKeyHash: JSON.stringify({ iv: 'sample', encryptedData: 'sample' }),
      awsSecretKeyHash: 'sample_encrypted_secret',
      status: 'AVAILABLE' as const,
      instructions: 'High-performance Claude account with premium quotas for enterprise use.',
      quotaLevel: 'HIGH' as const,
      quotas: {
        create: [
          {
            modelType: 'CLAUDE_35_SONNET' as any,
            rpm: 1000,
            tpm: 100000,
            tpd: 2000000,
            isAvailable: true
          },
          {
            modelType: 'CLAUDE_35_HAIKU' as any,
            rpm: 2000,
            tpm: 200000,
            tpd: 4000000,
            isAvailable: true
          },
          {
            modelType: 'CLAUDE_40_OPUS_4_V1' as any,
            rpm: 500,
            tpm: 50000,
            tpd: 1000000,
            isAvailable: true
          }
        ]
      }
    },
    {
      name: 'claude-medium-tier-001',
      displayName: 'Claude Medium Tier Account #001',
      awsAccessKeyHash: JSON.stringify({ iv: 'sample', encryptedData: 'sample' }),
      awsSecretKeyHash: 'sample_encrypted_secret',
      status: 'AVAILABLE' as const,
      instructions: 'Balanced Claude account suitable for most development and business needs.',
      quotaLevel: 'MEDIUM' as const,
      quotas: {
        create: [
          {
            modelType: 'CLAUDE_35_SONNET' as any,
            rpm: 500,
            tpm: 50000,
            tpd: 1000000,
            isAvailable: true
          },
          {
            modelType: 'CLAUDE_35_HAIKU' as any,
            rpm: 1000,
            tpm: 100000,
            tpd: 2000000,
            isAvailable: true
          }
        ]
      }
    },
    {
      name: 'claude-starter-001',
      displayName: 'Claude Starter Account #001',
      awsAccessKeyHash: JSON.stringify({ iv: 'sample', encryptedData: 'sample' }),
      awsSecretKeyHash: 'sample_encrypted_secret',
      status: 'AVAILABLE' as const,
      instructions: 'Entry-level Claude account perfect for testing and small projects.',
      quotaLevel: 'LOW' as const,
      quotas: {
        create: [
          {
            modelType: 'CLAUDE_35_HAIKU' as any,
            rpm: 200,
            tpm: 20000,
            tpd: 400000,
            isAvailable: true
          },
          {
            modelType: 'CLAUDE_35_SONNET' as any,
            rpm: 100,
            tpm: 10000,
            tpd: 200000,
            isAvailable: true
          }
        ]
      }
    }
  ]

  for (const accountData of sampleAccounts) {
    const existingAccount = await prisma.account.findUnique({
      where: { name: accountData.name }
    })

    if (!existingAccount) {
      const account = await prisma.account.create({
        data: accountData,
        include: { quotas: true }
      })
      console.log(`✅ Created account: ${account.displayName} (${account.quotas.length} quotas)`)
    } else {
      console.log(`⏭️  Account ${accountData.name} already exists, skipping...`)
    }
  }

  console.log('🎉 Database seeding completed successfully!')
  console.log(`
📧 Admin Login Credentials:
   Username: ${adminUsername}
   Password: ${adminPassword}
   
🔐 Please change the default password after first login!
  `)
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })