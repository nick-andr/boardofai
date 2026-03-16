import { NextRequest } from 'next/server'
import { generateSummaryAndViewpoints } from '@/lib/summary'
import { callModel } from '@/lib/openrouter'
import { getEnabledModels, getModelsByIds } from '@/lib/models'
import { prisma } from '@/lib/prisma'
import { buildConversationMessages } from '@/lib/context'

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
        const { prompt, modelCount, conversationId, selectedModelIds, powerMode } = body

        if (!prompt || typeof prompt !== 'string') {
          send({ type: 'error', message: 'Prompt is required' })
          controller.close()
          return
        }

        const count = Math.min(7, Math.max(1, parseInt(modelCount, 10) || 1))
        const enabledModels = getEnabledModels()

        // Create or get conversation: reuse only if valid id and conversation exists
        let conversationIdFinal: string
        let baseModelIds: string[] | null = null
        let disabledModelIds: string[] = []
        let isChildConversation = false
        const incomingId = typeof body.conversationId === 'string' && body.conversationId.trim()
          ? body.conversationId.trim()
          : null

        if (incomingId) {
          const existing = await prisma.conversation.findUnique({
            where: { id: incomingId },
          })
          if (existing) {
            conversationIdFinal = existing.id
            if (existing.parentId != null) isChildConversation = true
            // Load canonical model set and disabled models for this conversation
            if (existing.modelIds) {
              try {
                baseModelIds = JSON.parse(existing.modelIds)
              } catch {
                baseModelIds = null
              }
            }
            if (existing.disabledModelIds) {
              try {
                disabledModelIds = JSON.parse(existing.disabledModelIds)
              } catch {
                disabledModelIds = []
              }
            }
            await prisma.conversation.update({
              where: { id: conversationIdFinal },
              data: { updatedAt: new Date() },
            })
          } else {
            const conversation = await prisma.conversation.create({
              data: { title: prompt.substring(0, 100) },
            })
            conversationIdFinal = conversation.id
            send({ type: 'conversation', conversationId: conversationIdFinal })
          }
        } else {
          const conversation = await prisma.conversation.create({
            data: { title: prompt.substring(0, 100) },
          })
          conversationIdFinal = conversation.id
          send({ type: 'conversation', conversationId: conversationIdFinal })
        }

        // Resolve canonical model ids for this conversation.
        // 1) If baseModelIds was already stored on the conversation, use it.
        // 2) Otherwise, derive from client selection / defaults once and persist.
        let selectedModelsForTurn: typeof enabledModels
        if (!baseModelIds) {
          // Use selectedModelIds from client when provided; otherwise first N from default order
          if (Array.isArray(selectedModelIds) && selectedModelIds.length > 0) {
            selectedModelsForTurn = getModelsByIds(selectedModelIds)
          } else {
            selectedModelsForTurn = enabledModels.slice(0, count)
          }
          if (selectedModelsForTurn.length === 0) {
            send({ type: 'error', message: 'At least one model must be selected' })
            controller.close()
            return
          }
          baseModelIds = selectedModelsForTurn.map((m) => m.id)
          // Persist canonical model set for this conversation
          await prisma.conversation.update({
            where: { id: conversationIdFinal },
            data: { modelIds: JSON.stringify(baseModelIds) },
          })
        }

        // Apply per-conversation disabled models: silently drop them for this and future turns.
        const effectiveModelIds = (baseModelIds || []).filter(
          (id) => !disabledModelIds.includes(id)
        )
        selectedModelsForTurn = getModelsByIds(effectiveModelIds)
        if (selectedModelsForTurn.length === 0) {
          send({
            type: 'error',
            message: 'All models for this conversation are currently disabled due to errors',
          })
          controller.close()
          return
        }
        const modelIds = selectedModelsForTurn.map((m) => m.id)

        // Create prompt record
        const promptRecord = await prisma.prompt.create({
          data: {
            conversationId: conversationIdFinal,
            content: prompt,
            modelCount: selectedModelsForTurn.length,
          },
        })

        send({ type: 'prompt', promptId: promptRecord.id })

        // Create pending response records
        const responseRecords = await Promise.all(
          selectedModelsForTurn.map((model) =>
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
          models: selectedModelsForTurn.map((m) => ({
            id: m.id,
            name: m.name,
            status: 'pending',
          })),
        })

        // Call models in parallel (with conversation context when continuing)
        const messages = incomingId
          ? await buildConversationMessages(conversationIdFinal, prompt)
          : [{ role: 'user' as const, content: prompt }]

        const promises = selectedModelsForTurn.map(async (model, index) => {
          const record = responseRecords[index]

          try {
            send({
              type: 'model_processing',
              modelId: model.id,
              modelName: model.name,
            })

            const targetModelId = powerMode ? model.powerModelId : model.fastModelId
            const result = await callModel(targetModelId, messages)

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

            // Silently disable this model for the rest of the conversation.
            try {
              const updatedDisabled = Array.from(
                new Set([...disabledModelIds, model.id])
              )
              disabledModelIds = updatedDisabled
              await prisma.conversation.update({
                where: { id: conversationIdFinal },
                data: { disabledModelIds: JSON.stringify(updatedDisabled) },
              })
            } catch (e) {
              console.error('Failed to update disabledModelIds for conversation:', e)
            }

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

        // Skip summary for child (1:1) threads and for single-model board conversations
        const skipSummary = isChildConversation || modelIds.length === 1
        if (!skipSummary) {
          try {
            await generateSummaryAndViewpoints(promptRecord.id)
          } catch (error) {
            console.error('Error generating summary:', error)
          }
        }

        try {
          if (!skipSummary) {
            send({ type: 'generating_summary' })
            send({ type: 'summary_completed', promptId: promptRecord.id })
          }
          send({ type: 'complete', promptId: promptRecord.id })
        } catch (_) {
          /* client disconnected */
        }
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
