# API错误处理规范文档
**Claude Shop - 结构化错误响应设计规范**

*Version: 1.0*  
*Date: 2024-01-20*  
*Author: Claude Code Design Team*

---

## 📋 文档概述

本文档定义了Claude Shop项目中API错误响应的标准格式和处理规范，旨在提供统一、结构化的错误处理机制，支持前端表单字段级错误显示。

### 设计原则
- **一致性**: 前后端字段名保持一致，减少映射复杂度
- **结构化**: 支持字段级错误和通用错误的结构化响应
- **用户友好**: 提供清晰、可操作的错误信息
- **开发友好**: 简化前后端开发和调试流程

---

## 🏗 API响应格式标准

### 1. 基础响应接口
```typescript
interface ApiResponse<T = any> {
  success: boolean           // 请求是否成功
  data?: T                  // 成功时的响应数据
  message?: string          // 成功时的消息（可选）
  error?: string           // 错误时的主要错误信息
  details?: ValidationErrors // 字段级验证错误详情
  timestamp?: string       // 响应时间戳（ISO格式）
  requestId?: string       // 请求追踪ID（用于日志查询）
}

interface ValidationErrors {
  [fieldName: string]: string | string[]
}
```

### 2. 成功响应示例
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440005",
    "accountName": "test-account123",
    "email": "test@example.com",
    "organization": "TestOrg",
    "status": "ACTIVE",
    "tier": "FREE",
    "usageLimit": 1000,
    "features": {"feature1": true},
    "metadata": {"key": "value"},
    "createdAt": "2024-01-20T10:30:00Z",
    "updatedAt": "2024-01-20T10:30:00Z"
  },
  "message": "Account updated successfully",
  "timestamp": "2024-01-20T10:30:00Z",
  "requestId": "req-abc123"
}
```

---

## ❌ 错误响应格式规范

### 3. 字段验证错误 (HTTP 400)
**使用场景**: Zod验证失败、输入格式错误、必填字段缺失

```json
{
  "success": false,
  "error": "Validation failed",
  "details": {
    "accountName": "Account name already exists",
    "email": "Invalid email format", 
    "usageLimit": "Usage limit must be a positive number",
    "features": "Features must be valid JSON"
  },
  "timestamp": "2024-01-20T10:30:00Z",
  "requestId": "req-abc123"
}
```

### 4. 业务逻辑错误 (HTTP 409)
**使用场景**: 资源冲突、业务规则违反

```json
{
  "success": false,
  "error": "Account name conflict",
  "details": {
    "accountName": "An account with this name already exists in the system"
  },
  "timestamp": "2024-01-20T10:30:00Z",
  "requestId": "req-abc123"
}
```

### 5. 权限错误 (HTTP 401/403)
```json
{
  "success": false,
  "error": "Authentication required",
  "message": "Please log in to continue",
  "timestamp": "2024-01-20T10:30:00Z",
  "requestId": "req-abc123"
}
```

### 6. 系统错误 (HTTP 500)
```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later.",
  "timestamp": "2024-01-20T10:30:00Z",
  "requestId": "req-abc123"
}
```

---

## 🎯 字段名称映射规范

### Claude Account字段对照表

| 前端表单字段 | API字段 | 数据类型 | 说明 |
|-------------|---------|----------|------|
| `accountName` | `accountName` | string | 账户名称 |
| `email` | `email` | string? | 邮箱地址 |
| `organization` | `organization` | string? | 组织名称 |
| `status` | `status` | enum | 账户状态 |
| `tier` | `tier` | enum | 账户层级 |
| `usageLimit` | `usageLimit` | number? | 使用限制 |
| `features` | `features` | object? | 功能配置 |
| `metadata` | `metadata` | object? | 元数据 |

**注意**: 
- `features` 和 `metadata` 在前端表单中以JSON字符串形式存储
- API接收和返回时为对象格式
- 字段名在前后端保持完全一致

---

## 📝 验证错误消息标准

### Claude Account字段验证消息
```typescript
const VALIDATION_MESSAGES = {
  accountName: {
    required: "Account name is required",
    exists: "Account name already exists",
    invalid: "Account name contains invalid characters",
    tooLong: "Account name must not exceed 100 characters",
    tooShort: "Account name must be at least 1 character"
  },
  
  email: {
    invalid: "Invalid email format",
    required: "Email is required"
  },
  
  organization: {
    tooLong: "Organization name must not exceed 100 characters"
  },
  
  status: {
    invalid: "Status must be one of: ACTIVE, SUSPENDED, EXPIRED, PENDING"
  },
  
  tier: {
    invalid: "Tier must be one of: FREE, PRO, ENTERPRISE"
  },
  
  usageLimit: {
    invalid: "Usage limit must be a positive number",
    tooLarge: "Usage limit cannot exceed 1,000,000",
    negative: "Usage limit must be positive"
  },
  
  features: {
    invalidJson: "Features must be valid JSON",
    tooLarge: "Features data exceeds maximum size limit"
  },
  
  metadata: {
    invalidJson: "Metadata must be valid JSON",
    tooLarge: "Metadata data exceeds maximum size limit"
  }
}
```

---

## 🔧 后端实现指南

### 1. API Response Helper扩展

#### 文件: `lib/api/response.ts`
```typescript
export class ApiResponseHelper {
  // 现有方法保持不变...
  
