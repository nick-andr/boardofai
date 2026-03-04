// LLM Orchestration Layer
// This module handles parallel execution of model requests
// and manages the flow of responses

import { callModelsInParallel, ModelResult } from './openrouter'
import { getEnabledModels, getModelById, ModelConfig } from './models'
import { prisma } from './prisma'

export interface OrchestrationRequest {
  prompt: string
  modelCount: number
  conversationId?: string
}

export interface OrchestrationResponse {
  promptId: string
  conversationId: string
  results: ModelResult[]
}

export async function orchestrateModels(
  request: OrchestrationRequest
): Promise<OrchestrationResponse> {
  // Get enabled models
  const enabledModels = getEnabledModels()

  if (enabledModels.length === 0) {
    throw new Error('No enabled models available')
  }

  // Select models based on requested count
  const selectedModels = enabledModels.slice(0, request.modelCount)
  const modelIds = selectedModels.map((m) => m.id)

  // Create or get conversation
  let conversationId = request.conversationId
  if (!conversationId) {
    const conversation = await prisma.conversation.create({
      data: {
        title: request.prompt.substring(0, 100),
      },
    })
    conversationId = conversation.id
  }

  // Create prompt record
  const prompt = await prisma.prompt.create({
    data: {
      conversationId,
      content: request.prompt,
      modelCount: request.modelCount,
    },
  })

  // Create pending response records
  const responseRecords = await Promise.all(
    selectedModels.map((model) =>
      prisma.modelResponse.create({
        data: {
          promptId: prompt.id,
          modelId: model.id,
          modelName: model.name,
          content: '', // Empty string for pending records
          status: 'pending',
        },
      })
    )
  )

  // Call models in parallel
  const results = await callModelsInParallel(modelIds, request.prompt)

  // Update response records with results
  const updatePromises = results.map((result, index) => {
    const record = responseRecords[index]
    const modelConfig = getModelById(result.modelId)

    return prisma.modelResponse.update({
      where: { id: record.id },
      data: {
        content: result.content,
        status: result.success ? 'completed' : 'failed',
        error: result.error || null,
        completedAt: result.success ? new Date() : null,
        modelName: modelConfig?.name || result.modelName,
      },
    })
  })

  await Promise.all(updatePromises)

  return {
    promptId: prompt.id,
    conversationId,
    results: results.map((result, index) => ({
      ...result,
      modelName: selectedModels[index]?.name || result.modelName,
    })),
  }
}
