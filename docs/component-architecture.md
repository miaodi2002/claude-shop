# Component Architecture - Claude AWS Account Marketplace

## Overview
This document outlines the component structure for the Next.js 14+ application using App Router, Tailwind CSS, and shadcn/ui components.

## Project Structure

```
claude-shop/
├── app/
│   ├── (public)/                    # Public routes group
│   │   ├── layout.tsx              # Public layout with header/footer
│   │   ├── page.tsx                # Homepage (account listings)
│   │   ├── account/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Account detail page
│   │   └── not-found.tsx
│   │
│   ├── admin/                      # Admin routes group
│   │   ├── layout.tsx              # Admin layout with auth check
│   │   ├── page.tsx                # Admin dashboard redirect
│   │   ├── login/
│   │   │   └── page.tsx            # Admin login page
│   │   ├── accounts/
│   │   │   ├── page.tsx            # Account management list
│   │   │   ├── new/
│   │   │   │   └── page.tsx        # Create new account
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Edit account
│   │   │       └── edit/
│   │   │           └── page.tsx    # Edit form
│   │   └── audit/
│   │       └── page.tsx            # Audit logs
│   │
│   ├── api/                        # API routes
│   │   └── v1/
│   │       ├── accounts/
│   │       ├── admin/
│   │       └── filters/
│   │
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   └── providers.tsx               # Client providers wrapper
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   ├── features/                   # Feature-specific components
│   ├── shared/                     # Shared components
│   └── layouts/                    # Layout components
│
├── lib/                            # Utilities and helpers
├── hooks/                          # Custom React hooks
├── services/                       # API service layer
├── stores/                         # State management (Zustand)
├── types/                          # TypeScript type definitions
└── utils/                          # Utility functions
```

## Component Hierarchy

### Public Components

```typescript
// components/features/accounts/AccountCard.tsx
interface AccountCardProps {
  account: AccountListing;
  onViewDetails: (id: string) => void;
}

// components/features/accounts/AccountGrid.tsx
interface AccountGridProps {
  accounts: AccountListing[];
  loading?: boolean;
  emptyMessage?: string;
}

// components/features/filters/FilterPanel.tsx
interface FilterPanelProps {
  filters: FilterOptions;
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  onReset: () => void;
}

// components/features/filters/ModelFilter.tsx
interface ModelFilterProps {
  models: ModelOption[];
  selected: string[];
  onChange: (models: string[]) => void;
}

// components/features/filters/PriceRangeFilter.tsx
interface PriceRangeFilterProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (range: [number, number]) => void;
}

// components/features/accounts/AccountDetail.tsx
interface AccountDetailProps {
  account: AccountDetail;
  onContactClick: () => void;
}

// components/features/accounts/QuotaTable.tsx
interface QuotaTableProps {
  quotas: ModelQuotaDisplay[];
  highlightModels?: string[];
}
```

### Admin Components

```typescript
// components/features/admin/AccountForm.tsx
interface AccountFormProps {
  account?: AccountAdmin;
  onSubmit: (data: CreateAccountRequest | UpdateAccountRequest) => Promise<void>;
  onCancel: () => void;
  mode: 'create' | 'edit';
}

// components/features/admin/AccountsTable.tsx
interface AccountsTableProps {
  accounts: AccountAdmin[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRefreshQuota: (id: string) => void;
  onStatusChange: (id: string, status: AccountStatus) => void;
}

// components/features/admin/AuditLogTable.tsx
interface AuditLogTableProps {
  logs: AuditLog[];
  loading?: boolean;
}

// components/features/auth/LoginForm.tsx
interface LoginFormProps {
  onSubmit: (credentials: LoginCredentials) => Promise<void>;
  error?: string;
}
```

### Shared Components

```typescript
// components/shared/LoadingSpinner.tsx
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// components/shared/EmptyState.tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
}

// components/shared/ErrorBoundary.tsx
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error }>;
}

// components/shared/Pagination.tsx
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// components/shared/ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'default' | 'destructive';
}
```

### Layout Components

```typescript
// components/layouts/PublicHeader.tsx
interface PublicHeaderProps {
  className?: string;
}

// components/layouts/PublicFooter.tsx
interface PublicFooterProps {
  className?: string;
}

// components/layouts/AdminSidebar.tsx
interface AdminSidebarProps {
  currentPath: string;
}

// components/layouts/AdminHeader.tsx
interface AdminHeaderProps {
  username: string;
  onLogout: () => void;
}
```

## State Management

### Zustand Stores

