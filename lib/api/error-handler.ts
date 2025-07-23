import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Logger } from '@/lib/monitoring/logger'
import { ValidationErrors } from './response'

/**
 * Generate request tracking ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Enhanced error handler wrapper for API routes
 * Provides structured error handling with request tracking
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      const requestId = generateRequestId()
      
      // Log error with request ID for tracking
      Logger.error('API Error', error as Error, { requestId })
      
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const details: ValidationErrors = {}
        
        error.errors.forEach((err) => {
          const field = err.path.join('.')
          details[field] = err.message
        })
        
        return NextResponse.json({
          success: false,
          error: 'Validation failed',
          details,
          timestamp: new Date().toISOString(),
          requestId
        }, { status: 400 })
      }
      
      // Handle known error types
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return NextResponse.json({
            success: false,
            error: 'Authentication required',
            message: 'Please log in to continue',
            timestamp: new Date().toISOString(),
            requestId
          }, { status: 401 })
        }
        
        if (error.message === 'Access denied') {
          return NextResponse.json({
            success: false,
            error: 'Access denied',
            message: 'You do not have permission to perform this action',
            timestamp: new Date().toISOString(),
            requestId
          }, { status: 403 })
        }
      }
      
      // Generic server error
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        timestamp: new Date().toISOString(),
        requestId
      }, { status: 500 })
    }
  }
}

/**
 * Process Zod validation errors into structured format
 */
export function processZodError(error: z.ZodError): ValidationErrors {
  const details: ValidationErrors = {}
  
  error.errors.forEach((err) => {
    const field = err.path.join('.')
    details[field] = err.message
  })
  
  return details
}