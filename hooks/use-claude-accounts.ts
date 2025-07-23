'use client'

import useSWR from 'swr'
import { claudeAccountsApi } from '@/lib/api/claude-accounts'
import { ClaudeAccountQuery, ClaudeAccount } from '@/lib/validation/claude-account'

interface PaginationInfo {
  total: number
  totalPages: number
  currentPage: number
  hasNext: boolean
  hasPrevious: boolean
}

interface ClaudeAccountsResponse {
  success: boolean
  data: ClaudeAccount[]
  pagination: PaginationInfo
}

interface ClaudeAccountResponse {
  success: boolean
  data: ClaudeAccount
}

// Hook for fetching list of Claude accounts
export function useClaudeAccounts(params: ClaudeAccountQuery) {
  const cacheKey = ['claude-accounts', params]
  
  const { data, error, mutate, isLoading } = useSWR<ClaudeAccountsResponse>(
    cacheKey,
    () => claudeAccountsApi.list(params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // 5 seconds
    }
  )

  return {
    accounts: data?.data,
    pagination: data?.pagination,
    isLoading,
    isError: !!error,
    error,
    mutate,
    // Computed states
    isEmpty: !isLoading && (!data?.data || data.data.length === 0),
    isValidating: !error && !data,
  }
}

// Hook for fetching single Claude account
export function useClaudeAccount(id: string | null) {
  const cacheKey = id ? ['claude-account', id] : null
  
  const { data, error, mutate, isLoading } = useSWR<ClaudeAccountResponse>(
    cacheKey,
    cacheKey ? () => claudeAccountsApi.get(id!) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return {
    account: data?.data,
    isLoading,
    isError: !!error,
    error,
    mutate,
    // Computed states
    notFound: error?.message?.includes('404') || error?.message?.includes('not found'),
  }
}

// Hook for managing Claude account mutations
export function useClaudeAccountMutations() {
  return {
    // Create account
    createAccount: async (data: any) => {
      const response = await claudeAccountsApi.create(data)
      return response
    },

    // Update account
    updateAccount: async (id: string, data: any) => {
      const response = await claudeAccountsApi.update(id, data)
      return response
    },

    // Delete account
    deleteAccount: async (id: string) => {
      const response = await claudeAccountsApi.delete(id)
      return response
    },

    // Update account status
    updateAccountStatus: async (id: string, status: string) => {
      const response = await claudeAccountsApi.updateStatus(id, status)
      return response
    },

    // Bulk delete
    bulkDeleteAccounts: async (ids: string[]) => {
      const response = await claudeAccountsApi.bulkDelete(ids)
      return response
    },
  }
}

// Custom hook for optimistic updates
export function useOptimisticClaudeAccounts(params: ClaudeAccountQuery) {
  const { accounts, pagination, mutate, ...rest } = useClaudeAccounts(params)

  const optimisticUpdate = async (
    updateFn: () => Promise<any>,
    optimisticData?: (current: ClaudeAccount[]) => ClaudeAccount[]
  ) => {
    try {
      if (optimisticData && accounts) {
        // Optimistically update the UI
        mutate(
          (current) => current ? {
            ...current,
            data: optimisticData(current.data)
          } : current,
          false // Don't revalidate immediately
        )
      }

      // Perform the actual update
      await updateFn()

      // Revalidate to get fresh data
      mutate()
    } catch (error) {
      // Revert optimistic update on error
      mutate()
      throw error
    }
  }

  const optimisticDelete = async (accountId: string) => {
    await optimisticUpdate(
      () => claudeAccountsApi.delete(accountId),
      (current) => current.filter(account => account.id !== accountId)
    )
  }

  const optimisticStatusUpdate = async (accountId: string, newStatus: string) => {
    await optimisticUpdate(
      () => claudeAccountsApi.updateStatus(accountId, newStatus),
      (current) => current.map(account => 
        account.id === accountId 
          ? { ...account, status: newStatus as any }
          : account
      )
    )
  }

  return {
    accounts,
    pagination,
    mutate,
    optimisticDelete,
    optimisticStatusUpdate,
    ...rest,
  }
}

// Hook for caching and background sync
export function useClaudeAccountsCache() {
  const { mutate } = useSWR(() => null) // Get global mutate function

  const invalidateAll = () => {
    // Invalidate all Claude accounts related cache
    mutate((key: any) => typeof key === 'object' && key !== null && 
           Array.isArray(key) && key[0] === 'claude-accounts')
  }

  const invalidateAccount = (id: string) => {
    // Invalidate specific account cache
    mutate(['claude-account', id])
  }

  const preloadAccount = (id: string) => {
    // Preload account data
    // mutate(['claude-account', id], claudeAccountsApi.get(id))
  }

  return {
    invalidateAll,
    invalidateAccount,
    preloadAccount,
  }
}