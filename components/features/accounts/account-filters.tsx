'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FilterOptions {
  quotaLevels: Array<{ level: string; count: number }>
  modelTypes: Array<{ modelType: string; count: number }>
  priceRange: { min: number; max: number; average: number }
  sortOptions: Array<{ value: string; label: string }>
}

interface AccountFiltersProps {
  filters: FilterOptions
  activeFilters: {
    quotaLevel?: string
    models?: string[]
    minPrice?: number
    maxPrice?: number
    sortBy?: string
  }
  onFilterChange: (filters: any) => void
}

export function AccountFilters({ filters, activeFilters, onFilterChange }: AccountFiltersProps) {
  const handleQuotaLevelChange = (level: string) => {
    onFilterChange({
      ...activeFilters,
      quotaLevel: activeFilters.quotaLevel === level ? undefined : level
    })
  }

  const handleModelToggle = (model: string) => {
    const currentModels = activeFilters.models || []
    const newModels = currentModels.includes(model)
      ? currentModels.filter(m => m !== model)
      : [...currentModels, model]
    
    onFilterChange({
      ...activeFilters,
      models: newModels.length > 0 ? newModels : undefined
    })
  }

  const handleSortChange = (sortBy: string) => {
    onFilterChange({
      ...activeFilters,
      sortBy: sortBy === activeFilters.sortBy ? undefined : sortBy
    })
  }

  const clearFilters = () => {
    onFilterChange({})
  }

  const hasActiveFilters = Object.keys(activeFilters).length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="text-sm"
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Quota Level Filter */}
        <div>
          <h3 className="font-medium mb-3">Quota Level</h3>
          <div className="space-y-2">
            {filters.quotaLevels.map((level) => (
              <div key={level.level} className="flex items-center justify-between">
                <Button
                  variant={activeFilters.quotaLevel === level.level ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleQuotaLevelChange(level.level)}
                  className="justify-start flex-1 h-auto p-2"
                >
                  <span className="capitalize">{level.level}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {level.count}
                  </Badge>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Model Types Filter */}
        <div>
          <h3 className="font-medium mb-3">Model Types</h3>
          <div className="space-y-2">
            {filters.modelTypes.map((model) => (
              <div key={model.modelType} className="flex items-center justify-between">
                <Button
                  variant={
                    activeFilters.models?.includes(model.modelType) ? "default" : "ghost"
                  }
                  size="sm"
                  onClick={() => handleModelToggle(model.modelType)}
                  className="justify-start flex-1 h-auto p-2 text-xs"
                >
                  <span className="truncate">
                    {model.modelType.replace('claude-', '').replace('-20240229', '').replace('-20240307', '')}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {model.count}
                  </Badge>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Price Range Info */}
        <div>
          <h3 className="font-medium mb-3">Price Range</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Min:</span>
              <span>${filters.priceRange.min}</span>
            </div>
            <div className="flex justify-between">
              <span>Max:</span>
              <span>${filters.priceRange.max}</span>
            </div>
            <div className="flex justify-between">
              <span>Average:</span>
              <span>${filters.priceRange.average}</span>
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div>
          <h3 className="font-medium mb-3">Sort By</h3>
          <div className="space-y-2">
            {filters.sortOptions.map((option) => (
              <Button
                key={option.value}
                variant={activeFilters.sortBy === option.value ? "default" : "ghost"}
                size="sm"
                onClick={() => handleSortChange(option.value)}
                className="justify-start w-full"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}