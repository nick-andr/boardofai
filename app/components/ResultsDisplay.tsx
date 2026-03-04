'use client'

import ModelResponse from './ModelResponse'
import SummarySection from './SummarySection'
import ViewpointsSection from './ViewpointsSection'

interface Props {
  responses: Array<{
    modelId: string
    modelName: string
    content: string
    success: boolean
    error?: string
  }>
  summary?: {
    content: string
    viewpoints: Array<{
      title: string
      description: string
      responseIndices: number[]
    }>
  } | null
  viewpoints?: Array<{
    title: string
    description: string
    responseIndices: number[]
  }>
  isLoading?: boolean
}

export default function ResultsDisplay({ responses, summary, viewpoints, isLoading }: Props) {
  return (
    <div className="space-y-6">
      {/* Summary Section */}
      {summary && (
        <SummarySection summary={summary} />
      )}
      
      {/* Viewpoints Section */}
      {viewpoints && viewpoints.length > 0 && (
        <ViewpointsSection viewpoints={viewpoints} responses={responses} />
      )}
      
      {/* Individual Responses */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Individual Responses
        </h3>
        {responses.map((response, index) => (
          <ModelResponse
            key={index}
            response={response}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
