// Model catalog configuration
// Models can be enabled/disabled here
// Model IDs should match OpenRouter model identifiers

export interface ModelConfig {
  id: string
  name: string
  provider: string
  enabled: boolean
  description?: string
}

export const DEFAULT_MODELS: ModelConfig[] = [
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    enabled: true,
    description: 'Most capable GPT-4 model',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    enabled: true,
    description: 'Faster and cheaper GPT-4 variant',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    enabled: true,
    description: 'Anthropic\'s most capable model',
  },
  {
    id: 'anthropic/claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    enabled: true,
    description: 'Anthropic\'s flagship model',
  },
  {
    id: 'google/gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    enabled: true,
    description: 'Google\'s advanced model',
  },
  {
    id: 'meta-llama/llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'Meta',
    enabled: true,
    description: 'Open-source model from Meta',
  },
]

export function getEnabledModels(): ModelConfig[] {
  return DEFAULT_MODELS.filter((model) => model.enabled)
}

export function getModelById(id: string): ModelConfig | undefined {
  return DEFAULT_MODELS.find((model) => model.id === id)
}
