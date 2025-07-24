import DocNavigation from '@/components/docs/DocNavigation'
import SwaggerUIComponent from '@/components/docs/SwaggerUI'

export default function SwaggerUIPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DocNavigation />
      
      <div className="max-w-full">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Swagger UI - 交互式API测试
          </h1>
          <p className="text-gray-600 mt-1">
            在此页面可以直接测试所有API端点，查看请求响应格式
          </p>
        </div>
        
        <div className="bg-white">
          <SwaggerUIComponent />
        </div>
      </div>
    </div>
  )
}