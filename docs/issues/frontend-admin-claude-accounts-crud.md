# Issue: Frontend Admin Pages for Claude Accounts CRUD

## Overview
Implement comprehensive admin interface for managing Claude accounts, including list view with filtering/sorting, create/edit forms, and delete functionality. The implementation should follow existing UI patterns and component architecture.

## Objectives
- Create admin pages for Claude accounts management
- Implement data table with sorting, filtering, and pagination
- Build forms for creating and editing accounts
- Add proper loading states and error handling
- Integrate with backend API endpoints
- Ensure responsive design and accessibility

## Page Structure

### 1. List Page: `/admin/claude-accounts`
Main page displaying all Claude accounts in a data table format.

**Features**:
- Data table with sortable columns
- Search functionality
- Status and tier filters
- Pagination controls
- Bulk actions support
- Quick actions (view, edit, delete)

### 2. Create Page: `/admin/claude-accounts/new`
Form page for creating new Claude accounts.

### 3. Edit Page: `/admin/claude-accounts/[id]/edit`
Form page for editing existing Claude accounts.

## Component Architecture

### Page Components

#### 1. Claude Accounts List Page
**File**: `/app/admin/claude-accounts/page.tsx`

**Features**:
- Server-side data fetching
- URL-based filtering and pagination
- Loading and error states
- Empty state handling

**Key Elements**:
```typescript
- PageHeader with title and "Add New" button
- ClaudeAccountFilters component
- ClaudeAccountsTable component
- Pagination component
```

#### 2. Create/Edit Form Pages
**Files**: 
- `/app/admin/claude-accounts/new/page.tsx`
- `/app/admin/claude-accounts/[id]/edit/page.tsx`

**Features**:
- Form validation with react-hook-form and Zod
- Loading states during submission
- Error handling and display
- Success redirect to list page

### Reusable Components

#### 1. ClaudeAccountsTable
**File**: `/components/admin/claude-accounts/claude-accounts-table.tsx`

**Props**:
```typescript
interface ClaudeAccountsTableProps {
  accounts: ClaudeAccount[];
  onSort: (field: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
```

**Columns**:
- Account Name (sortable)
- Email
- Organization
- Tier (badge)
- Status (badge with color)
- Usage (progress bar)
- Created Date (sortable)
- Actions (dropdown menu)

#### 2. ClaudeAccountForm
**File**: `/components/admin/claude-accounts/claude-account-form.tsx`

**Props**:
```typescript
interface ClaudeAccountFormProps {
  account?: ClaudeAccount; // For edit mode
  onSubmit: (data: ClaudeAccountFormData) => Promise<void>;
  isSubmitting: boolean;
}
```

**Form Fields**:
- Account Name (text input, required)
- API Key (password input, required for create, hidden for edit)
- Email (email input, optional)
- Organization (text input, optional)
- Tier (select dropdown)
- Status (select dropdown, edit only)
- Usage Limit (number input, optional)
- Features (collapsible JSON editor, advanced)
- Metadata (collapsible JSON editor, advanced)

#### 3. ClaudeAccountFilters
**File**: `/components/admin/claude-accounts/claude-account-filters.tsx`

**Filters**:
- Search input (debounced)
- Status dropdown (All, Active, Suspended, Expired, Pending)
- Tier dropdown (All, Free, Pro, Enterprise)
- Clear filters button

#### 4. ClaudeAccountActions
**File**: `/components/admin/claude-accounts/claude-account-actions.tsx`

**Actions**:
- View details (modal or redirect)
- Edit (redirect to edit page)
- Delete (confirmation dialog)
- Suspend/Activate (quick status toggle)

## UI Components Usage

### From Existing UI Library
- `Button` - For actions and form submission
- `Input` - For form fields
- `Label` - For form labels
- `Select` - For dropdowns
- `Badge` - For status and tier display
- `Card` - For form containers
- `Table` - For data display
- `Dialog` - For confirmations
- `Alert` - For error messages
- `Skeleton` - For loading states

### Custom Components to Create
- `JsonEditor` - For features/metadata editing
- `PasswordInput` - For API key with show/hide toggle
- `DataTable` - Enhanced table with sorting
- `EmptyState` - For no data scenarios
- `ConfirmDialog` - For delete confirmations

## State Management

### Data Fetching
- Use SWR for client-side data fetching
- Implement proper cache invalidation
- Handle loading and error states

### Form State
- React Hook Form for form management
- Zod schemas for validation
- Optimistic UI updates

### URL State
- Search params for filters and pagination
- Maintain state across navigation

## Implementation Tasks