  /**
   * 字段验证错误响应
   */
  static badRequest(error: string, details?: ValidationErrors): NextResponse {
    return NextResponse.json({
      success: false,
      error,
      details,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }, { status: 400 })
  }
  
  /**
   * 业务逻辑错误响应
   */
  static conflict(error: string, details?: ValidationErrors): NextResponse {
    return NextResponse.json({
      success: false,
      error,
      details,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }, { status: 409 })
  }
  
  /**
   * 成功响应（带时间戳和请求ID）
   */
  static success<T>(data: T, message?: string, status = 200): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      requestId: generateRequestId()
    }, { status })
  }
}

/**
 * 生成请求追踪ID
 */
function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface ValidationErrors {
  [fieldName: string]: string | string[]
}
```

### 2. Zod错误处理

#### 文件: `app/api/v1/admin/claude-accounts/[id]/route.ts`
```typescript
async function updateClaudeAccountHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // ... 现有代码
  
  try {
    const body = await request.json()
    const updateData = updateClaudeAccountSchema.parse(body)
  } catch (error) {
    // Zod验证错误处理
    if (error instanceof z.ZodError) {
      const details: ValidationErrors = {}
      
      error.errors.forEach((err) => {
        const field = err.path.join('.')
        details[field] = err.message
      })
      
      return ApiResponseHelper.badRequest('Validation failed', details)
    }
    throw error
  }
  
  // 业务逻辑验证
  if (updateData.accountName && updateData.accountName !== existingAccount.accountName) {
    const conflictingAccount = await prisma.claudeAccount.findFirst({
      where: {
        accountName: updateData.accountName,
        id: { not: id }
      }
    })
    
    if (conflictingAccount) {
      return ApiResponseHelper.conflict('Account name conflict', {
        accountName: 'An account with this name already exists in the system'
      })
    }
  }
  
  // ... 其他逻辑
  
  // 成功响应
  return ApiResponseHelper.success(
    responseData, 
    'Account updated successfully'
  )
}
```

### 3. 通用错误处理中间件

#### 文件: `lib/api/error-handler.ts`
```typescript
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args)
    } catch (error) {
      Logger.error('API Error', error as Error)
      
      return NextResponse.json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please try again later.',
        timestamp: new Date().toISOString(),
        requestId: generateRequestId()
      }, { status: 500 })
    }
  }
}

// 使用方式
export const PUT = withApiHandler(withErrorHandler(updateClaudeAccountHandler))
```

---

## 🎨 前端错误处理指南

### 错误解析工具函数

#### 文件: `lib/utils/error-handler.ts`
```typescript
interface ProcessedError {
  fieldErrors: Record<string, string>
  generalError: string | null
}

/**
 * 处理API错误响应
 */
export function processApiError(apiError: any): ProcessedError {
  const fieldErrors: Record<string, string> = {}
  let generalError: string | null = null
  
  if (apiError.details && typeof apiError.details === 'object') {
    // 结构化字段错误
    Object.entries(apiError.details).forEach(([field, message]) => {
      fieldErrors[field] = Array.isArray(message) ? message[0] : message as string
    })
  }
  
  if (apiError.error) {
    // 主要错误信息
    if (Object.keys(fieldErrors).length === 0) {
      // 如果没有字段错误，则作为通用错误显示
      generalError = apiError.error
    }
  } else if (apiError.message) {
    generalError = apiError.message
  } else {
    generalError = 'An unexpected error occurred'
  }
  
  return { fieldErrors, generalError }
}

/**
 * 检查是否为API错误响应
 */
export function isApiError(response: any): boolean {
  return response && typeof response === 'object' && response.success === false
}
```

---

## ✅ 实施检查清单

### 后端开发任务
- [ ] 扩展 `ApiResponseHelper` 类，添加 `badRequest` 和 `conflict` 方法
- [ ] 更新所有Claude Account相关API路由的错误处理
- [ ] 实现Zod验证错误的结构化处理
- [ ] 添加请求ID生成和日志关联
- [ ] 测试各种错误场景的响应格式

### 前端开发任务
- [ ] 实现 `processApiError` 工具函数
- [ ] 更新编辑页面的错误处理逻辑
- [ ] 实现字段级错误显示
- [ ] 添加列表页面的成功消息Banner
- [ ] 测试完整的成功/失败流程

### 测试场景
- [ ] 字段验证错误（必填字段、格式错误）
- [ ] 业务逻辑错误（重名冲突）
- [ ] 权限错误（未登录）
- [ ] 系统错误（服务器异常）
- [ ] 成功更新和重定向流程

---

## 📞 技术支持

如在实施过程中遇到问题，请参考：
- 现有代码中的 `ApiResponseHelper` 类
- Zod验证错误处理示例
- 前端表单错误显示模式

**文档版本**: 1.0  
**最后更新**: 2024-01-20  
**维护团队**: Claude Code Design Team

---

*此文档是Claude Shop项目API错误处理的权威规范，所有API开发必须遵循此标准。*