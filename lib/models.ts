// Model catalog: one general/latest model per provider (order: GPT, Claude, Gemini, Llama, Grok, Mistral, Deepseek)

export interface ModelConfig {
  /** Brand identifier used in the app (and in the DB), e.g. "openai", "anthropic". */
  id: string
  /** Human-friendly display name, e.g. "ChatGPT", "Claude". */
  name: string
  /** Provider display name */
  provider: string
  enabled: boolean
  description?: string
  /** OpenRouter model id used when Power mode is OFF (fast/cheaper). */
  fastModelId: string
  /** OpenRouter model id used when Power mode is ON (latest/strongest). */
  powerModelId: string
}

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'openai',
    name: 'ChatGPT',
    provider: 'OpenAI',
    enabled: true,
    description: 'OpenAI general-purpose model',
    fastModelId: 'openai/gpt-5.3-chat',
    powerModelId: 'openai/gpt-5.4',
  },
  {
    id: 'anthropic',
    name: 'Claude',
    provider: 'Anthropic',
    enabled: true,
    description: 'Anthropic Claude model',
    fastModelId: 'anthropic/claude-sonnet-4.6',
    powerModelId: 'anthropic/claude-opus-4.6',
  },
  {
    id: 'google',
    name: 'Gemini',
    provider: 'Google',
    enabled: true,
    description: 'Google Gemini model',
    fastModelId: 'google/gemini-2.5-flash',
    powerModelId: 'google/gemini-2.5-pro',
  },
  {
    id: 'meta-llama',
    name: 'Llama',
    provider: 'Meta',
    enabled: true,
    description: 'Meta Llama model',
    fastModelId: 'meta-llama/llama-3.1-8b-instruct',
    powerModelId: 'meta-llama/llama-4-maverick',
  },
  {
    id: 'x-ai',
    name: 'Grok',
    provider: 'xAI',
    enabled: true,
    description: 'xAI Grok model',
    fastModelId: 'x-ai/grok-4-fast',
    powerModelId: 'x-ai/grok-4',
  },
  {
    id: 'mistralai',
    name: 'Mistral',
    provider: 'Mistral',
    enabled: true,
    description: 'Mistral model',
    fastModelId: 'mistralai/mistral-small-3.2-24b-instruct',
    powerModelId: 'mistralai/mistral-large',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'DeepSeek',
    enabled: true,
    description: 'DeepSeek model',
    fastModelId: 'deepseek/deepseek-chat-v3',
    powerModelId: 'deepseek/deepseek-v3.2',
  },
]

export function getEnabledModels(): ModelConfig[] {
  return DEFAULT_MODELS.filter((model) => model.enabled)
}

export function getModelById(id: string): ModelConfig | undefined {
  return DEFAULT_MODELS.find((model) => model.id === id)
}

/** Return models by ids in the order of DEFAULT_MODELS; skips unknown ids. */
export function getModelsByIds(ids: string[]): ModelConfig[] {
  const byId = new Map(DEFAULT_MODELS.map((m) => [m.id, m]))
  const result: ModelConfig[] = []
  for (const id of ids) {
    const model = byId.get(id)
    if (model && model.enabled) result.push(model)
  }
  return result
}