### 1. Page Setup
- [ ] Create admin route group for Claude accounts
- [ ] Set up page components with layouts
- [ ] Implement authentication guards

### 2. List View
- [ ] Create ClaudeAccountsTable component
- [ ] Implement sorting functionality
- [ ] Add ClaudeAccountFilters component
- [ ] Integrate pagination
- [ ] Add loading and empty states

### 3. Form Implementation
- [ ] Create ClaudeAccountForm component
- [ ] Set up form validation schemas
- [ ] Implement create functionality
- [ ] Implement edit functionality
- [ ] Add error handling

### 4. Actions & Interactions
- [ ] Implement delete with confirmation
- [ ] Add status toggle functionality
- [ ] Create success/error notifications
- [ ] Add keyboard shortcuts

### 5. Data Integration
- [ ] Set up API client functions
- [ ] Implement SWR hooks
- [ ] Add error boundaries
- [ ] Handle API errors gracefully

### 6. UI Polish
- [ ] Ensure responsive design
- [ ] Add loading skeletons
- [ ] Implement smooth transitions
- [ ] Test accessibility

## API Integration

### API Client Functions
```typescript
// /lib/api/claude-accounts.ts
export const claudeAccountsApi = {
  list: (params: ListParams) => 
    fetcher(`/api/v1/admin/claude-accounts?${queryString(params)}`),
  
  get: (id: string) => 
    fetcher(`/api/v1/admin/claude-accounts/${id}`),
  
  create: (data: CreateClaudeAccountData) => 
    fetcher('/api/v1/admin/claude-accounts', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  
  update: (id: string, data: UpdateClaudeAccountData) => 
    fetcher(`/api/v1/admin/claude-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  
  delete: (id: string) => 
    fetcher(`/api/v1/admin/claude-accounts/${id}`, {
      method: 'DELETE'
    })
};
```

### SWR Hooks
```typescript
// /hooks/use-claude-accounts.ts
export function useClaudeAccounts(params: ListParams) {
  const { data, error, mutate } = useSWR(
    ['claude-accounts', params],
    () => claudeAccountsApi.list(params)
  );
  
  return {
    accounts: data?.data,
    pagination: data?.pagination,
    isLoading: !error && !data,
    isError: error,
    mutate
  };
}
```

## Validation Schemas

```typescript
// /schemas/claude-account.ts
export const claudeAccountFormSchema = z.object({
  accountName: z.string().min(1, 'Account name is required'),
  apiKey: z.string().min(1, 'API key is required'),
  email: z.string().email().optional().or(z.literal('')),
  organization: z.string().optional(),
  tier: z.enum(['FREE', 'PRO', 'ENTERPRISE']),
  usageLimit: z.number().positive().optional(),
  features: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});
```

## Design Requirements

### Visual Design
- Follow existing admin panel design patterns
- Use consistent spacing and typography
- Implement proper color coding for statuses
- Ensure clear visual hierarchy

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Screen reader compatibility
- Focus management

### Responsive Design
- Mobile-friendly table (horizontal scroll)
- Stacked form layout on mobile
- Touch-friendly action buttons
- Adaptive pagination

## Error Handling

### API Errors
- Display user-friendly error messages
- Log detailed errors for debugging
- Implement retry mechanisms
- Show inline validation errors

### Network Errors
- Offline state handling
- Request timeout handling
- Retry failed requests
- Cache data for resilience

## Testing Requirements

### Component Tests
- Test form validation
- Test table sorting/filtering
- Test action confirmations
- Test error states

### Integration Tests
- Test API integration
- Test form submission flows
- Test delete operations
- Test pagination

### E2E Tests
- Test complete CRUD workflows
- Test filter combinations
- Test error scenarios
- Test responsive behavior

## Performance Considerations

### Optimizations
- Implement virtual scrolling for large lists
- Debounce search input
- Lazy load form components
- Use React.memo for table rows

### Code Splitting
- Lazy load edit/create pages
- Split JSON editor component
- Defer non-critical features

## Acceptance Criteria
- [ ] List page displays all Claude accounts with sorting
- [ ] Filters work correctly and update URL
- [ ] Pagination works smoothly
- [ ] Create form validates and submits correctly
- [ ] Edit form loads existing data and updates
- [ ] Delete confirmation works properly
- [ ] All error states handled gracefully
- [ ] Responsive design works on mobile
- [ ] Accessibility standards met
- [ ] Loading states provide good UX
- [ ] Integration with backend API complete

## Estimated Effort
- Page setup and routing: 2 hours
- Table and list view: 4 hours
- Form implementation: 4 hours
- API integration: 2 hours
- Testing and polish: 2 hours
- Total: 14 hours