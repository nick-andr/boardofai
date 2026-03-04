'use client'

import { useState } from 'react'

interface Props {
  response: {
    modelId: string
    modelName: string
    content: string
    success: boolean
    error?: string
  }
  index: number
}

export default function ModelResponse({ response, index }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            response.success
              ? 'bg-green-500'
              : 'bg-red-500'
          }`} />
          <h4 className="font-semibold text-gray-900">
            {response.modelName}
          </h4>
        </div>
        <span className="text-sm text-gray-500">
          Response #{index + 1}
        </span>
      </div>
      
      {response.success ? (
        <div className="mt-3">
          <p className="text-gray-700 whitespace-pre-wrap">
            {response.content}
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-red-600">
            Error: {response.error || 'Unknown error'}
          </p>
        </div>
      )}
    </div>
  )
}
