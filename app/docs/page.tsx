import DocNavigation from '@/components/docs/DocNavigation'
import Link from 'next/link'

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DocNavigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Claude Shop API 文档
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Claude AWS账户市场API - 用于管理和浏览带有Claude模型配额的AWS账户
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Link 
              href="/docs/swagger-ui"
              className="block p-6 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">⚡</span>
                <h3 className="text-xl font-semibold text-blue-900">Swagger UI</h3>
              </div>
              <p className="text-blue-700">
                交互式API测试界面，可以直接在浏览器中测试所有API端点，查看请求和响应示例。
              </p>
            </Link>

            <Link 
              href="/docs/redoc"
              className="block p-6 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📖</span>
                <h3 className="text-xl font-semibold text-green-900">Redoc</h3>
              </div>
              <p className="text-green-700">
                美观的API文档阅读界面，提供清晰的结构化视图和详细的API说明。
              </p>
            </Link>
          </div>

          <div className="border-t pt-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">API 概览</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">🌐 公开端点</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <code>GET /api/v1/accounts</code> - 获取可用账户列表</li>
                  <li>• <code>GET /api/v1/accounts/{'{id}'}</code> - 获取账户详情</li>
                  <li>• <code>GET /api/v1/search</code> - 搜索账户</li>
                  <li>• <code>GET /api/v1/filters/options</code> - 获取过滤选项</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">🔒 管理员端点</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• <code>POST /api/v1/admin/auth/login</code> - 管理员登录</li>
                  <li>• <code>GET /api/v1/admin/accounts</code> - 管理账户</li>
                  <li>• <code>POST /api/v1/admin/accounts</code> - 创建账户</li>
                  <li>• <code>GET /api/v1/admin/stats</code> - 获取统计数据</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <div>
                  <h4 className="font-medium text-yellow-800">认证说明</h4>
                  <p className="text-yellow-700 text-sm mt-1">
                    管理员端点需要Bearer Token认证。请先通过登录接口获取token，然后在请求头中添加 Authorization: Bearer {'{token}'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <a 
                href="/api-specification.yaml"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <span className="mr-2">⬇️</span>
                下载 OpenAPI 规范文件
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}