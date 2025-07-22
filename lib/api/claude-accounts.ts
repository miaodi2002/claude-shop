import { 
  ClaudeAccountQuery,
  CreateClaudeAccountData,
  UpdateClaudeAccountData,
  ClaudeAccount
} from '@/lib/validation/claude-account'

const API_BASE = '/api/v1/admin/claude-accounts'

// Helper function to build query strings
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  
  return searchParams.toString()
}

// Generic fetcher function with error handling
async function fetcher(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      message: `HTTP ${response.status}: ${response.statusText}`,
    }))
    throw new Error(error.message || 'Request failed')
  }

  return response.json()
}

export const claudeAccountsApi = {
  // List accounts with filtering and pagination
  list: async (params: ClaudeAccountQuery) => {
    const queryString = buildQueryString(params)
    const url = queryString ? `${API_BASE}?${queryString}` : API_BASE
    return fetcher(url)
  },

  // Get single account by ID
  get: async (id: string) => {
    return fetcher(`${API_BASE}/${id}`)
  },

  // Create new account
  create: async (data: CreateClaudeAccountData) => {
    return fetcher(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Update existing account
  update: async (id: string, data: UpdateClaudeAccountData) => {
    return fetcher(`${API_BASE}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete account
  delete: async (id: string) => {
    return fetcher(`${API_BASE}/${id}`, {
      method: 'DELETE',
    })
  },

  // Bulk operations
  bulkDelete: async (ids: string[]) => {
    return fetcher(`${API_BASE}/bulk-delete`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },

  // Update account status (quick action)
  updateStatus: async (id: string, status: string) => {
    return fetcher(`${API_BASE}/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  // Get account usage statistics
  getUsageStats: async (id: string) => {
    return fetcher(`${API_BASE}/${id}/usage-stats`)
  },
}