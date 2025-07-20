# Claude AWS Account Marketplace

An e-commerce platform for selling AWS accounts with Claude AI model quotas, built with Next.js 14+, Supabase, and Prisma.

## 🏗️ Architecture Overview

This project follows Domain-Driven Design (DDD) principles with a clear separation of concerns:

- **Frontend**: Next.js 14+ with App Router, Tailwind CSS, and shadcn/ui
- **Backend**: Next.js API routes with Prisma ORM
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## 📚 Documentation

### Design Documents
- [Domain Model (DDD)](./docs/domain-model.md) - Core business logic and bounded contexts
- [API Specification](./docs/api-specification.yaml) - OpenAPI/Swagger REST API design
- [Component Architecture](./docs/component-architecture.md) - Frontend component structure
- [Security Architecture](./docs/security-architecture.md) - Authentication, encryption, and security measures
- [Implementation Plan](./docs/implementation-plan.md) - Step-by-step development guide

### Database
- [Prisma Schema](./prisma/schema.prisma) - Complete database schema with relationships

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## 🔑 Key Features

### Public Features
- **Account Browsing**: View available AWS accounts with Claude quotas
- **Advanced Filtering**: Filter by model type, quota level, price range
- **Detailed Information**: View comprehensive quota details for each model
- **Telegram Integration**: Direct contact button for purchases

### Admin Features
- **Secure Authentication**: JWT-based admin login system
- **Account Management**: Full CRUD operations for AWS accounts
- **Quota Refresh**: Manual trigger for updating quotas via Python script
- **Audit Logging**: Track all administrative actions
- **Status Management**: Control account availability

## 🏛️ Project Structure

```
claude-shop/
├── app/                    # Next.js App Router pages
│   ├── (public)/          # Public-facing pages
│   ├── admin/             # Admin panel pages
│   └── api/               # API routes
├── components/            # React components
│   ├── features/          # Feature-specific components
│   ├── layouts/           # Layout components
│   ├── shared/            # Shared/common components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities and core logic
├── prisma/                # Database schema and migrations
├── hooks/                 # Custom React hooks
├── services/              # API service layer
├── stores/                # State management (Zustand)
└── docs/                  # Documentation
```

## 🔒 Security Features

- **Encryption**: AWS credentials encrypted at rest using AES-256-GCM
- **Authentication**: Secure session-based admin authentication
- **Rate Limiting**: API endpoint protection against abuse
- **Input Validation**: Comprehensive validation using Zod
- **Security Headers**: HSTS, CSP, XSS protection
- **Audit Trail**: Complete logging of all administrative actions

## 🛠️ Technology Stack

- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL) + Prisma ORM
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **Data Fetching**: SWR
- **Validation**: Zod
- **Authentication**: Custom JWT implementation
- **Deployment**: Vercel

## 📝 Development Workflow

1. **Planning**: Review requirements and design documents
2. **Implementation**: Follow the implementation plan phases
3. **Testing**: Use provided test scripts and manual testing
4. **Security**: Run security checklist before deployment
5. **Deployment**: Deploy to Vercel with proper environment setup

## 🚦 API Endpoints

### Public Endpoints
- `GET /api/v1/accounts` - List available accounts
- `GET /api/v1/accounts/:id` - Get account details
- `GET /api/v1/filters/options` - Get filter options

### Admin Endpoints (Protected)
- `POST /api/v1/admin/auth/login` - Admin login
- `GET /api/v1/admin/accounts` - List all accounts
- `POST /api/v1/admin/accounts` - Create new account
- `PUT /api/v1/admin/accounts/:id` - Update account
- `DELETE /api/v1/admin/accounts/:id` - Delete account
- `POST /api/v1/admin/accounts/:id/refresh-quota` - Refresh quotas

## 🎯 MVP Scope

### Phase 1 (Current)
- ✅ Public account browsing and filtering
- ✅ Account detail pages with quota information
- ✅ Admin authentication and session management
- ✅ Account CRUD operations
- ✅ Basic security implementation

### Future Phases
- 💳 Payment integration (Stripe/PayPal)
- 📧 Email notifications
- 📊 Analytics dashboard
- 🌍 Multi-language support
- ⭐ Customer reviews and ratings

## 🧪 Testing

```bash
# Run development server
npm run dev

# Run API tests
npm run test:api

# Build for production
npm run build

# Run production build locally
npm run start
```

## 📄 License

This project is proprietary and confidential.

---

Built with ❤️ using Next.js, Supabase, and modern web technologies.