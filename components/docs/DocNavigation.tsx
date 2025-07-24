'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const docOptions = [
  {
    name: "概览",
    href: "/docs", 
    description: "API文档首页",
    icon: "📋"
  },
  {
    name: "Swagger UI",
    href: "/docs/swagger-ui", 
    description: "交互式API测试",
    icon: "⚡"
  },
  {
    name: "Redoc",
    href: "/docs/redoc",
    description: "美观的文档阅读",
    icon: "📖"
  },
  {
    name: "下载YAML",
    href: "/api-specification.yaml",
    description: "原始API规范文件",
    icon: "⬇️",
    external: true
  }
]

export default function DocNavigation() {
  const pathname = usePathname()

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-semibold text-gray-900">
              Claude Shop API 文档
            </h1>
            
            <nav className="flex space-x-6">
              {docOptions.map((option) => (
                option.external ? (
                  <a
                    key={option.href}
                    href={option.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.name}
                  </a>
                ) : (
                  <Link
                    key={option.href}
                    href={option.href as any}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      pathname === option.href
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="mr-2">{option.icon}</span>
                    {option.name}
                  </Link>
                )
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              API Version: v1.0.0
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}