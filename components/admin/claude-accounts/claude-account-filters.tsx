'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, X } from 'lucide-react'
import { ClaudeAccountQuery, claudeAccountStatusSchema, claudeAccountTierSchema } from '@/lib/validation/claude-account'

interface ClaudeAccountFiltersProps {
  query: ClaudeAccountQuery
  onFiltersChange: (filters: Partial<ClaudeAccountQuery>) => void
}

export function ClaudeAccountFilters({ query, onFiltersChange }: ClaudeAccountFiltersProps) {
  const [searchInput, setSearchInput] = useState(query.search || '')

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== query.search) {
        onFiltersChange({ search: searchInput || undefined })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, query.search, onFiltersChange])

  const handleStatusChange = (value: string) => {
    const status = value === 'all' ? undefined : value as any
    onFiltersChange({ status })
  }

  const handleTierChange = (value: string) => {
    const tier = value === 'all' ? undefined : value as any
    onFiltersChange({ tier })
  }

  const handleClearFilters = () => {
    setSearchInput('')
    onFiltersChange({
      search: undefined,
      status: undefined,
      tier: undefined,
    })
  }

  const hasActiveFilters = query.search || query.status || query.tier

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search accounts..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={query.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tier Filter */}
        <div className="space-y-2">
          <Label>Tier</Label>
          <Select
            value={query.tier || 'all'}
            onValueChange={handleTierChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="FREE">Free</SelectItem>
              <SelectItem value="PRO">Pro</SelectItem>
              <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        <div className="space-y-2">
          <Label>&nbsp;</Label>
          <Button
            variant="outline"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Active filters:</span>
          {query.search && (
            <span className="px-2 py-1 bg-muted rounded text-xs">
              Search: "{query.search}"
            </span>
          )}
          {query.status && (
            <span className="px-2 py-1 bg-muted rounded text-xs">
              Status: {query.status}
            </span>
          )}
          {query.tier && (
            <span className="px-2 py-1 bg-muted rounded text-xs">
              Tier: {query.tier}
            </span>
          )}
        </div>
      )}
    </div>
  )
}