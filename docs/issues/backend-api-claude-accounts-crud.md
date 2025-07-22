# Issue: Backend API for Claude Accounts CRUD Operations

## Overview
Implement a complete RESTful API for managing Claude accounts in the admin panel. This includes creating database models, API endpoints, validation schemas, and integrating with existing authentication and audit logging systems.

## Objectives
- Create database schema for Claude accounts
- Implement CRUD API endpoints with proper validation
- Integrate with existing authentication and authorization
- Add comprehensive audit logging
- Ensure API key encryption for security

## Database Schema

### New Prisma Model
```prisma
model ClaudeAccount {
  id            String   @id @default(cuid())
  apiKey        String   @unique // Encrypted
  accountName   String
  email         String?
  organization  String?
  status        ClaudeAccountStatus @default(ACTIVE)
  tier          ClaudeTier @default(FREE)
  usageLimit    Int?     // Monthly usage limit in tokens
  currentUsage  Int      @default(0)
  features      Json?    // JSON object for feature flags
  metadata      Json?    // Additional metadata
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  auditLogs     AuditLog[]
}

enum ClaudeAccountStatus {
  ACTIVE
  SUSPENDED
  EXPIRED
  PENDING
}

enum ClaudeTier {
  FREE
  PRO
  ENTERPRISE
}
```

## API Endpoints

### 1. List Claude Accounts
**Endpoint**: `GET /api/v1/admin/claude-accounts`

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10, max: 100)
- `sortBy` (string): Field to sort by (default: createdAt)
- `sortOrder` (string): asc or desc (default: desc)
- `search` (string): Search by name, email, or organization
- `status` (string): Filter by status
- `tier` (string): Filter by tier

**Response**:
```typescript
{
  success: true,
  data: ClaudeAccount[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  message: string
}
```

### 2. Get Single Claude Account
**Endpoint**: `GET /api/v1/admin/claude-accounts/:id`

**Response**:
```typescript
{
  success: true,
  data: ClaudeAccount,
  message: string
}
```

### 3. Create Claude Account
**Endpoint**: `POST /api/v1/admin/claude-accounts`

**Request Body**:
```typescript
{
  apiKey: string,         // Required
  accountName: string,    // Required
  email?: string,
  organization?: string,
  tier?: ClaudeTier,
  usageLimit?: number,
  features?: object,
  metadata?: object
}
```

**Actions**:
- Validate input with Zod schema
- Check for duplicate API key
- Encrypt API key before storage
- Create audit log entry

### 4. Update Claude Account
**Endpoint**: `PUT /api/v1/admin/claude-accounts/:id`

**Request Body**: Partial update of any field except `id` and `apiKey`

**Actions**:
- Validate input
- Update only provided fields
- Create audit log entry

### 5. Delete Claude Account
**Endpoint**: `DELETE /api/v1/admin/claude-accounts/:id`

**Actions**:
- Delete account and related data
- Create audit log entry

## Implementation Tasks

### 1. Database Setup
- [ ] Create Prisma migration for ClaudeAccount model
- [ ] Add indexes for apiKey and search fields
- [ ] Test migration rollback

### 2. API Implementation
- [ ] Create `/app/api/v1/admin/claude-accounts/route.ts` for list/create
- [ ] Create `/app/api/v1/admin/claude-accounts/[id]/route.ts` for get/update/delete
- [ ] Implement Zod validation schemas
- [ ] Add API response helpers

### 3. Business Logic
- [ ] Implement API key encryption/decryption
- [ ] Add usage tracking logic
- [ ] Create service layer for complex operations

### 4. Security & Validation
- [ ] Ensure all endpoints require admin authentication
- [ ] Validate all inputs with Zod
- [ ] Implement rate limiting
- [ ] Add input sanitization

### 5. Testing
- [ ] Unit tests for validation schemas
- [ ] Integration tests for each endpoint
- [ ] Test error scenarios
- [ ] Test audit logging

## Technical Requirements

### Dependencies
- Existing: Prisma, Zod, JWT auth, Encryption service
- No new dependencies required

### Performance Considerations
- Index frequently searched fields
- Implement pagination for list endpoint
- Cache frequently accessed accounts
- Optimize database queries

### Security Requirements
- API keys must be encrypted using EncryptionService
- All endpoints require admin authentication
- Audit log all CRUD operations
- Implement proper error handling without exposing sensitive data

## Validation Schemas (Zod)

```typescript
// Create schema
const createClaudeAccountSchema = z.object({
  apiKey: z.string().min(1),
  accountName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  organization: z.string().max(100).optional(),
  tier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional(),
  usageLimit: z.number().positive().optional(),
  features: z.object({}).passthrough().optional(),
  metadata: z.object({}).passthrough().optional()
});

// Update schema (all fields optional)
const updateClaudeAccountSchema = createClaudeAccountSchema.partial().omit({ apiKey: true });

// Query params schema
const listQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(10),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'EXPIRED', 'PENDING']).optional(),
  tier: z.enum(['FREE', 'PRO', 'ENTERPRISE']).optional()
});
```

## Error Handling
- 400: Validation errors
- 401: Unauthorized (not authenticated)
- 403: Forbidden (not admin)
- 404: Claude account not found
- 409: Duplicate API key
- 500: Server errors

## Audit Logging
All operations should create audit log entries with:
- Action type (CREATE, UPDATE, DELETE, VIEW)
- Resource type (CLAUDE_ACCOUNT)
- Resource ID
- Changes made (for updates)
- Admin user ID
- Timestamp

## Acceptance Criteria
- [ ] All CRUD endpoints implemented and working
- [ ] Proper authentication and authorization
- [ ] API key encryption working
- [ ] Comprehensive validation
- [ ] Audit logging for all operations
- [ ] Error handling with appropriate status codes
- [ ] Unit and integration tests passing
- [ ] API documentation updated

## Estimated Effort
- Database setup: 2 hours
- API implementation: 4 hours
- Testing: 2 hours
- Total: 8 hours