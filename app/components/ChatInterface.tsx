'use client'

import { useState, useEffect, useRef } from 'react'
import { type ModelConfig } from '@/lib/models'
import type { ModelResult } from '@/lib/types'
import ChatInput from './ChatInput'
import LoadingAnimation from './LoadingAnimation'
import ResultsDisplay from './ResultsDisplay'
import SessionSetup from './SessionSetup'

interface Summary {
  content: string
  stances?: Record<string, string>
  viewpoints?: Array<{
    title: string
    description: string
    responseIndices: number[]
  }>
}

export interface Turn {
  promptId?: string
  prompt: string
  responses: ModelResult[]
  summary: Summary | null
}

interface ChatInterfaceProps {
  initialConversationId?: string
  /** When opening an existing chat, pass all turns (prompt + responses + summary per turn). */
  initialTurns?: Turn[]
  /** Legacy: single turn when opening a chat (converted to initialTurns internally). */
  initialPromptContent?: string
  initialResponses?: ModelResult[]
  initialSummary?: Summary | null
  /** For nested conversations: id of the parent board conversation, if any. */
  parentConversationId?: string | null
  /** For 1:1 child conversations: the bound model id, if any. */
  boundModelId?: string | null
  /** Optional parent title for breadcrumbs. */
  parentTitle?: string | null
}

function defaultTurnsFromLegacy(
  promptContent?: string,
  responses?: ModelResult[],
  summary?: Summary | null
): Turn[] {
  if (!promptContent && (!responses || responses.length === 0)) return []
  return [
    {
      prompt: promptContent ?? '',
      responses: responses ?? [],
      summary: summary ?? null,
    },
  ]
}

function ensureTurnHasPromptId(turn: Turn): turn is Turn & { promptId: string } {
  return typeof turn.promptId === 'string'
}

