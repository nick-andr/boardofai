'use client'

import { useState, useEffect, useRef } from 'react'
import ChatInput from './ChatInput'
import LoadingAnimation from './LoadingAnimation'
import ResultsDisplay from './ResultsDisplay'

interface ModelResult {
  modelId: string
  modelName: string
  content: string
  success: boolean
  error?: string
}

interface Summary {
  content: string
  viewpoints?: Array<{
    title: string
    description: string
    responseIndices: number[]
  }>
}

interface Viewpoint {
  title: string
  description: string
  responseIndices: number[]
}

export default function ChatInterface() {
  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [responses, setResponses] = useState<ModelResult[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [viewpoints, setViewpoints] = useState<Viewpoint[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [responses, summary])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!prompt.trim()) return

    setIsSubmitting(true)
    setResponses([])
    setSummary(null)
    setViewpoints([])

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          modelCount: 5, // Default
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      // Stream responses
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6))
              
              if (data.type === 'conversation') {
                // Conversation created
              } else if (data.type === 'prompt') {
                // Prompt created
              } else if (data.type === 'models_started') {
                // Models started processing
              } else if (data.type === 'model_processing') {
                // Model is processing
              } else if (data.type === 'model_completed') {
                setResponses((prev) => [...prev, {
                  modelId: data.modelId,
                  modelName: data.modelName,
                  content: data.content,
                  success: data.success,
                  error: data.error,
                }])
              } else if (data.type === 'model_failed') {
                setResponses((prev) => [...prev, {
                  modelId: data.modelId,
                  modelName: data.modelName,
                  content: '',
                  success: false,
                  error: data.error,
                }])
              } else if (data.type === 'generating_summary') {
                // Summary generation started
              } else if (data.type === 'summary_completed') {
                // Fetch summary and viewpoints
                if (data.promptId) {
                  const summaryResponse = await fetch(`/api/prompts/${data.promptId}`)
                  if (summaryResponse.ok) {
                    const promptData = await summaryResponse.json()
                    if (promptData.summary) {
                      setSummary({ content: promptData.summary.content })
                    }
                    if (promptData.viewpoints) {
                      setViewpoints(promptData.viewpoints)
                    }
                  }
                }
              } else if (data.type === 'complete') {
                setIsSubmitting(false)
                break
              } else if (data.type === 'error') {
                throw new Error(data.message || 'Unknown error')
              }
            } catch (parseError) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error submitting prompt:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* User Prompt */}
        {prompt && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-900 whitespace-pre-wrap">
                {prompt}
              </p>
            </div>
          </div>
        )}
        
        {/* Loading Animation */}
        {isSubmitting && responses.length === 0 && (
          <LoadingAnimation />
        )}
        
        {/* Results Display */}
        {responses.length > 0 && (
          <ResultsDisplay
            responses={responses}
            summary={summary}
            viewpoints={viewpoints}
            isLoading={isSubmitting}
          />
        )}
      </div>
      
      {/* Input */}
      <div className="border-t bg-white p-6">
        <ChatInput
          prompt={prompt}
          setPrompt={setPrompt}
          onSubmit={handleSubmit}
          disabled={isSubmitting}
        />
      </div>
      
      <div ref={messagesEndRef} />
    </div>
  )
}
