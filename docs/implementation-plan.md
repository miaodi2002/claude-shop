# Implementation Plan - Claude AWS Account Marketplace

## Overview
This document provides a detailed implementation plan for building the Claude AWS Account Marketplace MVP using Next.js 14+, Supabase, and the designed architecture.

## Project Setup Commands

```bash
# Create Next.js project
npx create-next-app@latest claude-shop --typescript --tailwind --app --src-dir=false --import-alias="@/*"

# Install dependencies
npm install @supabase/supabase-js @prisma/client prisma
npm install zustand swr axios zod bcryptjs jsonwebtoken
npm install @radix-ui/react-dialog @radix-ui/react-select @radix-ui/react-slider
npm install lucide-react clsx tailwind-merge
npm install --save-dev @types/bcryptjs @types/jsonwebtoken

# Setup Prisma
npx prisma init

# Install shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog form input select slider table toast alert badge tabs sheet skeleton
```

## Implementation Phases

### Phase 1: Foundation Setup (Day 1-2)

#### 1.1 Project Configuration
```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: true,
  },
  images: {
    domains: ['localhost', 'claude-accounts.com'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

#### 1.2 Environment Setup
```bash
# .env.local
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY"
NEXTAUTH_SECRET="generated-secret-key"
ENCRYPTION_KEY="base64-encoded-32-byte-key"
TELEGRAM_USERNAME="your_telegram_username"
```

#### 1.3 Database Setup
```bash
# Update prisma/schema.prisma with the schema from design docs

# Generate Prisma client
npx prisma generate

# Create migrations
npx prisma migrate dev --name init

# Seed initial admin user
npx prisma db seed
```

#### 1.4 Project Structure Creation
```bash
# Create directory structure
mkdir -p app/{api/v1/{accounts,admin,filters},admin/{accounts/{new,[id]},audit,login},(public)/account/[id]}
mkdir -p components/{features/{accounts,admin,auth,filters},layouts,shared,ui}
mkdir -p lib/{api,auth,db,utils,validation}
mkdir -p hooks services stores types utils
```

### Phase 2: Core Infrastructure (Day 3-4)

#### 2.1 Database Connection & Prisma Setup
```typescript
// lib/db/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

#### 2.2 Authentication Utilities
```typescript
// lib/auth/session.ts
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/db/prisma';
import { cookies } from 'next/headers';

export async function createSession(adminId: string) {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  const session = await prisma.adminSession.create({
    data: {
      adminId,
      token,
      expiresAt,
    },
  });
  
  // Set httpOnly cookie
  cookies().set('session-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
  });
  
  return session;
}

export async function validateSession(token: string) {
  const session = await prisma.adminSession.findUnique({
    where: { token },
    include: { admin: true },
  });
  
  if (!session || session.expiresAt < new Date()) {
    return null;
  }
  
  return session;
}
```