export default function ChatInterface({
  initialConversationId,
  initialTurns: initialTurnsProp,
  initialPromptContent,
  initialResponses,
  initialSummary,
  parentConversationId = null,
  boundModelId = null,
  parentTitle = null,
}: ChatInterfaceProps = {}) {
  const initialTurns =
    initialTurnsProp ?? defaultTurnsFromLegacy(initialPromptContent, initialResponses, initialSummary)

  const [prompt, setPrompt] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [turns, setTurns] = useState<Turn[]>(initialTurns)
  const [models, setModels] = useState<ModelConfig[]>([])
  const [expertCount, setExpertCount] = useState(3)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [powerMode, setPowerMode] = useState(false)
  const [waitingForModels, setWaitingForModels] = useState<Array<{ id: string; name: string }>>([])
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId ?? null)
  const [summaryLoadingPromptIds, setSummaryLoadingPromptIds] = useState<Set<string>>(new Set())
  const conversationIdRef = useRef<string | null>(initialConversationId ?? null)
  const scrollOnNextRenderRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const startTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    conversationIdRef.current = conversationId
  }, [conversationId])

  useEffect(() => {
    if (initialConversationId) {
      setConversationId(initialConversationId)
      conversationIdRef.current = initialConversationId
    }
  }, [initialConversationId])

  useEffect(() => {
    const el = startTextareaRef.current
    if (!el) return
    const MAX_HEIGHT = 260
    el.style.height = 'auto'
    const scrollHeight = el.scrollHeight
    const height = Math.min(MAX_HEIGHT, Math.max(40, scrollHeight))
    el.style.height = `${height}px`
    el.style.overflowY = scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [prompt])

  useEffect(() => {
    fetch('/api/models')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: ModelConfig[]) => {
        setModels(data)
        const ids = data.slice(0, expertCount).map((m) => m.id)
        setSelectedIds(new Set(ids))
      })
      .catch(() => setModels([]))
  }, [])

  const handleExpertCountChange = (n: number) => {
    setExpertCount(n)
    const ids = models.slice(0, n).map((m) => m.id)
    setSelectedIds(new Set(ids))
  }

  const toggleModel = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    if (next.size === 0) return
    setSelectedIds(next)
    setExpertCount(Math.max(1, Math.min(7, next.size)))
  }

  useEffect(() => {
    if (!scrollOnNextRenderRef.current) return
    const container = scrollContainerRef.current
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
    }
    scrollOnNextRenderRef.current = false
  }, [turns])

  // Backfill missing summaries when loading a conversation (e.g. after closing tab during stream). Skip in child threads.
  const requestedSummaryRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (boundModelId) return
    turns.forEach((turn, index) => {
      if (!ensureTurnHasPromptId(turn) || turn.responses.length === 0) return
      // Never backfill the currently streaming turn; let the server completion path handle it.
      const isLastTurn = index === turns.length - 1
      if (isLastTurn && isSubmitting) return
      // If this turn already has stances, no need to request again.
      if (turn.summary && turn.summary.stances) return
      if (requestedSummaryRef.current.has(turn.promptId)) return
      requestedSummaryRef.current.add(turn.promptId)
      const promptId = turn.promptId
      setSummaryLoadingPromptIds((prev) => new Set(prev).add(promptId))
      fetch(`/api/prompts/${promptId}`, { method: 'POST' })
        .then((res) => (res.ok ? res.json() : { summary: null }))
        .then((data: { summary?: { content: string; stances?: Record<string, string> | null } | null }) => {
          setTurns((prev) => {
            const next = [...prev]
            const i = next.findIndex((t) => t.promptId === promptId)
            if (i !== -1) {
              const t = next[i]
              next[i] = {
                ...t,
                summary: data.summary
                  ? {
                      content: data.summary.content,
                      stances: data.summary.stances ?? undefined,
                    }
                  : null,
              }
            }
            return next
          })
        })
        .catch(() => {})
        .finally(() => {
          setSummaryLoadingPromptIds((prev) => {
            const next = new Set(prev)
            next.delete(promptId)
            return next
          })
        })
    })
  }, [turns, boundModelId, isSubmitting])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!prompt.trim()) return

    // Determine which models to display as "active" for this turn.
    // For 1:1 child conversations, always use the bound model id.
    const selectedModelIds =
      boundModelId != null
        ? [boundModelId]
        : models.filter((m) => selectedIds.has(m.id)).map((m) => m.id)
    if (selectedModelIds.length === 0) return

    const userPrompt = prompt.trim()
    setPrompt('')
    setIsSubmitting(true)
    scrollOnNextRenderRef.current = true
    setTurns((prev) => [...prev, { prompt: userPrompt, responses: [], summary: null }])
    const selected =
      boundModelId != null
        ? models
            .filter((m) => m.id === boundModelId)
            .map((m) => ({ id: m.id, name: m.name }))
        : models
            .filter((m) => selectedIds.has(m.id))
            .map((m) => ({ id: m.id, name: m.name }))
    setWaitingForModels(selected)

    try {
      const currentConversationId = conversationIdRef.current || undefined
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userPrompt,
          modelCount: expertCount,
          selectedModelIds,
          powerMode,
          ...(currentConversationId && { conversationId: currentConversationId }),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.substring(6))
            if (data.type === 'conversation' && data.conversationId) {
              setConversationId(data.conversationId)
              conversationIdRef.current = data.conversationId
            } else if (data.type === 'models_started' && Array.isArray(data.models)) {
              setWaitingForModels(
                data.models.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name }))
              )
            } else if (data.type === 'prompt' && data.promptId) {
              setTurns((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last) next[next.length - 1] = { ...last, promptId: data.promptId }
                return next
              })
            } else if (data.type === 'model_completed') {
              setTurns((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                next[next.length - 1] = {
                  ...last,
                  responses: [
                    ...last.responses,
                    {
                      modelId: data.modelId,
                      modelName: data.modelName,
                      content: data.content,
                      success: data.success,
                      error: data.error,
                    },
                  ],
                }
                return next
              })
            } else if (data.type === 'model_failed') {
              setTurns((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                next[next.length - 1] = {
                  ...last,
                  responses: [
                    ...last.responses,
                    {
                      modelId: data.modelId,
                      modelName: data.modelName,
                      content: '',
                      success: false,
                      error: data.error,
                    },
                  ],
                }
                return next
              })
            } else if (data.type === 'summary_completed' && data.promptId) {
              const summaryRes = await fetch(`/api/prompts/${data.promptId}`, {
                method: 'POST',
              })
              if (summaryRes.ok) {
                const promptData = await summaryRes.json()
                setTurns((prev) => {
                  const next = [...prev]
                  const last = next[next.length - 1]
                  next[next.length - 1] = {
                    ...last,
                    summary: promptData.summary
                      ? {
                          content: promptData.summary.content,
                          stances: promptData.summary.stances ?? undefined,
                        }
                      : null,
                  }
                  return next
                })
              }
            } else if (data.type === 'complete') {
              setIsSubmitting(false)
              break
            } else if (data.type === 'error') {
              throw new Error(data.message || 'Unknown error')
            }
          } catch (_) {}
        }
      }
    } catch (error) {
      console.error('Error submitting prompt:', error)
      setIsSubmitting(false)
    }
  }

  const hasReplies = turns.length > 0

  const isBoardConversation = !boundModelId

  // Precompute, for board conversations only, the last turn index where each model responded successfully.
  const lastTurnIndexByModel = isBoardConversation
    ? (() => {
        const map = new Map<string, number>()
        turns.forEach((turn, index) => {
          turn.responses.forEach((r) => {
            if (r.success) {
              map.set(r.modelId, index)
            }
          })
        })
        return map
      })()
    : new Map<string, number>()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 flex flex-col">
        {!hasReplies ? (
          <div className="min-h-screen flex flex-col px-4 py-12">
            {/* Anchored prompt box */}
            <div className="flex justify-center mt-[15vh]">
              <div
                className="w-full max-w-xl bg-white rounded-2xl border shadow-sm p-6"
                style={{ borderColor: powerMode ? '#ea580c' : '#0a0a0a' }}
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <textarea
                    ref={startTextareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        if (prompt.trim()) handleSubmit(e as any)
                      }
                    }}
                    disabled={isSubmitting}
                    placeholder="Start typing here..."
                    rows={1}
                    className="w-full min-h-[2.5rem] resize-none rounded-xl border border-[#0a0a0a] px-4 py-3 text-gray-900 placeholder:text-gray-600 placeholder:italic focus:outline-none focus:ring-2 focus:ring-[#0a0a0a] focus:border-[#0a0a0a] disabled:bg-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !prompt.trim()}
                    className="w-full py-3 bg-[#0a0a0a] text-white rounded-xl font-semibold hover:bg-[#1a1a1a] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSubmitting ? 'Asking the board…' : 'Ask the board'}
                  </button>
                </form>
              </div>
            </div>

            {/* Config grows below the anchored prompt */}
            <div className="mt-6 flex justify-center">
              <div className="w-full max-w-xl">
                <SessionSetup
                  models={models}
                  expertCount={expertCount}
                  onExpertCountChange={handleExpertCountChange}
                  selectedIds={selectedIds}
                  onToggleModel={toggleModel}
                  powerMode={powerMode}
                  onPowerModeChange={setPowerMode}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full min-h-0 flex flex-col space-y-8 px-4">
            {turns.map((turn, index) => {
              // For this turn, compute per-model Talk 1:1 handlers (board conversations only).
              const talkHandlersForTurn: Record<string, () => void> = {}
              if (isBoardConversation) {
                turn.responses.forEach((r) => {
                  if (
                    r.success &&
                    lastTurnIndexByModel.get(r.modelId) === index
                  ) {
                    talkHandlersForTurn[r.modelId] = async () => {
                      try {
                        const res = await fetch(
                          `/api/conversations/${conversationIdRef.current}/continue-one-to-one`,
                          {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ modelId: r.modelId }),
                          },
                        )
                        if (!res.ok) {
                          console.error('Failed to create 1:1 conversation', await res.text())
                          return
                        }
                        const data = await res.json()
                        if (data.childId) {
                          window.open(`/chat/${data.childId}`, '_blank')
                        }
                      } catch (err) {
                        console.error('Error creating 1:1 conversation', err)
                      }
                    }
                  }
                })
              }

              return (
                <div key={index} className="w-full flex flex-col space-y-4 items-end">
                  <div className={`inline-flex bg-gray-300 border border-gray-500 rounded-xl p-4 max-w-2xl break-words self-end ${index > 0 ? 'mt-4' : ''}`}>
                    <p className="text-gray-900 whitespace-pre-wrap">{turn.prompt}</p>
                  </div>
                  {index === turns.length - 1 && isSubmitting && (
                    <LoadingAnimation
                      models={waitingForModels.length > 0 ? waitingForModels : undefined}
                      modelCount={waitingForModels.length || 3}
                      completedIds={new Set(turn.responses.map((r) => r.modelId))}
                      allModelsDone={
                        waitingForModels.length > 0 &&
                        turn.responses.length >= waitingForModels.length
                      }
                    />
                  )}
                  {(!isSubmitting || index < turns.length - 1) && turn.responses.length > 0 && (() => {
                    const compactMode = !!boundModelId || (isBoardConversation && turn.responses.length === 1)
                    return (
                      <ResultsDisplay
                        responses={turn.responses}
                        hideTitle={!!boundModelId}
                        summary={turn.summary}
                        summaryLoading={
                          !compactMode &&
                          !!turn.promptId &&
                          turn.summary == null &&
                          summaryLoadingPromptIds.has(turn.promptId)
                        }
                        isLoading={false}
                        talkOneToOneHandlersByModelId={compactMode ? undefined : talkHandlersForTurn}
                        alwaysExpanded={compactMode}
                        compactMode={compactMode}
                      />
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {hasReplies && (
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="w-full">
            <ChatInput
              prompt={prompt}
              setPrompt={setPrompt}
              onSubmit={handleSubmit}
              disabled={isSubmitting}
              powerMode={powerMode}
            />
          </div>
        </div>
      )}
    </div>
  )
}
