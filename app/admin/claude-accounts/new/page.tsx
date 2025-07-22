'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ClaudeAccountForm } from '@/components/admin/claude-accounts/claude-account-form'
import { CreateClaudeAccount } from '@/lib/validation/schemas'
import { extractApiError, processNetworkError } from '@/lib/utils/error-handler'

type CreateClaudeAccountData = CreateClaudeAccount

export default function NewClaudeAccountPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (data: CreateClaudeAccountData) => {
    console.log('📝 Starting account creation...', data)
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    try {
      const response = await fetch('/api/v1/admin/claude-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      console.log('📡 Response status:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ API Response:', result)
        
        if (result.success && result.data) {
          console.log('✅ Account created successfully')
          
          // 直接跳转到列表页，并传递成功消息和时间戳以确保刷新
          const successMessage = result.message || 'Account created successfully!'
          const timestamp = Date.now()
          router.push(`/admin/claude-accounts?success=${encodeURIComponent(successMessage)}&t=${timestamp}`)
        } else {
          console.error('❌ API returned success=false or no data:', result)
          setError('Creation failed: Invalid server response')
        }
      } else {
        // 使用新的错误处理工具处理API错误
        const processedError = await extractApiError(response)
        console.error('❌ HTTP Error:', response.status, processedError)
        
        setError(processedError.generalError)
        setFieldErrors(processedError.fieldErrors)
        
        if (processedError.requestId) {
          console.log('🔍 Request ID for debugging:', processedError.requestId)
        }
      }
    } catch (error) {
      console.error('❌ Network/Parse Error:', error)
      const processedError = processNetworkError(error as Error)
      setError(processedError.generalError)
    } finally {
      console.log('🔚 Setting isSubmitting to false')
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

        {/* Error Message */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

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
                fieldErrors={fieldErrors}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}