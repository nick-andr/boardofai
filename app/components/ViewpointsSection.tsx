'use client'

import { useState } from 'react'

interface Props {
  viewpoints: Array<{
    title: string
    description: string
    responseIndices: number[]
  }>
  responses: Array<{
    modelId: string
    modelName: string
    content: string
    success: boolean
    error?: string
  }>
}

export default function ViewpointsSection({ viewpoints, responses }: Props) {
  const [expandedViewpoint, setExpandedViewpoint] = useState<number | null>(null)

  return (
    <div className="space-y-4 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Viewpoints
      </h3>
      {viewpoints.map((viewpoint, index) => (
        <div
          key={index}
          className="border rounded-lg p-4 bg-white shadow-sm"
        >
          <button
            onClick={() => setExpandedViewpoint(expandedViewpoint === index ? null : index)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">
                {viewpoint.title}
              </h4>
              <span className="text-sm text-gray-500">
                {viewpoint.responseIndices.length} model(s) support this
              </span>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {viewpoint.description}
            </p>
          </button>
          
          {expandedViewpoint === index && (
            <div className="mt-4 pt-4 border-t space-y-2">
              {viewpoint.responseIndices.map((responseIndex) => (
                <div key={responseIndex} className="text-sm text-gray-700">
                  <strong>{responses[responseIndex]?.modelName}:</strong>{' '}
                  {responses[responseIndex]?.content.substring(0, 200)}...
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
