'use client'

import { type ModelConfig } from '@/lib\models'
import { getModelLogoPath } from '@/lib/logo'

interface Props {
  models: ModelConfig[]
  expertCount: number
  onExpertCountChange: (n: number) => void
  selectedIds: Set<string>
  onToggleModel: (id: string) => void
  powerMode: boolean
  onPowerModeChange: (value: boolean) => void
}

const FRIENDLY_MODEL_NAMES: Record<string, string> = {
  // Fast models
  'openai/gpt-5.3-chat': 'GPT‑5.3',
  'anthropic/claude-sonnet-4.6': 'Sonnet 4.6',
  'google/gemini-2.5-flash': '2.5 Flash',
  'meta-llama/llama-3.1-8b-instruct': '3.1 8B',
  'x-ai/grok-4-fast': 'Grok 4 Fast',
  'mistralai/mistral-small-3.2-24b-instruct': 'Small 3.2 24B',
  'deepseek/deepseek-chat-v3': 'Chat v3',
  // Power models
  'openai/gpt-5.4': 'GPT‑5.4',
  'anthropic/claude-opus-4.6': 'Opus 4.6',
  'google/gemini-2.5-pro': '2.5 Pro',
  'meta-llama/llama-4-maverick': '4 Maverick',
  'x-ai/grok-4': 'Grok 4',
  'mistralai/mistral-large': 'Large',
  'deepseek/deepseek-v3.2': 'v3.2',
}

function getFriendlyModelName(modelId: string): string {
  return FRIENDLY_MODEL_NAMES[modelId] ?? modelId
}

export default function SessionSetup({
  models,
  expertCount,
  onExpertCountChange,
  selectedIds,
  onToggleModel,
  powerMode,
  onPowerModeChange,
}: Props) {
  return (
    <div className="mt-6 space-y-4">
      {/* Power mode toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onPowerModeChange(!powerMode)}
          className={`relative inline-flex items-center justify-between rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
            powerMode
              ? 'bg-orange-100 border-orange-500 text-orange-700'
              : 'bg-gray-100 border-gray-300 text-gray-700'
          }`}
        >
          <span className="flex items-center gap-1">
            <span>⚡ Power mode</span>
          </span>
          {/* Small help icon in top-right corner of the pill */}
          <span
            className="absolute -top-1 -right-1 inline-flex h-3 w-3 items-center justify-center rounded-full border border-current bg-white/90 text-[0.55rem]"
            title="Latest most advanced models, but more expensive and slower replies"
          >
            ?
          </span>
          <span
            className={`ml-2 relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
              powerMode ? 'bg-orange-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full bg-white transform transition-transform ${
                powerMode ? 'translate-x-3' : 'translate-x-1'
              }`}
            />
          </span>
        </button>
      </div>

      {/* Number of LLM models */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-900 whitespace-nowrap">
          Number of LLM models:
        </label>
        <select
          value={expertCount}
          onChange={(e) => onExpertCountChange(parseInt(e.target.value, 10))}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[4rem]"
        >
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Model checkboxes */}
      <div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-6 gap-y-3">
          {models.map((model) => (
            <label
              key={model.id}
              className="flex items-center gap-2 cursor-pointer text-sm text-gray-900"
            >
              <input
                type="checkbox"
                checked={selectedIds.has(model.id)}
                onChange={() => onToggleModel(model.id)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 flex-shrink-0"
              />
              <img
                src={getModelLogoPath(model.id)}
                alt=""
                className="w-5 h-5 object-contain flex-shrink-0"
              />
              <span>{model.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Friendly model names for this conversation (start page only) */}
      {selectedIds.size > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <ul className="text-sm text-gray-700 space-y-1.5">
            {models
              .filter((m) => selectedIds.has(m.id))
              .map((model) => {
                const underlyingId = powerMode ? model.powerModelId : model.fastModelId
                const friendly = getFriendlyModelName(underlyingId)
                return (
                  <li key={model.id} className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{model.name}</span>
                    <span className="text-gray-600">· {friendly}</span>
                  </li>
                )
              })}
          </ul>
        </div>
      )}
    </div>
  )
}
