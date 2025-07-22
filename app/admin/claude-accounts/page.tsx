'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { ClaudeAccountsTable } from '@/components/admin/claude-accounts/claude-accounts-table'
import { ClaudeAccountFilters } from '@/components/admin/claude-accounts/claude-account-filters'
import { useClaudeAccounts } from '@/hooks/use-claude-accounts'
import { ClaudeAccountQuery } from '@/lib/validation/claude-account'

export default function ClaudeAccountsPage() {
  const [query, setQuery] = useState<ClaudeAccountQuery>({
    page: 1,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })

  const { 
    accounts, 
    pagination, 
    isLoading, 
    isError, 
    mutate 
  } = useClaudeAccounts(query)

  const handleFiltersChange = useCallback((newFilters: Partial<ClaudeAccountQuery>) => {
    setQuery(prev => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page when filters change
    }))
  }, [])

  const handleSort = useCallback((sortBy: string) => {
    const newSortOrder = query.sortBy === sortBy && query.sortOrder === 'asc' ? 'desc' : 'asc'
    setQuery(prev => ({
      ...prev,
      sortBy: sortBy as ClaudeAccountQuery['sortBy'],
      sortOrder: newSortOrder,
    }))
  }, [query.sortBy, query.sortOrder])

  const handlePageChange = useCallback((page: number) => {
    setQuery(prev => ({ ...prev, page }))
  }, [])

  const handleAccountDelete = useCallback(async (accountId: string) => {
    try {
      const response = await fetch(`/api/v1/admin/claude-accounts/${accountId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        mutate() // Refresh the data
      } else {
        console.error('Failed to delete account')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }, [mutate])

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-600">Error Loading Accounts</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Failed to load Claude accounts. Please try again.
              </p>
              <Button 
                onClick={() => mutate()} 
                variant="outline" 
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Claude Accounts</h1>
            <p className="text-muted-foreground">
              Manage Claude API accounts and their configurations
            </p>
          </div>
          <Link href="/admin/claude-accounts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add New Account
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <ClaudeAccountFilters
              query={query}
              onFiltersChange={handleFiltersChange}
            />
          </CardContent>
        </Card>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              Accounts {pagination && `(${pagination.total} total)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ClaudeAccountsTable
              accounts={accounts || []}
              isLoading={isLoading}
              sortBy={query.sortBy}
              sortOrder={query.sortOrder}
              onSort={handleSort}
              onDelete={handleAccountDelete}
              pagination={pagination}
              currentPage={query.page}
              onPageChange={handlePageChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}