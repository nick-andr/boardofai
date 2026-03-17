import { NextRequest, NextResponse } from 'next/server'
import { orchestrateModels } from '@/lib/orchestration'
import { generateSummaryAndStances } from '@/lib/summary'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, modelCount, conversationId } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    if (!modelCount || modelCount < 1) {
      return NextResponse.json(
        { error: 'Model count must be at least 1' },
        { status: 400 }
      )
    }

    // Orchestrate model calls
    const result = await orchestrateModels({
      prompt,
      modelCount: parseInt(modelCount, 10),
      conversationId,
    })

    // Generate summary and panel vote asynchronously with the unified orchestrator.
    // Don't wait for it to complete before returning.
    ;(async () => {
      try {
        await generateSummaryAndStances(result.promptId)
      } catch (error) {
        console.error('Error generating summary or stances:', error)
      }
    })()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
