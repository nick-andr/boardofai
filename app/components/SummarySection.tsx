'use client'

interface Props {
  summary: {
    content: string
    viewpoints?: Array<{
      title: string
      description: string
      responseIndices: number[]
    }>
  }
}

export default function SummarySection({ summary }: Props) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-3">
        Summary
      </h3>
      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
        {summary.content}
      </p>
    </div>
  )
}
