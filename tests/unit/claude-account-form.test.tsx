import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClaudeAccountForm } from '@/components/admin/claude-accounts/claude-account-form'
import { ClaudeAccount } from '@/lib/validation/claude-account'

const mockAccount: ClaudeAccount = {
  id: '123',
  apiKey: 'sk-test-key',
  accountName: 'Test Account',
  email: 'test@example.com',
  organization: 'Test Org',
  status: 'ACTIVE',
  tier: 'PRO',
  usageLimit: 1000,
  currentUsage: 500,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('ClaudeAccountForm', () => {
  const mockOnSubmit = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Create Mode', () => {
    it('renders create form with all required fields', () => {
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      expect(screen.getByLabelText(/account name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/organization/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/tier/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/usage limit/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
    })

    it('shows API key field in create mode', () => {
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      expect(screen.getByLabelText(/api key/i)).toBeInTheDocument()
    })

    it('does not show status field in create mode', () => {
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument()
    })

    it('toggles API key visibility when eye icon is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      const apiKeyInput = screen.getByLabelText(/api key/i)
      const toggleButton = screen.getByRole('button', { name: '' })

      expect(apiKeyInput).toHaveAttribute('type', 'password')

      await user.click(toggleButton)
      expect(apiKeyInput).toHaveAttribute('type', 'text')

      await user.click(toggleButton)
      expect(apiKeyInput).toHaveAttribute('type', 'password')
    })

    it('submits form with correct data', async () => {
      const user = userEvent.setup()
      
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      await user.type(screen.getByLabelText(/account name/i), 'New Account')
      await user.type(screen.getByLabelText(/api key/i), 'sk-new-key')
      await user.type(screen.getByLabelText(/email/i), 'new@example.com')

      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            accountName: 'New Account',
            apiKey: 'sk-new-key',
            email: 'new@example.com',
            tier: 'FREE', // default value
          })
        )
      })
    })

    it('shows validation errors for required fields', async () => {
      const user = userEvent.setup()
      
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText(/account name is required/i)).toBeInTheDocument()
        expect(screen.getByText(/api key is required/i)).toBeInTheDocument()
      })

      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Edit Mode', () => {
    it('renders edit form with existing data', () => {
      render(
        <ClaudeAccountForm
          account={mockAccount}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
          isEditMode={true}
        />
      )

      expect(screen.getByDisplayValue('Test Account')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Org')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /update account/i })).toBeInTheDocument()
    })

    it('does not show API key field in edit mode', () => {
      render(
        <ClaudeAccountForm
          account={mockAccount}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
          isEditMode={true}
        />
      )

      expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument()
    })

    it('shows status field in edit mode', () => {
      render(
        <ClaudeAccountForm
          account={mockAccount}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
          isEditMode={true}
        />
      )

      expect(screen.getByLabelText(/status/i)).toBeInTheDocument()
    })

    it('submits form with updated data', async () => {
      const user = userEvent.setup()
      
      render(
        <ClaudeAccountForm
          account={mockAccount}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
          isEditMode={true}
        />
      )

      const accountNameInput = screen.getByDisplayValue('Test Account')
      await user.clear(accountNameInput)
      await user.type(accountNameInput, 'Updated Account')

      await user.click(screen.getByRole('button', { name: /update account/i }))

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            accountName: 'Updated Account',
            email: 'test@example.com',
            organization: 'Test Org',
            status: 'ACTIVE',
            tier: 'PRO',
            usageLimit: 1000,
          })
        )
      })
    })
  })

  describe('Advanced Settings', () => {
    it('toggles advanced settings section', async () => {
      const user = userEvent.setup()
      
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      const advancedToggle = screen.getByText(/advanced settings/i)
      
      // Initially collapsed
      expect(screen.queryByLabelText(/features/i)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/metadata/i)).not.toBeInTheDocument()

      // Click to expand
      await user.click(advancedToggle)
      
      expect(screen.getByLabelText(/features/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/metadata/i)).toBeInTheDocument()
    })

    it('validates JSON format in features field', async () => {
      const user = userEvent.setup()
      
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      // Expand advanced settings
      await user.click(screen.getByText(/advanced settings/i))
      
      // Enter invalid JSON
      const featuresTextarea = screen.getByLabelText(/features/i)
      await user.type(featuresTextarea, 'invalid json')

      // Fill required fields
      await user.type(screen.getByLabelText(/account name/i), 'Test')
      await user.type(screen.getByLabelText(/api key/i), 'sk-test')

      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        expect(screen.getByText(/features must be valid json/i)).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('disables form elements when submitting', () => {
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={true}
        />
      )

      expect(screen.getByLabelText(/account name/i)).toBeDisabled()
      expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
    })

    it('shows loading state on submit button', () => {
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={true}
        />
      )

      const submitButton = screen.getByRole('button', { name: /create account/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper labels and associations', () => {
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      const accountNameInput = screen.getByLabelText(/account name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const apiKeyInput = screen.getByLabelText(/api key/i)

      expect(accountNameInput).toHaveAttribute('id')
      expect(emailInput).toHaveAttribute('id')
      expect(apiKeyInput).toHaveAttribute('id')
    })

    it('shows proper error messages with accessibility attributes', async () => {
      const user = userEvent.setup()
      
      render(
        <ClaudeAccountForm
          onSubmit={mockOnSubmit}
          isSubmitting={false}
        />
      )

      await user.click(screen.getByRole('button', { name: /create account/i }))

      await waitFor(() => {
        const errorMessage = screen.getByText(/account name is required/i)
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveClass('text-red-500')
      })
    })
  })
})