'use client'

import { useState } from 'react'
import ChatHistory from './ChatHistory'
import ModelSelection from './ModelSelection'
import Settings from './Settings'

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden bg-gray-900 text-white p-2 rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      
      <aside className={`fixed left-0 top-0 h-full w-64 bg-gray-900 text-white transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-xl font-bold">BoardOfAI</h2>
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 6" />
            </svg>
          </button>
        </div>
        
        {/* Chat History */}
        <nav className="flex-1 overflow-y-auto p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Chat History
          </h3>
          <ChatHistory />
        </nav>
        
        {/* Model Selection */}
        <div className="border-t border-gray-800 p-4">
          <h3 className="mb-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
            Models
          </h3>
          <ModelSelection />
        </div>
        
        {/* Settings */}
        <div className="border-t border-gray-800 p-4">
          <Settings />
        </div>
      </div>
    </aside>
    </>
  )
}
