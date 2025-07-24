'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Application Error
            </h2>
            <p className="text-gray-600 mb-4">
              {error.message || 'Something went wrong!'}
            </p>
            <div className="space-y-4">
              <button
                onClick={reset}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Reload page
              </button>
            </div>
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">
                Technical details
              </summary>
              <pre className="mt-2 text-xs text-gray-400 whitespace-pre-wrap bg-gray-100 p-2 rounded">
                {error.stack}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}