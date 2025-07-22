'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ClaudeAccountForm } from '@/components/admin/claude-accounts/claude-account-form'
import { UpdateClaudeAccountData, ClaudeAccount } from '@/lib/validation/claude-account'

interface EditClaudeAccountPageProps {
  params: {
    id: string
  }
}

export default function EditClaudeAccountPage({ params }: EditClaudeAccountPageProps) {
  const router = useRouter()
  const [account, setAccount] = useState<ClaudeAccount | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccount = async () => {
      try {
        const response = await fetch(`/api/v1/admin/claude-accounts/${params.id}`)
        
        if (response.status === 404) {
          notFound()
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch account')
        }

        const result = await response.json()
        if (result.success && result.data) {
          setAccount(result.data)
        } else {
          throw new Error('Invalid response format')
        }
      } catch (error) {
        console.error('Error fetching account:', error)
        setError('Failed to load account details')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAccount()
  }, [params.id])

  const handleSubmit = async (data: UpdateClaudeAccountData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/v1/admin/claude-accounts/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/admin/claude-accounts')
      } else {
        const error = await response.json()
        console.error('Failed to update account:', error)
        // TODO: Show error toast/notification
      }
    } catch (error) {
      console.error('Error updating account:', error)
      // TODO: Show error toast/notification
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-200 rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="max-w-2xl">
            <Card>
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                      <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (error || !account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-600">Error Loading Account</h2>
              <p className="text-sm text-muted-foreground mt-2">
                {error || 'Account not found'}
              </p>
              <Link href="/admin/claude-accounts">
                <Button variant="outline" className="mt-4">
                  Back to Accounts
                </Button>
              </Link>
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
        <div className="flex items-center gap-4">
          <Link href="/admin/claude-accounts">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Claude Account</h1>
            <p className="text-muted-foreground">
              Modify account details for {account.accountName}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ClaudeAccountForm
                account={account}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                isEditMode={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}