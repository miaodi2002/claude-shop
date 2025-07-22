# Admin User Setup Guide

This guide explains how to set up the initial admin user for the Claude AWS Account Marketplace.

## 🚀 Quick Setup

### Option 1: Automatic Setup (Recommended)

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push database schema (if using a cloud database)
npm run db:push

# Create admin user and sample data
npm run db:seed
```

### Option 2: Admin Only Setup

```bash
# Setup just the admin user (no sample data)
npm run setup:admin
```

## 👤 Default Admin Credentials

After running the setup, you can log in with:

- **Username**: `admin`
- **Password**: `Password1!`
- **Login URL**: http://localhost:3000/admin/login

## 🔐 Security Notes

⚠️ **IMPORTANT**: Please change the default password after first login!

The default password hash is stored in:
- Environment variable: `ADMIN_PASSWORD_HASH`
- Database: `Admin.passwordHash` field

## 📋 What Gets Created

### Admin User
- Username: `admin`
- Password: `Password1!` (hashed with bcrypt)
- Status: Active
- Full access to admin dashboard

### Sample Data (if using db:seed)
- 3 sample Claude accounts (High, Medium, Low tier)
- Model quotas for different Claude versions
- Proper account status and pricing

## 🛠 Manual Setup

If you prefer to set up manually:

1. **Generate password hash**:
```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Password1!', 10));"
```

2. **Update environment variables**:
```env
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH="$2a$10$your_generated_hash_here"
```

3. **Create admin in database**:
```sql
INSERT INTO "Admin" (id, username, "passwordHash", "isActive", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'admin', '$2a$10$your_hash_here', true, NOW(), NOW());
```

## 🧪 Testing the Setup

1. **Start the development server**:
```bash
npm run dev
```

2. **Navigate to admin login**:
```
http://localhost:3000/admin/login
```

3. **Login with credentials**:
- Username: `admin`
- Password: `Password1!`

4. **Verify access to dashboard**:
```
http://localhost:3000/admin/dashboard
```

## 🔧 Troubleshooting

### "Invalid credentials" error
- Verify the password hash is correct in `.env`
- Check that the admin user exists in the database
- Ensure the user is marked as active (`isActive: true`)

### Database connection issues
- Verify `DATABASE_URL` in `.env`
- Ensure your database is running
- Check network connectivity

### Permission errors
- Verify the database user has necessary permissions
- Check that tables are created properly

## 📚 Additional Scripts

- `npm run db:studio` - Open Prisma Studio to view/edit data
- `npm run db:migrate` - Run database migrations
- `npm run setup:admin` - Setup admin user only
- `npm run db:seed` - Full database seeding

## 🔄 Changing Admin Password

### Via Database
```sql
UPDATE "Admin" 
SET "passwordHash" = '$2a$10$new_hash_here', "updatedAt" = NOW()
WHERE username = 'admin';
```

### Via Environment + Restart
1. Generate new hash
2. Update `ADMIN_PASSWORD_HASH` in `.env`
3. Run `npm run setup:admin` to update database

## 📞 Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure database connectivity
4. Review the audit logs in the database for login attempts