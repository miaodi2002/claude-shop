# Domain Model - Claude AWS Account Marketplace

## Overview
This document defines the domain model using Domain-Driven Design (DDD) principles for the Claude AWS Account Marketplace system.

## Bounded Contexts

### 1. Account Management Context
Responsible for managing AWS accounts and their Claude model quotas.

#### Core Entities

##### Account (Aggregate Root)
```typescript
interface Account {
  id: string;
  name: string;
  awsAccessKey: string;         // Encrypted
  awsSecretKey: string;         // Encrypted
  status: AccountStatus;
  price: Money;
  instructions: string;
  quotaProfile: QuotaProfile;
  createdAt: Date;
  updatedAt: Date;
}

enum AccountStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  SOLD = 'SOLD'
}
```

##### QuotaProfile (Value Object)
```typescript
interface QuotaProfile {
  lastUpdated: Date;
  modelQuotas: ModelQuota[];
}

interface ModelQuota {
  modelType: ClaudeModel;
  rpm: number;              // Requests per minute
  tpm: number;              // Tokens per minute
  tpd: number;              // Tokens per day
}

enum ClaudeModel {
  CLAUDE_35_HAIKU = 'claude-3.5-haiku',
  CLAUDE_35_SONNET = 'claude-3.5-sonnet',
  CLAUDE_35_SONNET_V2 = 'claude-3.5-sonnet-v2',
  CLAUDE_37_SONNET_V1 = 'claude-3.7-sonnet-v1',
  CLAUDE_40_OPUS_4_V1 = 'claude-4.0-opus-4-v1',
  CLAUDE_40_SONNET_4_V1 = 'claude-4.0-sonnet-4-v1'
}
```

##### Money (Value Object)
```typescript
interface Money {
  amount: number;
  currency: string;         // 'USD', 'CNY', etc.
}
```

#### Domain Services
- `QuotaUpdateService`: Interfaces with Python script to update quotas
- `AccountPricingService`: Calculates pricing based on quota levels

### 2. Catalog Context
Handles product presentation and search/filtering capabilities.

#### Read Models

##### AccountListing
```typescript
interface AccountListing {
  id: string;
  name: string;
  displayName: string;
  primaryModels: string[];      // Top 3 supported models
  quotaLevel: QuotaLevel;       // HIGH, MEDIUM, LOW
  price: Money;
  status: AccountStatus;
  stockAvailable: boolean;
}

enum QuotaLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}
```

##### AccountDetail
```typescript
interface AccountDetail {
  id: string;
  name: string;
  displayName: string;
  modelQuotas: ModelQuotaDisplay[];
  price: Money;
  instructions: string;
  features: string[];
  limitations: string[];
}

interface ModelQuotaDisplay {
  modelName: string;
  modelDisplayName: string;
  rpm: number;
  tpm: number;
  tpd: number;
  available: boolean;
}
```

### 3. Admin Context
Manages administrative operations and authentication.

#### Entities

##### Admin (Aggregate Root)
```typescript
interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  lastLogin: Date;
  createdAt: Date;
}
```

##### AdminSession
```typescript
interface AdminSession {
  id: string;
  adminId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
```

## Domain Events

```typescript
// Account Management Events
interface AccountCreated {
  accountId: string;
  name: string;
  timestamp: Date;
}

interface AccountStatusChanged {
  accountId: string;
  oldStatus: AccountStatus;
  newStatus: AccountStatus;
  timestamp: Date;
}

interface QuotaUpdated {
  accountId: string;
  quotaProfile: QuotaProfile;
  timestamp: Date;
}

// Admin Events
interface AdminLoggedIn {
  adminId: string;
  sessionId: string;
  timestamp: Date;
}

interface AccountModified {
  accountId: string;
  adminId: string;
  changes: string[];
  timestamp: Date;
}
```

## Anti-Corruption Layer

### External Integration Points
1. **Python Quota Script Integration**
   - Input: AWS credentials
   - Output: Quota data in standardized format
   - Error handling for script failures

2. **Telegram Integration**
   - Pre-formatted message generation
   - Deep link creation for contact

## Ubiquitous Language

- **Account**: An AWS account with Claude API access
- **Quota**: The rate limits and token allowances for Claude models
- **Model**: A specific Claude AI model version
- **Listing**: A public-facing representation of an account
- **Stock**: Availability status of an account
- **RPM/TPM/TPD**: Requests/Tokens per Minute/Day
- **Quota Level**: Categorization of accounts by their quota amounts