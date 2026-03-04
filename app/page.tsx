import { Metadata } from 'next'
import Sidebar from './components/Sidebar'
import ChatInterface from './components/ChatInterface'

export const metadata: Metadata = {
  title: 'BoardOfAI - Multi-LLM Board of Directors',
  description: 'Get advice from multiple AI models in parallel',
}

export default function Home() {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col md:ml-64">
        {/* Header */}
        <header className="border-b bg-white px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            BoardOfAI
          </h1>
          <p className="text-sm text-gray-600">
            Multi-LLM Board of Directors
          </p>
        </header>
        
        {/* Chat Interface */}
        <ChatInterface />
      </main>
    </div>
  )
}
