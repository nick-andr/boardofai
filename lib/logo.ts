// Logo path for each model. Logos live in public/logos/ as {slug}.svg (e.g. openai.svg).

const PROVIDER_SLUG: Record<string, string> = {
  'meta-llama': 'meta',
  'x-ai': 'x-ai',
  'mistralai': 'mistralai',
  'anthropic': 'anthropic',
  'openai': 'openai',
  'google': 'google',
  'deepseek': 'deepseek',
}

/**
 * Returns the public path to the logo for a model (e.g. /logos/openai.svg).
 * Use model.id (e.g. "openai/gpt-4o") to get the provider slug.
 */
export function getModelLogoPath(modelId: string): string {
  const provider = modelId.split('/')[0] || ''
  const slug = PROVIDER_SLUG[provider] ?? provider
  return `/logos/${slug}.svg`
}
