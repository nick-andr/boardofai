'use client'

import { useState } from 'react'
import ChatHistory from './ChatHistory'
import Settings from './Settings'

interface Props {
  isOpen: boolean
  onToggle: () => void
  onNewChat: () => void
}

/* Scrollbar visible only on hover - inline to avoid build stripping :hover with webkit-scrollbar */
const sidebarScrollbarStyles = `
.sidebar-scroll::-webkit-scrollbar { width: 0; }
.sidebar-scroll:hover::-webkit-scrollbar { width: 6px; }
.sidebar-scroll::-webkit-scrollbar-track { background: #0a0a0a; }
.sidebar-scroll::-webkit-scrollbar-thumb { background: #374151; border-radius: 9999px; }
.sidebar-scroll::-webkit-scrollbar-thumb:hover { background: #4b5563; }
`

export default function Sidebar({ isOpen, onToggle, onNewChat }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen((o) => !o)}
        className="fixed top-4 left-4 z-50 md:hidden bg-[#0a0a0a] text-white p-2 rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop collapse/expand button */}
      <button
        onClick={onToggle}
        aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-50 w-8 h-14 items-center justify-center bg-[#0a0a0a] text-white rounded-r-lg shadow-lg border border-l-0 border-gray-800 hover:bg-gray-900 transition-all"
        style={{ left: isOpen ? 256 : 0 }}
      >
        {isOpen ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        )}
      </button>

      <aside
        className={`fixed left-0 top-0 h-full w-64 transition-transform duration-300 z-40 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isOpen ? 'md:translate-x-0' : 'md:-translate-x-full'}`}
        style={{ backgroundColor: '#0a0a0a' }}
      >
        <style dangerouslySetInnerHTML={{ __html: sidebarScrollbarStyles }} />
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-xl font-bold">BoardOfAI</h2>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l18 6" />
              </svg>
            </button>
          </div>

          <div className="px-4 pt-4 border-t border-b border-gray-800 pb-4">
            <button
              type="button"
              onClick={() => {
                onNewChat()
                setMobileMenuOpen(false)
              }}
              className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] transition-colors cursor-pointer"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-900">
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M12 4v16M4 12h16"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-sm font-semibold leading-none">New chat</span>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 sidebar-scroll" style={{ backgroundColor: '#0a0a0a' }}>
            <h3 className="mb-4 text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Chat History
            </h3>
            <ChatHistory />
          </nav>

          <div className="border-t border-gray-800 p-4">
            <Settings />
          </div>
        </div>
      </aside>
    </>
  )
}
