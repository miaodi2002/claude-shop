#!/usr/bin/env tsx

/**
 * Setup script to create the initial admin user
 * Usage: npm run setup:admin
 */

import bcrypt from 'bcryptjs'

async function setupAdmin() {
  console.log('🔧 Admin User Setup Helper...')

  const username = 'admin'
  const password = 'Password1!'
  
  try {
    // Generate password hash
    const passwordHash = await bcrypt.hash(password, 10)
    
    console.log(`
🎉 Admin Setup Information Generated!

📧 Admin Credentials:
   Username: ${username}
   Password: ${password}

🔐 Password Hash:
   ${passwordHash}

📝 Setup Steps:
1. Update your .env file with:
   ADMIN_USERNAME="${username}"
   ADMIN_PASSWORD_HASH="${passwordHash}"

2. Ensure your database is running and accessible

3. Run database setup:
   npm run db:generate  # Generate Prisma client
   npm run db:push      # Create database schema
   npm run db:seed      # Create admin user and sample data

4. Start the application:
   npm run dev

5. Access admin login:
   http://localhost:3000/admin/login

⚠️  IMPORTANT: Change the default password after first login!

📋 Environment Variables Needed:
   - DATABASE_URL (PostgreSQL connection string)
   - JWT_SECRET (32+ character secret)
   - ENCRYPTION_KEY (32 character encryption key)
    `)

  } catch (error) {
    console.error('❌ Error generating admin setup:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  setupAdmin()
}

export { setupAdmin }