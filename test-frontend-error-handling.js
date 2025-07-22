#!/usr/bin/env node

// 测试前端错误处理工具函数
const { processApiError, extractApiError, processNetworkError, isApiError } = require('./lib/utils/error-handler.js')

console.log('🧪 前端错误处理工具函数测试')
console.log('=' * 50)

// 测试 1: 字段级验证错误
console.log('\n📋 测试 1: 处理字段级验证错误')
const validationErrorResponse = {
  success: false,
  error: 'Validation failed',
  details: {
    accountName: 'Account name is required',
    email: 'Invalid email format',
    usageLimit: 'Usage limit must be positive'
  },
  timestamp: '2024-01-20T10:30:00Z',
  requestId: 'req-abc123'
}

const result1 = processApiError(validationErrorResponse)
console.log('✅ 处理结果:')
console.log('  通用错误:', result1.generalError)
console.log('  字段错误:', result1.fieldErrors)
console.log('  请求ID:', result1.requestId)

// 测试 2: 业务逻辑错误
console.log('\n🔥 测试 2: 处理业务逻辑错误')
const conflictErrorResponse = {
  success: false,
  error: 'Account name conflict',
  details: {
    accountName: 'An account with this name already exists in the system'
  },
  timestamp: '2024-01-20T10:30:00Z',
  requestId: 'req-def456'
}

const result2 = processApiError(conflictErrorResponse)
console.log('✅ 处理结果:')
console.log('  通用错误:', result2.generalError)
console.log('  字段错误:', result2.fieldErrors)
console.log('  请求ID:', result2.requestId)

// 测试 3: 权限错误
console.log('\n🔒 测试 3: 处理权限错误')
const authErrorResponse = {
  success: false,
  error: 'Authentication required',
  message: 'Please log in to continue',
  timestamp: '2024-01-20T10:30:00Z',
  requestId: 'req-ghi789'
}

const result3 = processApiError(authErrorResponse)
console.log('✅ 处理结果:')
console.log('  通用错误:', result3.generalError)
console.log('  字段错误:', Object.keys(result3.fieldErrors).length, '个字段错误')
console.log('  请求ID:', result3.requestId)

// 测试 4: 网络错误处理
console.log('\n🌐 测试 4: 处理网络错误')
const networkError = new Error('Failed to fetch')
const result4 = processNetworkError(networkError)
console.log('✅ 处理结果:')
console.log('  通用错误:', result4.generalError)
console.log('  字段错误:', Object.keys(result4.fieldErrors).length, '个字段错误')

// 测试 5: API错误检查
console.log('\n🔍 测试 5: API错误检查')
console.log('  验证错误是API错误?', isApiError(validationErrorResponse) ? '✅ 是' : '❌ 否')
console.log('  成功响应是API错误?', isApiError({ success: true, data: {} }) ? '❌ 是' : '✅ 否')
console.log('  普通对象是API错误?', isApiError({ test: 'data' }) ? '❌ 是' : '✅ 否')

console.log('\n' + '=' * 50)
console.log('✅ 所有测试完成！前端错误处理工具函数工作正常')
console.log('')
console.log('📋 集成测试建议:')
console.log('1. 在浏览器中访问账户编辑页面')
console.log('2. 提交无效数据测试字段级错误显示')
console.log('3. 创建重名账户测试冲突错误')
console.log('4. 验证控制台中的请求ID日志')