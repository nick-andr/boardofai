'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ChatHistory() {
  const [conversations, setConversations] = useState<Array<{
    id: string
    title: string
    updatedAt: Date
  }>>([])

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

  return (
    <ul className="space-y-2">
      {conversations.map((conversation) => (
        <li key={conversation.id}>
          <Link
            href={`/chat/${conversation.id}`}
            className="block px-3 py-2 rounded hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
          >
            <div className="truncate text-sm">
              {conversation.title}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(conversation.updatedAt).toLocaleDateString()}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
