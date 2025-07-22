'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ClaudeAccountForm } from '@/components/admin/claude-accounts/claude-account-form'
import { CreateClaudeAccountData } from '@/lib/validation/claude-account'

export default function NewClaudeAccountPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: CreateClaudeAccountData) => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/v1/admin/claude-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/admin/claude-accounts')
      } else {
        const error = await response.json()
        console.error('Failed to create account:', error)
        // TODO: Show error toast/notification
      }
    } catch (error) {
      console.error('Error creating account:', error)
      // TODO: Show error toast/notification
    } finally {
      setIsSubmitting(false)
    }
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
            <h1 className="text-3xl font-bold">Create New Claude Account</h1>
            <p className="text-muted-foreground">
              Add a new Claude API account to the system
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
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}