'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { MainLayout } from '@/components/layouts/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import Link from 'next/link'

interface AccountQuota {
  id: string
  modelType: string
  totalQuota: number
  usedQuota: number
  availableQuota: number
  isAvailable: boolean
}

interface Account {
  id: string
  displayName: string
  description: string | null
  price: {
    amount: number
    currency: string
  }
  quotaLevel: string
  quotas: AccountQuota[]
  status: string
  primaryModels: string[]
  stockAvailable: boolean
  createdAt: string
}

export default function AccountDetailsPage() {
  const params = useParams()
  const [account, setAccount] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccount = async () => {
      if (!params.id) return
      
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/v1/accounts/${params.id}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Account not found')
          } else {
            setError('Failed to load account details')
          }
          return
        }

        const data = await response.json()
        if (data.success) {
          setAccount(data.data)
        } else {
          setError(data.message || 'Failed to load account details')
        }
      } catch (err) {
        setError('Failed to load account details')
      } finally {
        setLoading(false)
      }
    }

    fetchAccount()
  }, [params.id])

  const getQuotaLevelColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'LOW': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'SOLD': return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'MAINTENANCE': return <Clock className="h-4 w-4 text-yellow-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatModelName = (modelType: string) => {
    return modelType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-red-600">Error Loading Account</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {error}
              </p>
            </div>
            <Button asChild>
              <Link href="/accounts">Back to Accounts</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!account) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-gray-500 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Account Not Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                The account you're looking for doesn't exist or has been removed.
              </p>
            </div>
            <Button asChild>
              <Link href="/accounts">Back to Accounts</Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Back Button */}
          <Button variant="outline" asChild>
            <Link href="/accounts" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Accounts
            </Link>
          </Button>

          {/* Account Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{account.displayName}</CardTitle>
                  {account.description && (
                    <CardDescription className="text-base">
                      {account.description}
                    </CardDescription>
                  )}
                </div>
                <div className="text-right space-y-2">
                  <div className="text-3xl font-bold">
                    ${account.price.amount} {account.price.currency}
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(account.status)}
                    <span className="text-sm font-medium">
                      {account.status === 'AVAILABLE' ? 'Available' : 
                       account.status === 'SOLD' ? 'Sold Out' : 'Maintenance'}
                    </span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge className={getQuotaLevelColor(account.quotaLevel)}>
                  {account.quotaLevel} Quota Level
                </Badge>
                {account.primaryModels.map((model) => (
                  <Badge key={model} variant="outline">
                    {formatModelName(model)}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quota Details */}
          <Card>
            <CardHeader>
              <CardTitle>Model Quotas</CardTitle>
              <CardDescription>
                Available quotas for different Claude models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {account.quotas.map((quota) => (
                <div key={quota.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{formatModelName(quota.modelType)}</h4>
                    <Badge variant={quota.isAvailable ? "default" : "secondary"}>
                      {quota.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Quota:</span>
                      <div className="font-medium">{quota.totalQuota.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Used:</span>
                      <div className="font-medium">{quota.usedQuota.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Available:</span>
                      <div className="font-medium text-green-600">
                        {quota.availableQuota.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min((quota.usedQuota / quota.totalQuota) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Purchase Section */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Information</CardTitle>
              <CardDescription>
                Contact us to purchase this account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="flex-1"
                  disabled={!account.stockAvailable}
                >
                  {account.stockAvailable ? 'Contact to Purchase' : 'Sold Out'}
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/accounts">Browse More Accounts</Link>
                </Button>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Instant account access after payment verification</p>
                <p>• Full AWS credentials and documentation provided</p>
                <p>• 24/7 customer support via Telegram</p>
                <p>• Account created: {new Date(account.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}