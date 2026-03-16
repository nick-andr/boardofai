// OpenRouter API integration
// This module handles all LLM interactions via OpenRouter

export interface OpenRouterResponse {
  id: string
  model: string
  created: number
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ModelRequest {
  modelId: string
  prompt: string
}

export interface ModelResult {
  modelId: string
  modelName: string
  content: string
  success: boolean
  error?: string
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }

/** Call model with messages. Single string is treated as one user message. */
export async function callModel(
  modelId: string,
  messagesOrPrompt: ChatMessage[] | string
): Promise<ModelResult> {
  const messages: ChatMessage[] =
    typeof messagesOrPrompt === 'string'
      ? [{ role: 'user', content: messagesOrPrompt }]
      : messagesOrPrompt

  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set')
  }

  // Debug: Check if API key is still placeholder
  if (apiKey === 'your_openrouter_api_key_here' || apiKey.includes('your_openrouter')) {
    console.error('⚠️ OPENROUTER_API_KEY appears to be a placeholder. Please set your actual API key in .env file')
    throw new Error('OPENROUTER_API_KEY is set to placeholder value. Please update .env with your actual API key.')
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'BoardOfAI',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
    }

    const data: OpenRouterResponse = await response.json()

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No choices returned from OpenRouter')
    }

    const content = data.choices[0].message.content

    return {
      modelId,
      modelName: modelId, // Will be replaced with actual name from catalog
      content,
      success: true,
    }
  } catch (error) {
    return {
      modelId,
      modelName: modelId,
      content: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function callModelsInParallel(
  modelIds: string[],
  prompt: string
): Promise<ModelResult[]> {
  const promises = modelIds.map((modelId) => callModel(modelId, prompt))
  return Promise.all(promises)
}
