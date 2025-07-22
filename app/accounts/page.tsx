'use client'

import React, { useState, useEffect } from 'react'
import { MainLayout } from '@/components/layouts/main-layout'
import { AccountCard } from '@/components/features/accounts/account-card'
import { AccountFilters } from '@/components/features/accounts/account-filters'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Account {
  id: string
  displayName: string
  instructions?: string
  priceAmount: number
  priceCurrency: string
  quotaLevel: string
  features: string[]
  primaryModels: string[]
  stockAvailable: boolean
}

interface FilterOptions {
  quotaLevels: Array<{ level: string; count: number }>
  modelTypes: Array<{ modelType: string; count: number }>
  priceRange: { min: number; max: number; average: number }
  sortOptions: Array<{ value: string; label: string }>
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState<any>({})
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch filter options
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await fetch('/api/v1/filters/options')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setFilterOptions(data.data)
          }
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error)
      }
    }

    fetchFilterOptions()
  }, [])

  // Fetch accounts
  useEffect(() => {
    const fetchAccounts = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: '12',
          ...activeFilters
        })

        // Handle array parameters
        if (activeFilters.models && activeFilters.models.length > 0) {
          params.set('models', activeFilters.models.join(','))
        }

        const response = await fetch(`/api/v1/accounts?${params}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setAccounts(data.data)
            setPagination(data.pagination)
          }
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAccounts()
  }, [activeFilters, currentPage])

  const handleFilterChange = (newFilters: any) => {
    setActiveFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const renderPagination = () => {
    if (!pagination || pagination.totalPages <= 1) return null

    return (
      <div className="flex items-center justify-center gap-2 mt-8">
        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={!pagination.hasPrev}
        >
          Previous
        </Button>
        
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            const page = i + 1
            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={!pagination.hasNext}
        >
          Next
        </Button>
      </div>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Browse AWS Accounts</h1>
          <p className="text-muted-foreground">
            Discover premium AWS accounts with pre-configured Claude AI model quotas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            {filterOptions ? (
              <AccountFilters
                filters={filterOptions}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
              />
            ) : (
              <div className="h-96 bg-muted/50 rounded-lg animate-pulse" />
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Active Filters Display */}
            {Object.keys(activeFilters).length > 0 && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium">Active Filters:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFilterChange({})}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.quotaLevel && (
                    <Badge variant="secondary">
                      Quota: {activeFilters.quotaLevel}
                    </Badge>
                  )}
                  {activeFilters.models?.map((model: string) => (
                    <Badge key={model} variant="secondary">
                      {model.replace('claude-', '').replace('-20240229', '').replace('-20240307', '')}
                    </Badge>
                  ))}
                  {activeFilters.sortBy && (
                    <Badge variant="secondary">
                      Sort: {activeFilters.sortBy.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Results Count */}
            {pagination && (
              <div className="mb-6 text-sm text-muted-foreground">
                Showing {((currentPage - 1) * 12) + 1}-{Math.min(currentPage * 12, pagination.total)} of {pagination.total} accounts
              </div>
            )}

            {/* Accounts Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-96 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : accounts.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {accounts.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
                {renderPagination()}
              </>
            ) : (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No accounts found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters to see more results
                </p>
                <Button onClick={() => handleFilterChange({})}>
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}