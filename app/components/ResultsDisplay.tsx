'use client'

import ModelResponse from './ModelResponse'
import SummarySection from './SummarySection'

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
  } | null
  summaryLoading?: boolean
  isLoading?: boolean
}

export default function ResultsDisplay({ responses, summary, summaryLoading, isLoading }: Props) {
  return (
    <div className="space-y-6 w-full">
      {/* Summary Section - centered */}
      {summary ? (
        <div className="flex justify-center w-full">
          <div className="max-w-3xl mx-auto">
            <SummarySection summary={summary} />
          </div>
        </div>
      ) : summaryLoading ? (
        <div className="flex justify-center w-full">
          <div className="max-w-3xl mx-auto text-center text-gray-500 text-sm py-2">
            Generating summary…
          </div>
        </div>
      ) : null}

      {/* Individual model responses - left-aligned, full width */}
      <div className="space-y-4 w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          Responses
        </h3>
        {responses.map((response, index) => (
          <ModelResponse
            key={response.modelId ?? index}
            response={response}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