```typescript
// stores/filterStore.ts
interface FilterStore {
  filters: ActiveFilters;
  setFilters: (filters: Partial<ActiveFilters>) => void;
  resetFilters: () => void;
  
  // Derived state
  hasActiveFilters: boolean;
  filterCount: number;
}

// stores/authStore.ts
interface AuthStore {
  token: string | null;
  admin: AdminInfo | null;
  isAuthenticated: boolean;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

// stores/cartStore.ts (for future expansion)
interface CartStore {
  selectedAccount: AccountListing | null;
  setSelectedAccount: (account: AccountListing | null) => void;
  clearSelection: () => void;
}
```

## Custom Hooks

```typescript
// hooks/useAccounts.ts
export function useAccounts(filters?: ActiveFilters) {
  // SWR or React Query for data fetching
  return {
    accounts: AccountListing[],
    loading: boolean,
    error: Error | null,
    mutate: () => void
  };
}

// hooks/useAccountDetail.ts
export function useAccountDetail(id: string) {
  return {
    account: AccountDetail | null,
    loading: boolean,
    error: Error | null
  };
}

// hooks/useFilters.ts
export function useFilters() {
  // Access filter store and provide convenience methods
  return {
    filters: ActiveFilters,
    options: FilterOptions,
    setFilter: (key: string, value: any) => void,
    resetFilters: () => void,
    applyFilters: () => void
  };
}

// hooks/useAuth.ts
export function useAuth() {
  // Authentication utilities
  return {
    isAuthenticated: boolean,
    admin: AdminInfo | null,
    login: (credentials: LoginCredentials) => Promise<void>,
    logout: () => void,
    requireAuth: () => void // Redirect if not authenticated
  };
}

// hooks/useToast.ts
export function useToast() {
  // Toast notifications
  return {
    toast: (options: ToastOptions) => void,
    success: (message: string) => void,
    error: (message: string) => void,
    loading: (message: string) => () => void // Returns dismiss function
  };
}
```

## Service Layer

```typescript
// services/api/accounts.ts
export class AccountsAPI {
  static async list(params?: ListAccountsParams): Promise<PaginatedResponse<AccountListing>>;
  static async get(id: string): Promise<AccountDetail>;
  static async create(data: CreateAccountRequest): Promise<AccountAdmin>;
  static async update(id: string, data: UpdateAccountRequest): Promise<AccountAdmin>;
  static async delete(id: string): Promise<void>;
  static async refreshQuota(id: string): Promise<ModelQuota[]>;
}

// services/api/auth.ts
export class AuthAPI {
  static async login(credentials: LoginCredentials): Promise<LoginResponse>;
  static async logout(): Promise<void>;
  static async validateSession(): Promise<boolean>;
}

// services/api/filters.ts
export class FiltersAPI {
  static async getOptions(): Promise<FilterOptions>;
}

// services/telegram.ts
export class TelegramService {
  static generateContactLink(accountName: string): string;
  static openChat(accountName: string): void;
}

// services/quota.ts
export class QuotaService {
  static categorizeQuotaLevel(quotas: ModelQuota[]): QuotaLevel;
  static getPrimaryModels(quotas: ModelQuota[]): string[];
  static formatQuotaDisplay(quota: ModelQuota): ModelQuotaDisplay;
}
```

## UI Component Library (shadcn/ui)

### Core Components Used
- **Button**: Primary actions, form submissions
- **Card**: Account cards, detail sections
- **Dialog**: Confirmation dialogs, modals
- **Form**: Account creation/editing forms
- **Input**: Text inputs, search fields
- **Select**: Dropdown selections
- **Slider**: Price range filter
- **Table**: Admin tables, quota display
- **Toast**: Notifications
- **Skeleton**: Loading states
- **Alert**: Error messages, warnings
- **Badge**: Status indicators, tags
- **Tabs**: Admin navigation
- **Sheet**: Mobile navigation drawer

### Custom Theme Configuration

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        success: {
          500: '#22c55e',
        },
        warning: {
          500: '#f59e0b',
        },
        danger: {
          500: '#ef4444',
        }
      }
    }
  }
}
```

## Responsive Design Strategy

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px  
- **Desktop**: > 1024px

### Layout Patterns
- **Mobile First**: Start with mobile layout, enhance for larger screens
- **Grid System**: 1 column (mobile) → 2 columns (tablet) → 3-4 columns (desktop)
- **Navigation**: Bottom nav (mobile) → Top nav (desktop)
- **Filters**: Sheet/drawer (mobile) → Sidebar (desktop)

## Performance Optimizations

### Code Splitting
- Route-based splitting with Next.js App Router
- Lazy load admin components
- Dynamic imports for heavy components

### Data Fetching
- Server Components for initial data
- Client-side SWR/React Query for mutations
- Optimistic updates for better UX
- Pagination and infinite scroll

### Image Optimization
- Next.js Image component for account images
- Lazy loading with blur placeholders
- WebP format with fallbacks

### Bundle Optimization
- Tree shaking unused shadcn/ui components
- Minimize client components
- Use Server Components where possible