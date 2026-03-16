'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import ChatInterface from './ChatInterface'
import type { Turn } from './ChatInterface'

interface Props {
  conversationId: string
  initialTurns: Turn[]
}

export default function ConversationView({ conversationId, initialTurns }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('boardofai-sidebar-open')
    if (stored !== null) setSidebarOpen(stored === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('boardofai-sidebar-open', String(sidebarOpen))
  }, [sidebarOpen])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
        onNewChat={() => window.location.assign('/')}
      />
      <main
        className={`flex-1 flex flex-col min-h-0 transition-[margin] duration-300 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-0'
        }`}
      >
        <ChatInterface
          initialConversationId={conversationId}
          initialTurns={initialTurns}
        />
      </main>
    </div>
  )
}

