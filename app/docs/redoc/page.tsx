import DocNavigation from '@/components/docs/DocNavigation'
import RedocComponent from '@/components/docs/RedocComponent'

export default function RedocPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DocNavigation />
      
      <div className="max-w-full">
        <div className="bg-white border-b px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">
            Redoc - API文档阅读
          </h1>
          <p className="text-gray-600 mt-1">
            美观的API文档展示，便于阅读和理解API结构
          </p>
        </div>
        
        <div className="bg-white">
          <RedocComponent />
        </div>
      </div>
    </div>
  )
}