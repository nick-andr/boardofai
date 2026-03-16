'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface ConversationItem {
  id: string
  title: string | null
  updatedAt: string | Date
  modelId?: string | null
  parentId?: string | null
  children?: ConversationItem[]
}

export default function ChatHistory() {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/conversations')
        if (response.ok) {
          const data = await response.json()
          setConversations(data)
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
      }
    }
    fetchConversations()
  }, [])

  useEffect(() => {
    if (!openMenuId) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [openMenuId])

  const handleMenuToggle = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenMenuId((prev) => (prev === id ? null : id))
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenMenuId(null)
    const confirmed = window.confirm('Delete this conversation?')
    if (!confirmed) return

    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (res.ok || res.status === 404) {
        setConversations((prev) => prev.filter((c) => c.id !== id))
      } else {
        const body = await res.text()
        console.error('Failed to delete conversation', res.status, body)
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
    }
  }

  const openRename = (conversation: ConversationItem, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpenMenuId(null)
    setRenameId(conversation.id)
    setRenameValue(conversation.title || '')
  }

  const closeRename = () => {
    setRenameId(null)
    setRenameValue('')
  }

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (renameId == null) return
    const newTitle = renameValue.trim()
    try {
      const res = await fetch(`/api/conversations/${renameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle || null }),
      })
      if (res.ok) {
        const updated = await res.json()
        setConversations((prev) =>
          prev.map((c) => (c.id === renameId ? { ...c, title: updated.title } : c)),
        )
        closeRename()
      } else {
        const body = await res.text()
        console.error('Failed to rename conversation', res.status, body)
      }
    } catch (error) {
      console.error('Error renaming conversation:', error)
    }
  }

  return (
    <>
      <ul className="space-y-2">
        {conversations.map((conversation) => (
          <li key={conversation.id}>
            <Link
              href={`/chat/${conversation.id}`}
              className="group flex items-center justify-between rounded px-2 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <div className="flex-1 min-w-0 px-1">
                <div className="truncate text-sm">
                  {conversation.title || 'Untitled conversation'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(conversation.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="relative ml-2" ref={openMenuId === conversation.id ? menuRef : undefined}>
                <button
                  type="button"
                  onClick={(e) => handleMenuToggle(conversation.id, e)}
                  className="inline-flex items-center justify-center rounded p-1 text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                  aria-label="Conversation options"
                  aria-expanded={openMenuId === conversation.id}
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="6" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="18" r="1.5" />
                  </svg>
                </button>
                {openMenuId === conversation.id && (
                  <div
                    className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-gray-600 py-1 shadow-lg"
                    style={{ backgroundColor: '#0a0a0a' }}
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => openRename(conversation, e)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => handleDelete(conversation.id, e)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-gray-800 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </Link>
            {conversation.children && conversation.children.length > 0 && (
              <ul className="mt-1 ml-4 space-y-1">
                {conversation.children.map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/chat/${child.id}`}
                      className="group flex items-center justify-between rounded px-2 py-1 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      <div className="flex-1 min-w-0 px-1">
                        <div className="truncate text-sm">
                          {child.title || 'Talk 1:1'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {new Date(child.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>

      {renameId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          aria-modal="true"
          role="dialog"
          aria-labelledby="rename-dialog-title"
          onClick={closeRename}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-xl border border-gray-600 bg-gray-800 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="rename-dialog-title" className="text-lg font-semibold text-white mb-3">
              Rename conversation
            </h2>
            <form onSubmit={handleRenameSubmit} className="space-y-3">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Conversation title"
                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-500"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={closeRename}
                  className="rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