#### 2.3 Encryption Service
```typescript
// lib/crypto/encryption.ts
import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private key: Buffer;
  
  constructor() {
    const keyString = process.env.ENCRYPTION_KEY;
    if (!keyString) throw new Error('Encryption key not configured');
    this.key = Buffer.from(keyString, 'base64');
  }
  
  encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }
  
  decrypt(encrypted: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### Phase 3: API Implementation (Day 5-6)

#### 3.1 Public API Routes
```typescript
// app/api/v1/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(12),
  models: z.string().optional(),
  quotaLevel: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  inStock: z.coerce.boolean().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'created_asc', 'created_desc']).default('created_desc'),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = querySchema.parse(Object.fromEntries(searchParams));
    
    // Build where clause
    const where: any = {
      status: query.inStock ? 'AVAILABLE' : undefined,
    };
    
    if (query.quotaLevel) {
      where.quotaLevel = query.quotaLevel;
    }
    
    if (query.minPrice || query.maxPrice) {
      where.priceAmount = {
        gte: query.minPrice,
        lte: query.maxPrice,
      };
    }
    
    // Handle model filtering
    if (query.models) {
      const modelTypes = query.models.split(',');
      where.quotas = {
        some: {
          modelType: { in: modelTypes },
          isAvailable: true,
        },
      };
    }
    
    // Execute query with pagination
    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where,
        include: {
          quotas: {
            where: { isAvailable: true },
            select: { modelType: true },
          },
        },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: getOrderBy(query.sortBy),
      }),
      prisma.account.count({ where }),
    ]);
    
    // Transform to listing format
    const listings = accounts.map(transformToListing);
    
    return NextResponse.json({
      data: listings,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        hasNext: query.page * query.limit < total,
        hasPrev: query.page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 3.2 Admin API Routes
```typescript
// app/api/v1/admin/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createSession } from '@/lib/auth/session';

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8).max(100),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);
    
    // Find admin
    const admin = await prisma.admin.findUnique({
      where: { username },
    });
    
    if (!admin || !admin.isActive) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValid = await bcrypt.compare(password, admin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Create session
    const session = await createSession(admin.id);
    
    // Update last login
    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });
    
    // Log the event
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'ADMIN_LOGIN',
        entityType: 'Admin',
        entityId: admin.id,
        metadata: {
          userAgent: request.headers.get('user-agent'),
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        },
      },
    });
    
    return NextResponse.json({
      token: session.token,
      admin: {
        id: admin.id,
        username: admin.username,
        lastLogin: admin.lastLogin,
      },
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Phase 4: Frontend Implementation (Day 7-9)

#### 4.1 Layout Components
```typescript
// app/(public)/layout.tsx
import { PublicHeader } from '@/components/layouts/PublicHeader';
import { PublicFooter } from '@/components/layouts/PublicFooter';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
```

#### 4.2 Account Listing Page
```typescript
// app/(public)/page.tsx
'use client';

import { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { AccountGrid } from '@/components/features/accounts/AccountGrid';
import { FilterPanel } from '@/components/features/filters/FilterPanel';
import { Pagination } from '@/components/shared/Pagination';

export default function HomePage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  
  const { accounts, loading, error, pagination } = useAccounts({
    page,
    ...filters,
  });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">
        Claude AWS Accounts Marketplace
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <FilterPanel
            onFilterChange={setFilters}
            onReset={() => setFilters({})}
          />
        </aside>
        
        <main className="lg:col-span-3">
          <AccountGrid
            accounts={accounts}
            loading={loading}
            emptyMessage="No accounts match your filters"
          />
          
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
```

#### 4.3 Core Components
```typescript
// components/features/accounts/AccountCard.tsx
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AccountListing } from '@/types/account';
import Link from 'next/link';

interface AccountCardProps {
  account: AccountListing;
}

export function AccountCard({ account }: AccountCardProps) {
  const quotaLevelColors = {
    HIGH: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-blue-100 text-blue-800',
  };
  
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{account.displayName}</CardTitle>
          <Badge className={quotaLevelColors[account.quotaLevel]}>
            {account.quotaLevel} Quota
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Supported Models:</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {account.primaryModels.slice(0, 3).map((model) => (
                <Badge key={model} variant="outline" className="text-xs">
                  {model}
                </Badge>
              ))}
              {account.primaryModels.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{account.primaryModels.length - 3} more
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold">
              ${account.price.amount}
            </span>
            <Badge variant={account.stockAvailable ? 'default' : 'secondary'}>
              {account.stockAvailable ? 'In Stock' : 'Sold Out'}
            </Badge>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button asChild className="w-full" disabled={!account.stockAvailable}>
          <Link href={`/account/${account.id}`}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Phase 5: Admin Panel (Day 10-11)

#### 5.1 Admin Authentication
```typescript
// app/admin/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/components/ui/use-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');
  
  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      setError('');
      await login(credentials);
      toast({ title: 'Login successful' });
      router.push('/admin/accounts');
    } catch (err) {
      setError('Invalid username or password');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Login
          </h2>
        </div>
        <LoginForm onSubmit={handleLogin} error={error} />
      </div>
    </div>
  );
}
```

#### 5.2 Account Management
```typescript
// app/admin/accounts/page.tsx
'use client';

import { useState } from 'react';
import { useAdminAccounts } from '@/hooks/useAdminAccounts';
import { AccountsTable } from '@/components/features/admin/AccountsTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default function AdminAccountsPage() {
  const { accounts, loading, mutate } = useAdminAccounts();
  
  const handleStatusChange = async (id: string, status: AccountStatus) => {
    await updateAccountStatus(id, status);
    mutate();
  };
  
  const handleRefreshQuota = async (id: string) => {
    await refreshAccountQuota(id);
    mutate();
  };
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Account Management</h1>
        <Button asChild>
          <Link href="/admin/accounts/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Account
          </Link>
        </Button>
      </div>
      
      <AccountsTable
        accounts={accounts}
        onStatusChange={handleStatusChange}
        onRefreshQuota={handleRefreshQuota}
      />
    </div>
  );
}
```

### Phase 6: Testing & Optimization (Day 12-13)

#### 6.1 API Testing Script
```typescript
// scripts/test-api.ts
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';

async function testPublicEndpoints() {
  console.log('Testing public endpoints...');
  
  // Test account listing
  const listResponse = await axios.get(`${API_BASE}/accounts`);
  console.log('Account list:', listResponse.data.data.length, 'accounts');
  
  // Test filtering
  const filteredResponse = await axios.get(`${API_BASE}/accounts?quotaLevel=HIGH`);
  console.log('Filtered accounts:', filteredResponse.data.data.length);
  
  // Test account detail
  if (listResponse.data.data.length > 0) {
    const accountId = listResponse.data.data[0].id;
    const detailResponse = await axios.get(`${API_BASE}/accounts/${accountId}`);
    console.log('Account detail:', detailResponse.data.name);
  }
}

async function testAdminEndpoints() {
  console.log('Testing admin endpoints...');
  
  // Login
  const loginResponse = await axios.post(`${API_BASE}/admin/auth/login`, {
    username: 'admin',
    password: 'your-password',
  });
  
  const token = loginResponse.data.token;
  console.log('Login successful, token received');
  
  // Test authenticated requests
  const adminAccounts = await axios.get(`${API_BASE}/admin/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  console.log('Admin accounts:', adminAccounts.data.data.length);
}

// Run tests
testPublicEndpoints()
  .then(() => testAdminEndpoints())
  .catch(console.error);
```

#### 6.2 Performance Optimization
```typescript
// next.config.js updates
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

// Implement API response caching
// app/api/v1/accounts/route.ts
export async function GET(request: NextRequest) {
  // Add cache headers for public data
  const response = NextResponse.json(data);
  response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate');
  return response;
}
```

### Phase 7: Deployment (Day 14)

#### 7.1 Pre-deployment Checklist
- [ ] Environment variables configured in Vercel
- [ ] Database migrations run on production
- [ ] Admin user seeded in production
- [ ] Security headers tested
- [ ] API rate limiting verified
- [ ] Error handling comprehensive
- [ ] Logging configured

#### 7.2 Deployment Commands
```bash
# Build and test locally
npm run build
npm run start

# Deploy to Vercel
vercel --prod

# Run production migrations
npx prisma migrate deploy

# Seed admin user (run once)
npx prisma db seed
```

#### 7.3 Post-deployment Verification
```bash
# Test production endpoints
curl https://claude-accounts.com/api/v1/accounts
curl https://claude-accounts.com/api/v1/filters/options

# Monitor logs
vercel logs --follow
```

## Development Best Practices

### Code Quality
- Use TypeScript strict mode
- Implement proper error boundaries
- Add loading states for all async operations
- Use optimistic updates for better UX
- Implement proper SEO with Next.js metadata

### Security
- Never log sensitive data
- Validate all inputs
- Use parameterized queries (Prisma handles this)
- Implement CSRF protection
- Regular dependency updates

### Performance
- Use React Server Components where possible
- Implement proper caching strategies
- Optimize images and assets
- Use database indexes effectively
- Monitor Core Web Vitals

## Maintenance Tasks

### Regular Tasks
1. **Daily**: Monitor error logs and performance metrics
2. **Weekly**: Review security alerts and update dependencies
3. **Monthly**: Database optimization and backup verification
4. **Quarterly**: Security audit and penetration testing

### Monitoring Setup
```typescript
// lib/monitoring/logger.ts
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(JSON.stringify({ level: 'info', message, ...meta }));
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      message, 
      error: error?.message,
      stack: error?.stack,
      ...meta 
    }));
  },
  audit: (action: string, adminId: string, meta?: any) => {
    console.log(JSON.stringify({ 
      level: 'audit', 
      action, 
      adminId, 
      timestamp: new Date().toISOString(),
      ...meta 
    }));
  },
};
```

## Future Enhancements

### Phase 2 Features
1. **Payment Integration**: Stripe/PayPal integration
2. **Order Management**: Purchase history and receipts
3. **Email Notifications**: Order confirmations
4. **Advanced Filtering**: Full-text search
5. **Analytics Dashboard**: Sales metrics and insights

### Phase 3 Features
1. **Multi-language Support**: i18n implementation
2. **Customer Reviews**: Rating system
3. **Wishlist Feature**: Save accounts for later
4. **Bulk Operations**: Admin bulk updates
5. **API Rate Limiting**: Per-IP and per-endpoint limits

## Troubleshooting Guide

### Common Issues

1. **Database Connection Errors**
   - Verify DATABASE_URL is correct
   - Check Supabase connection pooling settings
   - Ensure SSL is enabled for production

2. **Authentication Issues**
   - Verify NEXTAUTH_SECRET is set
   - Check cookie settings for production
   - Ensure HTTPS is enabled

3. **Build Errors**
   - Clear .next and node_modules
   - Verify all environment variables
   - Check for TypeScript errors

4. **Performance Issues**
   - Enable query logging in development
   - Check for N+1 queries
   - Verify database indexes
   - Monitor API response times