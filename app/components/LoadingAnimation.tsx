'use client'

import { useState, useEffect } from 'react'

interface Props {
  modelCount?: number
}

export default function LoadingAnimation({ modelCount = 5 }: Props) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % modelCount)
    }, 500) // Rotate every 500ms

    return () => clearInterval(interval)
  }, [modelCount])

  // Calculate positions in a circle around a table
  const radius = 120
  const centerX = 200
  const centerY = 200

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-6 text-lg font-semibold text-gray-700">
        AI Directors are deliberating...
      </div>
      
      {/* Boardroom Table */}
      <div className="relative w-full max-w-md h-96 flex items-center justify-center">
        {/* Table */}
        <div className="absolute w-48 h-32 bg-amber-900 rounded-lg shadow-lg opacity-80" />
        
        {/* Rotating AI Agents */}
        {Array.from({ length: modelCount }).map((_, i) => {
          const angle = (i * 2 * Math.PI) / modelCount
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)
          
          return (
            <div
              key={i}
              className="absolute transition-all duration-500"
              style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className={`w-12 h-12 rounded-full border-4 ${
                activeIndex === i
                  ? 'border-blue-500 bg-blue-100 shadow-lg'
                  : 'border-gray-300 bg-gray-100'
              } transition-all duration-300 flex items-center justify-center`}>
                <div className={`w-6 h-6 rounded-full ${
                  activeIndex === i
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-gray-300'
                }`} />
              </div>
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 whitespace-nowrap">
                Model {i + 1}
              </div>
            </div>
          )
        })}
      </div>
      
      <p className="mt-8 text-sm text-gray-500">
        Waiting for responses...
      </p>
    </div>
  )
}
