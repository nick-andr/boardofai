'use client'

import { useEffect } from 'react'
import { getModelLogoPath } from '@/lib/logo'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'katex/dist/katex.min.css'
import 'highlight.js/styles/github.min.css'

/**
 * Normalize non-standard LaTeX delimiters to the $...$ / $$...$$ format
 * that remark-math understands. Only performs unambiguous, standard mappings:
 *   \( \)  →  $ $    (standard LaTeX inline math)
 *   \[ \]  →  $$ $$  (standard LaTeX display math)
 *   \boxed{...} outside $ → wrapped in $
 */
function wrapBareLatex(content: string): string {
  let out = content

  // Protect \left(...), \right(...), \left[...], \right[...] from delimiter conversion
  const placeholders: [string, string][] = [
    ['\\left(', '\x00LP\x00'], ['\\right)', '\x00RP\x00'],
    ['\\left[', '\x00LB\x00'], ['\\right]', '\x00RB\x00'],
  ]
  for (const [token, ph] of placeholders) out = out.replaceAll(token, ph)

  // \( \) → $ $ (standard inline math delimiter equivalence)
  out = out.replace(/\\\(/g, '$').replace(/\\\)/g, '$')
  // \[ \] → $$ $$ (standard display math delimiter equivalence)
  out = out.replace(/\\\[/g, '\n\n$$').replace(/\\\]/g, '$$\n\n')

  // Restore protected sequences
  for (const [token, ph] of placeholders) out = out.replaceAll(ph, token)

  // Wrap bare \boxed{...} in $ if not already inside math delimiters
  out = wrapBoxed(out)

  return out
}

function wrapBoxed(content: string): string {
  const parts: string[] = []
  let i = 0
  while (i < content.length) {
    const start = content.indexOf('\\boxed{', i)
    if (start === -1) {
      parts.push(content.slice(i))
      break
    }
    parts.push(content.slice(i, start))
    let depth = 1
    let j = start + 7
    while (j < content.length && depth > 0) {
      if (content[j] === '\\') {
        j += 2
        continue
      }
      if (content[j] === '{') depth++
      else if (content[j] === '}') depth--
      j++
    }
    const match = content.slice(start, j)
    parts.push(match.startsWith('$') ? match : `$${match}$`)
    i = j
  }
  return parts.join('')
}

interface Props {
  response: {
    modelId: string
    modelName: string
    content: string
    success: boolean
    error?: string
  }
  index: number
}

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic">{children}</em>,
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = className?.includes('language-') || className?.includes('hljs')
    return isBlock ? (
      <pre className="my-2 p-3 bg-gray-100 rounded-lg overflow-x-auto text-sm border border-gray-200">
        <code className={className ?? ''}>{children}</code>
      </pre>
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
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 underline hover:text-blue-800"
    >
      {children}
    </a>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-gray-100">{children}</thead>,
  tbody: ({ children }: { children?: React.ReactNode }) => <tbody className="divide-y divide-gray-200 bg-white">{children}</tbody>,
  tr: ({ children }: { children?: React.ReactNode }) => <tr className="divide-x divide-gray-200">{children}</tr>,
  th: ({ children }: { children?: React.ReactNode }) => <th className="px-3 py-2 text-left font-semibold text-gray-900">{children}</th>,
  td: ({ children }: { children?: React.ReactNode }) => <td className="px-3 py-2 text-gray-700">{children}</td>,
  hr: () => <hr className="my-3 border-gray-200" />,
  del: ({ children }: { children?: React.ReactNode }) => <del className="text-gray-500">{children}</del>,
}

export default function ModelResponse({ response }: Props) {
  useEffect(() => {
    if (!response.success && response.error) {
      console.warn(`[Board] ${response.modelName} error:`, response.error)
    }
  }, [response.success, response.error, response.modelName])

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
            response.success
              ? 'bg-green-500'
              : 'bg-red-500'
          }`} />
          <img
            src={getModelLogoPath(response.modelId)}
            alt=""
            className="w-6 h-6 object-contain flex-shrink-0"
          />
          <h4 className="font-semibold text-gray-900">
            {response.modelName}
          </h4>
        </div>
      </div>

      {response.success ? (
        <div className="mt-3 text-gray-700 prose prose-sm max-w-none [&_.katex]:text-base [&_.katex-display]:text-lg [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[[rehypeKatex, { strict: 'ignore' }], [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
            components={markdownComponents}
          >
            {wrapBareLatex(response.content)}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-red-600" data-error={response.error ?? undefined}>
            There was an error. Please try again.
          </p>
        </div>
      )}
    </div>
  )
}
