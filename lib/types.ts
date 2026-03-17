// Shared application-wide TypeScript types

export interface ModelResult {
  modelId: string
  modelName: string
  content: string
  success: boolean
  error?: string
}

