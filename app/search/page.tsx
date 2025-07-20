'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface SearchResult {
  type: string
  id: string
  title: string
  description: string | null
  price: {
    amount: number
    currency: string
  }
  quotaLevel: string
  modelTypes: string[]
  url: string
}

interface SearchResponse {
  query: string
  searchType: string
  results: SearchResult[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  suggestions: string[]
}

function SearchPageContent() {
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const performSearch = async (query: string, page = 1) => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: query,
        type: 'all',
        page: page.toString(),
        limit: '10'
      })

      const response = await fetch(`/api/v1/search?${params}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()
      if (data.success) {
        setSearchResults(data.data)
      } else {
        throw new Error(data.message || 'Search failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const query = searchParams.get('q')
    if (query) {
      setSearchQuery(query)
      performSearch(query)
    }
  }, [searchParams])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim())
      // Update URL without page reload
      window.history.pushState({}, '', `/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    performSearch(suggestion)
    window.history.pushState({}, '', `/search?q=${encodeURIComponent(suggestion)}`)
  }

  const handlePageChange = (newPage: number) => {
    if (searchQuery.trim()) {
      performSearch(searchQuery.trim(), newPage)
    }
  }

  const getQuotaLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'LOW': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Search Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold tracking-tight">Search Accounts</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Find Claude AWS accounts by name, features, model types, or quota levels
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="flex gap-2 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search accounts, features, models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" disabled={loading || !searchQuery.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
        </form>

        {/* Search Results */}
        {searchResults && (
          <div className="space-y-6">
            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {searchResults.pagination.total} results for "{searchResults.query}"
              </p>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>

            {/* Results List */}
            <div className="space-y-4">
              {searchResults.results.map((result) => (
                <Card key={result.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          <Link 
                            href={result.url as any}
                            className="hover:text-primary transition-colors"
                          >
                            {result.title}
                          </Link>
                        </CardTitle>
                        {result.description && (
                          <CardDescription>{result.description}</CardDescription>
                        )}
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-lg font-semibold">
                          ${result.price.amount} {result.price.currency}
                        </p>
                        <Badge className={getQuotaLevelColor(result.quotaLevel)}>
                          {result.quotaLevel} Quota
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {result.modelTypes.slice(0, 3).map((model) => (
                        <Badge key={model} variant="outline" className="text-xs">
                          {model.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                      {result.modelTypes.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{result.modelTypes.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {searchResults.pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!searchResults.pagination.hasPrev}
                  onClick={() => handlePageChange(searchResults.pagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {searchResults.pagination.page} of {searchResults.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!searchResults.pagination.hasNext}
                  onClick={() => handlePageChange(searchResults.pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            )}

            {/* Search Suggestions */}
            {searchResults.suggestions.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Related searches:</h3>
                <div className="flex flex-wrap gap-2">
                  {searchResults.suggestions.map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs"
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {searchResults && searchResults.results.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">No results found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                We couldn't find any accounts matching "{searchResults.query}". 
                Try different keywords or browse all accounts.
              </p>
            </div>
            <Button asChild>
              <Link href="/accounts">Browse All Accounts</Link>
            </Button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-red-600">Search Error</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {error}
              </p>
            </div>
            <Button onClick={() => performSearch(searchQuery)} variant="outline">
              Try Again
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!searchResults && !loading && !error && (
          <div className="text-center py-12 space-y-4">
            <Search className="h-12 w-12 text-muted-foreground mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Start your search</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Enter keywords to search for Claude AWS accounts by name, features, or model types.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">Search Accounts</h1>
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-gray-200 rounded max-w-2xl mx-auto"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}