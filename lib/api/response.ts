import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiError {
  message: string
  code?: string
  details?: any
  statusCode: number
}

export class ApiResponseHelper {
  /**
   * 成功响应
   */
  static success<T>(data: T, message?: string, statusCode: number = 200): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
    }
    
    const nextResponse = NextResponse.json(response, { status: statusCode })
    
    // 添加缓存头 (仅对 GET 请求)
    if (statusCode === 200) {
      nextResponse.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate')
    }
    
    return nextResponse
  }

  /**
   * 分页成功响应
   */
  static successWithPagination<T>(
    data: T[],
    pagination: {
      page: number
      limit: number
      total: number
    },
    message?: string
  ): NextResponse {
    const totalPages = Math.ceil(pagination.total / pagination.limit)
    
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      message,
      pagination: {
        ...pagination,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrev: pagination.page > 1,
      },
    }
    
    return NextResponse.json(response, { status: 200 })
  }

  /**
   * 错误响应
   */
  static error(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: any
  ): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
    }
    
    // 开发环境包含详细错误信息
    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development' && details) {
      response.error = `${message}: ${details}`
    }
    
    return NextResponse.json(response, { status: statusCode })
  }

  /**
   * 验证错误响应
   */
  static validationError(error: z.ZodError): NextResponse {
    const errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }))
    
    return NextResponse.json({
      success: false,
      error: 'Validation failed',
      details: errors,
    }, { status: 400 })
  }

  /**
   * 未认证错误
   */
  static unauthorized(message: string = 'Authentication required'): NextResponse {
    return this.error(message, 401, 'UNAUTHORIZED')
  }

  /**
   * 无权限错误
   */
  static forbidden(message: string = 'Access denied'): NextResponse {
    return this.error(message, 403, 'FORBIDDEN')
  }

  /**
   * 资源不存在错误
   */
  static notFound(message: string = 'Resource not found'): NextResponse {
    return this.error(message, 404, 'NOT_FOUND')
  }

  /**
   * 冲突错误
   */
  static conflict(message: string = 'Resource conflict'): NextResponse {
    return this.error(message, 409, 'CONFLICT')
  }

  /**
   * 速率限制错误
   */
  static rateLimited(message: string = 'Too many requests'): NextResponse {
    const response = NextResponse.json({
      success: false,
      error: message,
    }, { status: 429 })
    
    response.headers.set('Retry-After', '60')
    return response
  }

  /**
   * 服务器内部错误
   */
  static internalError(message: string = 'Internal server error'): NextResponse {
    return this.error(message, 500, 'INTERNAL_ERROR')
  }
}

/**
 * API 路由包装器 - 统一错误处理
 */
export function withApiHandler<T extends any[] = []>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      return await handler(request, ...args)
    } catch (error) {
      console.error('API handler error:', error)
      
      if (error instanceof z.ZodError) {
        return ApiResponseHelper.validationError(error)
      }
      
      if (error instanceof Error) {
        if (error.message === 'Authentication required') {
          return ApiResponseHelper.unauthorized()
        }
        
        if (error.message === 'Access denied') {
          return ApiResponseHelper.forbidden()
        }
      }
      
      return ApiResponseHelper.internalError(
        (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')
          ? (error instanceof Error ? error.message : String(error))
          : 'Internal server error'
      )
    }
  }
}