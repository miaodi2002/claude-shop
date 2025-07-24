'use client'

import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

interface SwaggerUIComponentProps {
  specUrl?: string
  spec?: object
}

export default function SwaggerUIComponent({ 
  specUrl = '/api-specification.yaml',
  spec 
}: SwaggerUIComponentProps) {
  return (
    <div className="swagger-ui-container">
      <SwaggerUI 
        url={spec ? undefined : specUrl}
        spec={spec}
        tryItOutEnabled={true}
        displayRequestDuration={true}
        supportedSubmitMethods={['get', 'post', 'put', 'delete', 'patch']}
        defaultModelsExpandDepth={1}
        defaultModelExpandDepth={1}
        deepLinking={true}
        docExpansion="list"
        filter={true}
        showExtensions={true}
        showCommonExtensions={true}
        plugins={[]}
        requestInterceptor={(request) => {
          // 自动添加认证头（如果在localStorage中有token）
          if (typeof window !== 'undefined') {
            const token = localStorage.getItem('admin_token')
            if (token && request.url.includes('/admin/')) {
              request.headers.Authorization = `Bearer ${token}`
            }
          }
          return request
        }}
      />
    </div>
  )
}