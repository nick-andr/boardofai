'use client'

import { useState, useEffect } from 'react'

interface ModelItem {
  id: string
  name: string
}

interface Props {
  models?: ModelItem[]
  modelCount?: number
  completedIds?: Set<string>
  /** When true, all models have responded and we're waiting for the summary. Show "Result is being prepared." cycling. */
  allModelsDone?: boolean
}

/** Short display name for loading/table view: ChatGPT, Gemini, Llama, Claude, etc. */
function shortModelName(fullName: string): string {
  const n = fullName.toLowerCase()
  if (n.includes('gpt') || n.includes('chatgpt')) return 'ChatGPT'
  if (n.includes('gemini')) return 'Gemini'
  if (n.includes('llama')) return 'Llama'
  if (n.includes('claude')) return 'Claude'
  if (n.includes('grok')) return 'Grok'
  // Fallback: first word (e.g. "Mistral" from "Mistral 7B")
  const first = fullName.trim().split(/\s+/)[0]
  return first || fullName
}

/** Path to model logo in public/logos (by short name). Unknown models get no path. */
const LOGO_PATHS: Record<string, string> = {
  chatgpt: '/logos/openai.svg',
  gemini: '/logos/google.svg',
  llama: '/logos/meta.svg',
  claude: '/logos/anthropic.svg',
  mistral: '/logos/mistralai.svg',
  deepseek: '/logos/deepseek.svg',
  grok: '/logos/x-ai.svg',
}

function getModelIconPath(modelName: string): string | undefined {
  const short = shortModelName(modelName)
  const key = short.toLowerCase().replace(/\s+/g, '')
  return LOGO_PATHS[key] ?? LOGO_PATHS[short.toLowerCase()]
}

// Oval table: actual rendered size when maxWidth:420 applies (stage 560px)
// → 75% wide, 62.5% tall → semi-major a=37.5%, semi-minor b=31.25%.
// Distance from center to oval edge at angle θ: r = ab/sqrt(b²cos²θ + a²sin²θ)
// Avatar at r + margin (small margin).
const OVAL_A = 37.5
const OVAL_B = 31.25
const MARGIN = 1.5

function getRadiusAtAngle(angleRad: number): number {
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const denom = Math.sqrt(OVAL_B * OVAL_B * cos * cos + OVAL_A * OVAL_A * sin * sin)
  return denom > 0 ? (OVAL_A * OVAL_B) / denom + MARGIN : OVAL_A + MARGIN
}

