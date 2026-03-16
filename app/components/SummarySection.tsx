'use client'

import { getModelLogoPath } from '@/lib/logo'
import { DEFAULT_MODELS } from '@/lib/models'
import ReactMarkdown from 'react-markdown'

interface Props {
  summary: {
    content: string
  }
}

const MODEL_NAMES_SORTED = [...DEFAULT_MODELS]
  .map((m) => m.name)
  .sort((a, b) => b.length - a.length)

const NAME_TO_ID = new Map(DEFAULT_MODELS.map((m) => [m.name, m.id]))

function parseClusterLine(paragraph: string): { modelIds: string[]; modelNames: string[]; rest: string } | null {
  const trimmed = paragraph.trim()
  const m = trimmed.match(/^\[([^\]]+)\]\s*([\s\S]*)$/)
  if (!m) return null

  const namesRaw = m[1].split(',').map((s) => s.trim()).filter(Boolean)
  const modelIds: string[] = []
  const modelNames: string[] = []

  for (const name of namesRaw) {
    const id = NAME_TO_ID.get(name)
    if (id) {
      modelIds.push(id)
      modelNames.push(name)
    }
  }

  if (modelIds.length === 0) return null

  return {
    modelIds,
    modelNames,
    rest: (m[2] ?? '').trim(),
  }
}

function matchModelParagraph(paragraph: string): { modelId: string; label: string; rest: string } | null {
  const trimmed = paragraph.trim()
  for (const name of MODEL_NAMES_SORTED) {
    const escaped = escapeRe(name)
    const patterns = [
      new RegExp(`^\\s*\\*\\*\\s*${escaped}\\s*\\*\\*\\s*:\\s*([\\s\\S]*)`, 'i'),
      new RegExp(`^\\s*\\*\\*\\s*${escaped}\\s*\\*\\*\\s+([\\s\\S]*)`, 'i'),
      new RegExp(`^\\s*${escaped}\\s*:\\s*([\\s\\S]*)`, 'i'),
    ]
    for (const re of patterns) {
      const m = trimmed.match(re)
      if (m) {
        const modelId = NAME_TO_ID.get(name)
        if (modelId) {
          return { modelId, label: name, rest: (m[1] ?? '').trim() }
        }
      }
    }
  }
  return null
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 text-gray-700">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = className?.includes('language-')
    return isBlock ? (
      <pre className="my-2 p-3 bg-gray-100 rounded-lg overflow-x-auto text-sm"><code>{children}</code></pre>
    ) : (
      <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm font-mono">{children}</code>
    )
  },
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="text-gray-700">{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-lg font-bold mt-2 mb-1 text-gray-900">{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-base font-bold mt-2 mb-1 text-gray-900">{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-bold mt-2 mb-1 text-gray-900">{children}</h3>,
  blockquote: ({ children }: { children?: React.ReactNode }) => <blockquote className="border-l-4 border-gray-300 pl-3 my-2 text-gray-600 italic">{children}</blockquote>,
}

export default function SummarySection({ summary }: Props) {
  const paragraphs = summary.content.split(/\n\n+/).filter(Boolean)

  return (
    <>
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Summary
      </h3>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-6">
        <div className="space-y-4">
          {paragraphs.map((para, i) => {
            const cluster = parseClusterLine(para)
            if (cluster) {
              return (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex -space-x-2">
                    {cluster.modelIds.map((modelId, idx) => (
                      <img
                        key={modelId + idx}
                        src={getModelLogoPath(modelId)}
                        alt=""
                        title={cluster.modelNames[idx]}
                        className="w-6 h-6 rounded-full border border-white bg-white object-contain flex-shrink-0"
                      />
                    ))}
                  </div>
                  <div className="min-w-0 text-gray-700">
                    <ReactMarkdown components={markdownComponents}>{cluster.rest}</ReactMarkdown>
                  </div>
                </div>
              )
            }

            const matched = matchModelParagraph(para)
            if (matched) {
              return (
                <div key={i} className="flex gap-3">
                  <img
                    src={getModelLogoPath(matched.modelId)}
                    alt=""
                    className="w-6 h-6 object-contain flex-shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 text-gray-700">
                    <span className="font-semibold text-gray-900">{matched.label}:</span>
                    {matched.rest ? (
                      <div className="ml-1">
                        <ReactMarkdown components={markdownComponents}>{matched.rest}</ReactMarkdown>
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            }
            return (
              <div key={i} className="text-gray-700 leading-relaxed">
                <ReactMarkdown components={markdownComponents}>{para}</ReactMarkdown>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
