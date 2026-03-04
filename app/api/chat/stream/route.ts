import { NextRequest } from 'next/server'
import { orchestrateModels } from '@/lib/orchestration'
import { generateSummaryAndViewpoints } from '@/lib/summary'
import { callModel } from '@/lib/openrouter'
import { getEnabledModels, getModelById } from '@/lib/models'
import { prisma } from '@/lib/prisma'

// Server-Sent Events stream for real-time updates
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        const body = await request.json()
        const { prompt, modelCount, conversationId } = body

        if (!prompt || typeof prompt !== 'string') {
          send({ type: 'error', message: 'Prompt is required' })
          controller.close()
          return
        }

        if (!modelCount || modelCount < 1) {
          send({ type: 'error', message: 'Model count must be at least 1' })
          controller.close()
          return
        }

        // Get enabled models
        const enabledModels = getEnabledModels()
        const selectedModels = enabledModels.slice(0, parseInt(modelCount, 10))
        const modelIds = selectedModels.map((m) => m.id)

        // Create or get conversation
        let conversationIdFinal = conversationId
        if (!conversationIdFinal) {
          const conversation = await prisma.conversation.create({
            data: {
              title: prompt.substring(0, 100),
            },
          })
          conversationIdFinal = conversation.id
          send({ type: 'conversation', conversationId: conversationIdFinal })
        }

        // Create prompt record
        const promptRecord = await prisma.prompt.create({
          data: {
            conversationId: conversationIdFinal,
            content: prompt,
            modelCount: parseInt(modelCount, 10),
          },
        })

        send({ type: 'prompt', promptId: promptRecord.id })

        // Create pending response records
        const responseRecords = await Promise.all(
          selectedModels.map((model) =>
            prisma.modelResponse.create({
              data: {
                promptId: promptRecord.id,
                modelId: model.id,
                modelName: model.name,
                content: '', // Empty string for pending records
                status: 'pending',
              },
            })
          )
        )

        // Send initial state
        send({
          type: 'models_started',
          models: selectedModels.map((m) => ({
            id: m.id,
            name: m.name,
            status: 'pending',
          })),
        })

        // Call models in parallel
        const promises = selectedModels.map(async (model, index) => {
          const record = responseRecords[index]

          try {
            send({
              type: 'model_processing',
              modelId: model.id,
              modelName: model.name,
            })

            const result = await callModel(model.id, prompt)

            // Update database
            await prisma.modelResponse.update({
              where: { id: record.id },
              data: {
                content: result.content,
                status: result.success ? 'completed' : 'failed',
                error: result.error || null,
                completedAt: result.success ? new Date() : null,
                modelName: model.name,
              },
            })

            // Send update
            send({
              type: 'model_completed',
              modelId: model.id,
              modelName: model.name,
              success: result.success,
              content: result.content,
              error: result.error,
            })

            return result
          } catch (error) {
            await prisma.modelResponse.update({
              where: { id: record.id },
              data: {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
              },
            })

            send({
              type: 'model_failed',
              modelId: model.id,
              modelName: model.name,
              error: error instanceof Error ? error.message : 'Unknown error',
            })

            return {
              modelId: model.id,
              modelName: model.name,
              content: '',
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          }
        })

        await Promise.all(promises)

        // Generate summary and viewpoints
        send({ type: 'generating_summary' })
        try {
          await generateSummaryAndViewpoints(promptRecord.id)
          send({ type: 'summary_completed', promptId: promptRecord.id })
        } catch (error) {
          console.error('Error generating summary:', error)
          send({
            type: 'summary_error',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
        }

        send({ type: 'complete', promptId: promptRecord.id })
        controller.close()
      } catch (error) {
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'Internal server error',
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