export default function LoadingAnimation({
  models: modelList,
  modelCount = 5,
  completedIds = new Set(),
  allModelsDone = false,
}: Props) {
  const count = modelList?.length ?? modelCount
  const [activeIndex, setActiveIndex] = useState(0)
  const [singlePulseOn, setSinglePulseOn] = useState(true)
  const [preparingDots, setPreparingDots] = useState(0)

  // Pending = not yet completed. Pulse only over pending so rhythm stays at 500ms.
  const pendingIndices = Array.from({ length: count }, (_, i) => i).filter((i) => {
    const id = modelList?.[i]?.id
    return !id || !completedIds.has(id)
  })
  const pendingCount = pendingIndices.length

  // When multiple pending: step through them every 500ms. When single: toggle pulse on/off every 500ms.
  useEffect(() => {
    if (pendingCount <= 0) return
    const interval = setInterval(() => {
      if (pendingCount === 1) {
        setSinglePulseOn((prev) => !prev)
      } else {
        setActiveIndex((prev) => (prev + 1) % pendingCount)
      }
    }, 500)
    return () => clearInterval(interval)
  }, [pendingCount])

  useEffect(() => {
    if (!allModelsDone) return
    const interval = setInterval(() => {
      setPreparingDots((prev) => (prev + 1) % 3)
    }, 500)
    return () => clearInterval(interval)
  }, [allModelsDone])

  const centerX = 50
  const centerY = 50
  const startAngle = -Math.PI / 2

  return (
    <div className="flex flex-col items-center justify-center py-12 w-full">
      <div className="mb-6 text-lg font-semibold text-gray-700">
        Models are thinking...
      </div>

      {/* Stage: table dominates; oval from top view */}
      <div
        className="relative flex items-center justify-center mx-auto w-full"
        style={{
          width: 'min(100%, 560px)',
          aspectRatio: '1',
          maxHeight: 520,
        }}
      >
        {/* Table: oval from top view */}
        <img
          src="/table.svg"
          alt=""
          role="presentation"
          className="absolute opacity-90"
          style={{
            width: '85%',
            aspectRatio: '1.2',
            maxWidth: 420,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            objectFit: 'contain',
            background: 'transparent',
          }}
        />

        {/* Models around oval table—positioned on ellipse + small margin (1–7 models) */}
        {count === 1 ? (
          <div
            className="absolute flex flex-col items-center transition-all duration-500"
            style={{
              left: '50%',
              top: `${50 - OVAL_B - MARGIN}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <AvatarCircle
              model={modelList?.[0]}
              completedIds={completedIds}
              isActive={
              pendingCount > 0 &&
              (pendingCount === 1 ? singlePulseOn : pendingIndices[activeIndex] === 0)
            }
            />
            <div
              className="absolute top-full mt-1 text-xs text-gray-700 whitespace-nowrap max-w-[88px] truncate text-center"
              title={modelList?.[0]?.name ?? 'Model 1'}
            >
              {modelList?.[0]?.name ? shortModelName(modelList[0].name) : 'Model 1'}
            </div>
          </div>
        ) : (
          Array.from({ length: count }).map((_, i) => {
            const model = modelList?.[i]
            const id = model?.id
            const name = model?.name ?? `Model ${i + 1}`
            const displayName = model?.name ? shortModelName(model.name) : `Model ${i + 1}`
            const isCompleted = id ? completedIds.has(id) : false
            const isActive =
              pendingCount > 0 &&
              (pendingCount === 1 ? singlePulseOn && i === pendingIndices[0] : pendingIndices[activeIndex] === i)
            const angle = startAngle + (i * 2 * Math.PI) / count
            const r = getRadiusAtAngle(angle)
            const x = centerX + r * Math.cos(angle)
            const y = centerY + r * Math.sin(angle)

            return (
              <div
                key={id ?? i}
                className="absolute flex flex-col items-center transition-all duration-500"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <AvatarCircle
                  model={model}
                  completedIds={completedIds}
                  isActive={isActive}
                  id={id}
                />
                <div
                  className="absolute top-full mt-1 text-xs text-gray-700 whitespace-nowrap max-w-[88px] truncate text-center"
                  title={name}
                >
                  {displayName}
                </div>
              </div>
            )
          })
        )}
      </div>

      {allModelsDone && (
        <p className="mt-8 text-sm text-gray-500">
          Result is being prepared{'.'.repeat(preparingDots + 1)}
        </p>
      )}
    </div>
  )
}

function AvatarCircle({
  model,
  completedIds,
  isActive,
  id,
}: {
  model?: ModelItem
  completedIds: Set<string>
  isActive: boolean
  id?: string
}) {
  const isCompleted = id ? completedIds.has(id) : false
  const iconPath = model?.name ? getModelIconPath(model.name) : undefined
  const [iconError, setIconError] = useState(false)
  const showIcon = iconPath && !iconError

  return (
    <div
      className={`w-12 h-12 rounded-full border-4 transition-all duration-300 flex items-center justify-center flex-shrink-0 overflow-hidden ${
        isCompleted
          ? 'border-green-400 bg-green-100 shadow-md'
          : isActive
            ? 'border-blue-500 bg-blue-100 shadow-lg'
            : 'border-gray-300 bg-gray-100'
      }`}
    >
      {/* Option B: when completed, icon as faded background + green check on top */}
      {showIcon && (
        <img
          src={iconPath}
          alt=""
          role="presentation"
          className={`absolute inset-0 w-full h-full object-contain transition-opacity ${
            isCompleted ? 'opacity-50' : 'opacity-90'
          }`}
          style={{ padding: '20%' }}
          onError={() => setIconError(true)}
        />
      )}
      {isCompleted ? (
        <svg
          className="w-8 h-8 text-green-600 relative z-10 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        !showIcon && (
          <div
            className={`w-6 h-6 rounded-full ${
              isActive ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
            }`}
          />
        )
      )}
    </div>
  )
}
