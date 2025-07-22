'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react'
import { 
  ClaudeAccount,
  CreateClaudeAccountData, 
  UpdateClaudeAccountData,
  createClaudeAccountSchema,
  updateClaudeAccountSchema,
} from '@/lib/validation/claude-account'

interface ClaudeAccountFormProps {
  account?: ClaudeAccount
  onSubmit: (data: any) => Promise<void>
  isSubmitting: boolean
  isEditMode?: boolean
}

export function ClaudeAccountForm({ 
  account, 
  onSubmit, 
  isSubmitting,
  isEditMode = false 
}: ClaudeAccountFormProps) {
  const [showApiKey, setShowApiKey] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    // resolver: isEditMode 
    //   ? zodResolver(updateClaudeAccountSchema) 
    //   : zodResolver(createClaudeAccountSchema),
    defaultValues: isEditMode && account ? {
      accountName: account.accountName,
      email: account.email || '',
      organization: account.organization || '',
      status: account.status,
      tier: account.tier,
      usageLimit: account.usageLimit,
      features: account.features ? JSON.stringify(account.features, null, 2) : '',
      metadata: account.metadata ? JSON.stringify(account.metadata, null, 2) : '',
    } : {
      tier: 'FREE',
      features: '',
      metadata: '',
    }
  })

  const watchedTier = watch('tier')
  const watchedStatus = watch('status')

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Form submission error:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="accountName">Account Name *</Label>
            <Input
              id="accountName"
              {...register('accountName')}
              placeholder="Enter account name"
              className={errors.accountName ? 'border-red-500' : ''}
            />
            {errors.accountName && (
              <p className="text-sm text-red-500">{errors.accountName?.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="Enter email address"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email?.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="organization">Organization</Label>
          <Input
            id="organization"
            {...register('organization')}
            placeholder="Enter organization name"
            className={errors.organization ? 'border-red-500' : ''}
          />
          {errors.organization && (
            <p className="text-sm text-red-500">{errors.organization?.message}</p>
          )}
        </div>

        {/* API Key - only show in create mode */}
        {!isEditMode && (
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key *</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                {...register('apiKey' as any)}
                placeholder="Enter Claude API key"
                className={(errors as any).apiKey ? 'border-red-500 pr-10' : 'pr-10'}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {(errors as any).apiKey && (
              <p className="text-sm text-red-500">{(errors as any).apiKey?.message}</p>
            )}
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Tier</Label>
            <Select
              value={watchedTier}
              onValueChange={(value) => setValue('tier', value as any)}
            >
              <SelectTrigger className={errors.tier ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">Free</SelectItem>
                <SelectItem value="PRO">Pro</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            {errors.tier && (
              <p className="text-sm text-red-500">{errors.tier?.message}</p>
            )}
          </div>

          {isEditMode && (
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={watchedStatus}
                onValueChange={(value) => setValue('status', value as any)}
              >
                <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-500">{errors.status?.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="usageLimit">Usage Limit</Label>
            <Input
              id="usageLimit"
              type="number"
              min="0"
              {...register('usageLimit', { valueAsNumber: true })}
              placeholder="Enter usage limit"
              className={errors.usageLimit ? 'border-red-500' : ''}
            />
            {errors.usageLimit && (
              <p className="text-sm text-red-500">{errors.usageLimit?.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <div 
            className="flex items-center cursor-pointer" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 
              <ChevronDown className="h-4 w-4 mr-2" /> : 
              <ChevronRight className="h-4 w-4 mr-2" />
            }
            <CardTitle className="text-base">Advanced Settings</CardTitle>
          </div>
          <CardDescription>
            Optional JSON configuration for features and metadata
          </CardDescription>
        </CardHeader>
        
        {showAdvanced && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="features">Features (JSON)</Label>
              <textarea
                id="features"
                {...register('features')}
                placeholder='{"feature1": true, "feature2": "value"}'
                className={`min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.features ? 'border-red-500' : ''
                }`}
              />
              {errors.features && (
                <p className="text-sm text-red-500">{errors.features?.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata (JSON)</Label>
              <textarea
                id="metadata"
                {...register('metadata')}
                placeholder='{"key1": "value1", "key2": "value2"}'
                className={`min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                  errors.metadata ? 'border-red-500' : ''
                }`}
              />
              {errors.metadata && (
                <p className="text-sm text-red-500">{errors.metadata?.message}</p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Submit Buttons */}
      <div className="flex items-center gap-4 pt-4">
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {isEditMode ? 'Update Account' : 'Create Account'}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}