// ============================================================
// CachedModels — display and manage cached model files
// ============================================================

import { useState, useEffect, useCallback } from 'react'
import { getCachedModels, removeCachedModel, clearAllCachedModels } from '../../lib/model-cache'
import type { CachedModelInfo } from '../../types'

export function CachedModels() {
  const [cachedModels, setCachedModels] = useState<CachedModelInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)

  const loadCachedModels = useCallback(async () => {
    setIsLoading(true)
    const models = await getCachedModels()
    setCachedModels(models)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadCachedModels()
  }, [loadCachedModels])

  const handleRemove = async (modelId: string) => {
    setRemoving(modelId)
    await removeCachedModel(modelId)
    await loadCachedModels()
    setRemoving(null)
  }

  const handleClearAll = async () => {
    setRemoving('all')
    await clearAllCachedModels()
    await loadCachedModels()
    setRemoving(null)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Cached Models
        </h3>
        {cachedModels.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={removing !== null}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500 py-4 text-center">
          Scanning cache...
        </div>
      ) : cachedModels.length === 0 ? (
        <div className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-600/50 rounded-xl">
          <p>No models cached yet</p>
          <p className="text-xs mt-1">Models will be cached automatically when loaded</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cachedModels.map((model) => (
            <div
              key={model.modelId}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30 border border-slate-600/50"
              data-testid="cached-model-item"
            >
              <div>
                <p className="text-sm text-white font-medium">{model.modelId}</p>
                <p className="text-xs text-slate-400">{model.sizeLabel}</p>
              </div>
              <button
                onClick={() => handleRemove(model.modelId)}
                disabled={removing !== null}
                className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 disabled:opacity-50 transition-colors"
                title="Remove cached model"
                data-testid="remove-cached-model"
              >
                {removing === model.modelId ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
