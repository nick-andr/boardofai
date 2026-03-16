'use client'

import { useState, useEffect } from 'react'

interface ModelConfig {
  id: string
  name: string
  provider: string
  enabled: boolean
  description?: string
}

export default function ModelSelection() {
  const [models, setModels] = useState<ModelConfig[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch('/api/models')
        if (response.ok) {
          const data = await response.json() as ModelConfig[]
          setModels(data)
          // Load saved selection from localStorage
          const saved = localStorage.getItem('selectedModels')
          if (saved) {
            setSelectedIds(new Set(JSON.parse(saved)))
          } else {
            // Default: select all enabled
            setSelectedIds(new Set(data.map((m) => m.id)))
          }
        }
      } catch (error) {
        console.error('Error loading models:', error)
      }
    }
    loadModels()
  }, [])

  const toggleModel = (modelId: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(modelId)) {
      newSelected.delete(modelId)
    } else {
      newSelected.add(modelId)
    }
    setSelectedIds(newSelected)
    localStorage.setItem('selectedModels', JSON.stringify(Array.from(newSelected)))
  }

  return (
    <div className="space-y-2">
      {models.map((model) => (
        <label
          key={model.id}
          className="flex items-center gap-2 cursor-pointer hover:text-gray-200"
        >
          <input
            type="checkbox"
            checked={selectedIds.has(model.id)}
            onChange={() => toggleModel(model.id)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm">
            {model.name}
          </span>
          {!model.enabled && (
            <span className="text-xs text-gray-500">(disabled)</span>
          )}
        </label>
      ))}
    </div>
  )
}
