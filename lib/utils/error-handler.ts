// 前端API错误处理工具函数
// 根据API错误处理规范文档实现

interface ProcessedError {
  fieldErrors: Record<string, string>
  generalError: string | null
  requestId?: string
}

interface ApiErrorResponse {
  success: boolean
  error?: string
  message?: string
  details?: Record<string, string | string[]>
  timestamp?: string
  requestId?: string
}

/**
 * 处理API错误响应，转换为前端可用的错误格式
 * 支持字段级错误和通用错误
 */
export function processApiError(apiError: ApiErrorResponse): ProcessedError {
  const fieldErrors: Record<string, string> = {}
  let generalError: string | null = null
  const requestId = apiError.requestId

  // 处理结构化字段错误 (details 字段)
  if (apiError.details && typeof apiError.details === 'object') {
    Object.entries(apiError.details).forEach(([field, message]) => {
      // 处理数组形式的错误消息，取第一个
      fieldErrors[field] = Array.isArray(message) ? message[0] : message as string
    })
  }

  // 处理主要错误信息
  if (apiError.error) {
    // 如果有字段级错误，主要错误作为通用提示
    // 如果没有字段级错误，主要错误作为通用错误显示
    if (Object.keys(fieldErrors).length === 0) {
      generalError = apiError.error
    } else {
      // 有字段级错误时，显示友好的通用提示
      generalError = getFieldErrorSummary(apiError.error)
    }
  } else if (apiError.message) {
    generalError = apiError.message
  } else {
    generalError = 'An unexpected error occurred'
  }

  return { fieldErrors, generalError, requestId }
}

/**
 * 将错误类型转换为用户友好的通用提示
 */
function getFieldErrorSummary(errorType: string): string {
  switch (errorType) {
    case 'Validation failed':
      return 'Please check the highlighted fields and correct any errors'
    case 'Account name conflict':
      return 'An account with this name already exists'
    default:
      return errorType
  }
}

/**
 * 检查是否为API错误响应
 */
export function isApiError(response: any): boolean {
  return response && typeof response === 'object' && response.success === false
}

/**
 * 从fetch响应中提取并处理API错误
 */
export async function extractApiError(response: Response): Promise<ProcessedError> {
  try {
    const errorData = await response.json()
    
    if (isApiError(errorData)) {
      return processApiError(errorData)
    }
    
    // 如果不是标准API错误格式，创建通用错误
    return {
      fieldErrors: {},
      generalError: `HTTP ${response.status}: ${response.statusText}`,
    }
  } catch (parseError) {
    // JSON解析失败，返回通用错误
    return {
      fieldErrors: {},
      generalError: `HTTP ${response.status}: Failed to parse error response`,
    }
  }
}

/**
 * 处理网络错误或其他非API错误
 */
export function processNetworkError(error: Error): ProcessedError {
  return {
    fieldErrors: {},
    generalError: error.message || 'Network error occurred',
  }
}

/**
 * 用于react-hook-form集成的错误设置函数
 */
export function setFormErrors(
  setError: (name: string, error: { message: string }) => void,
  fieldErrors: Record<string, string>
) {
  Object.entries(fieldErrors).forEach(([field, message]) => {
    setError(field, { message })
  })
}

/**
 * 清除表单错误
 */
export function clearFormErrors(
  clearErrors: (names?: string[] | string) => void,
  fieldNames: string[]
) {
  clearErrors(fieldNames)
}