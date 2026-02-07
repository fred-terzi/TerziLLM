// ============================================================
// ModelSelector — model selection with tier badges
// ============================================================

import { AVAILABLE_MODELS, type ModelInfo, type ModelTier } from '../../types'
import { useAppStore } from '../../store/app-store'
import { useWorkerBridge } from '../../hooks/useWorkerBridge'

const tierColors: Record<ModelTier, string> = {
  mobile: 'bg-green-500/20 text-green-400 border-green-500/30',
  light: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  heavy: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

const tierLabels: Record<ModelTier, string> = {
  mobile: 'Mobile',
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
}

export function ModelSelector() {
  const modelId = useAppStore((s) => s.modelId)
  const modelStatus = useAppStore((s) => s.modelStatus)
  const bridge = useWorkerBridge()

  const handleSelect = async (model: ModelInfo) => {
    if (modelStatus === 'loading') return

    useAppStore.getState().setModelId(model.id)
    useAppStore.getState().clearError()
    await bridge.init(model.id)
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        Select Model
      </h3>

      <div className="space-y-2">
        {AVAILABLE_MODELS.map((model) => {
          const isSelected = modelId === model.id
          const isLoading = isSelected && modelStatus === 'loading'

          return (
            <button
              key={model.id}
              onClick={() => handleSelect(model)}
              disabled={modelStatus === 'loading'}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                isSelected
                  ? 'border-blue-500/50 bg-blue-500/10'
                  : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500/50 hover:bg-slate-700/50'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              data-testid={`model-option-${model.tier}`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{model.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${tierColors[model.tier]}`}
                  >
                    {tierLabels[model.tier]}
                  </span>
                </div>
                <span className="text-xs text-slate-400">{model.sizeLabel}</span>
              </div>
              <p className="text-xs text-slate-400">{model.description}</p>

              {isLoading && (
                <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1.5">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading...
                </div>
              )}

              {isSelected && modelStatus === 'ready' && (
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Loaded & ready
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
