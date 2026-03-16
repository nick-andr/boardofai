'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'

interface Props {
  prompt: string
  setPrompt: (value: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  disabled?: boolean
  powerMode?: boolean
}

const MAX_HEIGHT = 120

export default function ChatInput({ prompt, setPrompt, onSubmit, disabled, powerMode }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const sh = el.scrollHeight
    const h = Math.min(MAX_HEIGHT, Math.max(44, sh))
    el.style.height = `${h}px`
    el.style.overflowY = sh > MAX_HEIGHT ? 'auto' : 'hidden'
  }, [prompt])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && prompt.trim()) onSubmit(e as any)
    }
  }

  return (
    <form
        onSubmit={onSubmit}
        className={`flex items-center rounded-xl border bg-white overflow-hidden focus-within:ring-2 ${
          powerMode
            ? 'border-orange-500 focus-within:ring-orange-500 focus-within:border-orange-500'
            : 'border-[#0a0a0a] focus-within:ring-[#0a0a0a] focus-within:border-[#0a0a0a]'
        }`}
      >
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Type here..."
        rows={1}
        className="flex-1 min-h-[2.75rem] resize-none border-0 px-4 text-gray-900 placeholder:text-gray-600 placeholder:italic focus:outline-none focus:ring-0 disabled:bg-gray-100 box-border leading-6"
        style={{ paddingTop: '10px', paddingBottom: '10px' }}
      />
      <div className="shrink-0 flex items-center ml-2" style={{ paddingRight: '0.5rem' }}>
        <button
        type="submit"
        disabled={disabled || !prompt.trim()}
        className="p-3 rounded-full bg-[#0a0a0a] text-white cursor-pointer hover:bg-[#1a1a1a] hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all shrink-0 flex items-center justify-center"
        title="Send"
        aria-label="Send"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6" aria-hidden>
          <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
        </svg>
      </button>
      </div>
    </form>
  )
}
