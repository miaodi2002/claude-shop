import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPrice, getQuotaLevelColor, truncateText } from '@/lib/utils'

interface AccountCardProps {
  account: {
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
}

export function AccountCard({ account }: AccountCardProps) {
  const quotaLevelColorClass = getQuotaLevelColor(account.quotaLevel)
  
  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-6">
            {account.displayName}
          </CardTitle>
          <Badge 
            variant={account.stockAvailable ? "success" : "destructive"}
            className="ml-2"
          >
            {account.stockAvailable ? "Available" : "Sold Out"}
          </Badge>
        </div>
        {account.instructions && (
          <p className="text-sm text-muted-foreground mt-2">
            {truncateText(account.instructions, 100)}
          </p>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-4">
          {/* Price */}
          <div className="text-2xl font-bold text-primary">
            {formatPrice(account.priceAmount, account.priceCurrency)}
          </div>

          {/* Quota Level */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Quota Level:</span>
            <Badge className={quotaLevelColorClass}>
              {account.quotaLevel}
            </Badge>
          </div>

          {/* Model Types */}
          {account.primaryModels && account.primaryModels.length > 0 && (
            <div>
              <span className="text-sm font-medium mb-2 block">Available Models:</span>
              <div className="flex flex-wrap gap-1">
                {account.primaryModels.slice(0, 2).map((model) => (
                  <Badge key={model} variant="outline" className="text-xs">
                    {model.replace('claude-', '').replace('-20240229', '').replace('-20240307', '')}
                  </Badge>
                ))}
                {account.primaryModels.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{account.primaryModels.length - 2} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Features */}
          {account.features && account.features.length > 0 && (
            <div>
              <span className="text-sm font-medium mb-2 block">Features:</span>
              <div className="flex flex-wrap gap-1">
                {account.features.slice(0, 3).map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {account.features.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{account.features.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <div className="flex w-full gap-2">
          <Button asChild className="flex-1" disabled={!account.stockAvailable}>
            <Link href={`/accounts/${account.id}`}>
              View Details
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            disabled={!account.stockAvailable}
            asChild
          >
            <Link href="/search">
              Search
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}