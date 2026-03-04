'use client'

import { useState, KeyboardEvent } from 'react'

interface Props {
  prompt: string
  setPrompt: (value: string) => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  disabled?: boolean
}

export default function ChatInput({ prompt, setPrompt, onSubmit, disabled }: Props) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && prompt.trim()) {
        onSubmit(e as any)
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-4">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Enter your question for the board of AI directors..."
        className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        rows={3}
      />
      <button
        type="submit"
        disabled={disabled || !prompt.trim()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Submit
      </button>
    </form>
  )
}
