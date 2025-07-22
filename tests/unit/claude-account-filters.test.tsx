import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClaudeAccountFilters } from '@/components/admin/claude-accounts/claude-account-filters'
import { ClaudeAccountQuery } from '@/lib/validation/claude-account'

describe('ClaudeAccountFilters', () => {
  const defaultQuery: ClaudeAccountQuery = {
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  }

  const mockOnFiltersChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnFiltersChange.mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders all filter components', () => {
    render(
      <ClaudeAccountFilters
        query={defaultQuery}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByLabelText(/search/i)).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Tier')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument()
  })

  it('calls onFiltersChange when search input changes (debounced)', async () => {
    const user = userEvent.setup({ delay: null })
    
    render(
      <ClaudeAccountFilters
        query={defaultQuery}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const searchInput = screen.getByLabelText(/search/i)
    await user.type(searchInput, 'test search')

    // Should not call immediately
    expect(mockOnFiltersChange).not.toHaveBeenCalled()

    // Fast-forward time to trigger debounce
    jest.advanceTimersByTime(300)

    await waitFor(() => {
      expect(mockOnFiltersChange).toHaveBeenCalledWith({ search: 'test search' })
    })
  })

  it('calls onFiltersChange when status filter changes', async () => {
    const user = userEvent.setup()
    
    render(
      <ClaudeAccountFilters
        query={defaultQuery}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    // Find the status select combobox button
    const statusSelect = screen.getByRole('combobox', { name: /status/i })
    await user.click(statusSelect)

    // Select "Active" option
    const activeOption = screen.getByText('Active')
    await user.click(activeOption)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ status: 'ACTIVE' })
  })

  it('calls onFiltersChange when tier filter changes', async () => {
    const user = userEvent.setup()
    
    render(
      <ClaudeAccountFilters
        query={defaultQuery}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    // Find and click the tier select trigger
    const tierSelect = screen.getByLabelText(/tier/i)
    await user.click(tierSelect)

    // Select "Pro" option
    const proOption = screen.getByText('Pro')
    await user.click(proOption)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({ tier: 'PRO' })
  })

  it('clears all filters when clear button is clicked', async () => {
    const user = userEvent.setup()
    
    const queryWithFilters: ClaudeAccountQuery = {
      ...defaultQuery,
      search: 'test',
      status: 'ACTIVE',
      tier: 'PRO',
    }

    render(
      <ClaudeAccountFilters
        query={queryWithFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    await user.click(clearButton)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({
      search: undefined,
      status: undefined,
      tier: undefined,
    })
  })

  it('disables clear button when no filters are active', () => {
    render(
      <ClaudeAccountFilters
        query={defaultQuery}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    expect(clearButton).toBeDisabled()
  })

  it('enables clear button when filters are active', () => {
    const queryWithFilters: ClaudeAccountQuery = {
      ...defaultQuery,
      search: 'test',
    }

    render(
      <ClaudeAccountFilters
        query={queryWithFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const clearButton = screen.getByRole('button', { name: /clear filters/i })
    expect(clearButton).not.toBeDisabled()
  })

  it('shows active filters summary when filters are applied', () => {
    const queryWithFilters: ClaudeAccountQuery = {
      ...defaultQuery,
      search: 'test search',
      status: 'ACTIVE',
      tier: 'PRO',
    }

    render(
      <ClaudeAccountFilters
        query={queryWithFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText('Active filters:')).toBeInTheDocument()
    expect(screen.getByText('Search: "test search"')).toBeInTheDocument()
    expect(screen.getByText('Status: ACTIVE')).toBeInTheDocument()
    expect(screen.getByText('Tier: PRO')).toBeInTheDocument()
  })

  it('does not show active filters summary when no filters are applied', () => {
    render(
      <ClaudeAccountFilters
        query={defaultQuery}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.queryByText('Active filters:')).not.toBeInTheDocument()
  })

  it('initializes search input with query value', () => {
    const queryWithSearch: ClaudeAccountQuery = {
      ...defaultQuery,
      search: 'existing search',
    }

    render(
      <ClaudeAccountFilters
        query={queryWithSearch}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const searchInput = screen.getByDisplayValue('existing search')
    expect(searchInput).toBeInTheDocument()
  })
})