// ============================================================
// ErrorDisplay — contextual error messages with recovery actions
// ============================================================

import { useAppStore } from '../../store/app-store'
import { useWorkerBridge } from '../../hooks/useWorkerBridge'
import { clearAllCachedModels } from '../../lib/model-cache'
import { AVAILABLE_MODELS } from '../../types'

export function ErrorDisplay() {
  const errorMessage = useAppStore((s) => s.errorMessage)
  const errorCode = useAppStore((s) => s.errorCode)
  const modelId = useAppStore((s) => s.modelId)
  const clearError = useAppStore((s) => s.clearError)
  const setModelId = useAppStore((s) => s.setModelId)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const bridge = useWorkerBridge()

  if (!errorMessage) return null

  const handleRetry = async () => {
    clearError()
    if (modelId) {
      await bridge.init(modelId)
    }
  }

  const handleRetrySmallerModel = async () => {
    clearError()
    // Find a smaller model
    const currentIndex = AVAILABLE_MODELS.findIndex((m) => m.id === modelId)
    const smallerModel = currentIndex > 0 ? AVAILABLE_MODELS[currentIndex - 1] : AVAILABLE_MODELS[0]
    setModelId(smallerModel.id)
    await bridge.init(smallerModel.id)
  }

  const handleClearCacheAndRetry = async () => {
    clearError()
    await clearAllCachedModels()
    if (modelId) {
      await bridge.init(modelId)
    }
  }

  const handleDismiss = () => {
    clearError()
  }

  // Map error codes to specific recovery suggestions
  const recoveryConfig: Record<string, {
    icon: string
    title: string
    suggestion: string
    actions: { label: string; onClick: () => void; primary?: boolean }[]
  }> = {
    WEBGPU_NOT_SUPPORTED: {
      icon: '🖥️',
      title: 'WebGPU Not Available',
      suggestion: 'WebGPU is required for local inference. Please use a supported browser.',
      actions: [
        { label: 'Dismiss', onClick: handleDismiss },
      ],
    },
    MODEL_LOAD_FAILED: {
      icon: '📦',
      title: 'Model Failed to Load',
      suggestion: 'The model could not be loaded. Try a smaller model or retry the download.',
      actions: [
        { label: 'Try Smaller Model', onClick: handleRetrySmallerModel, primary: true },
        { label: 'Retry', onClick: handleRetry },
        { label: 'Choose Model', onClick: () => { clearError(); setSettingsOpen(true) } },
      ],
    },
    OUT_OF_MEMORY: {
      icon: '💾',
      title: 'Out of Memory',
      suggestion: 'Not enough memory available. Try clearing the model cache or using a smaller model.',
      actions: [
        { label: 'Clear Cache & Retry', onClick: handleClearCacheAndRetry, primary: true },
        { label: 'Try Smaller Model', onClick: handleRetrySmallerModel },
        { label: 'Dismiss', onClick: handleDismiss },
      ],
    },
    GENERATION_ERROR: {
      icon: '⚡',
      title: 'Generation Error',
      suggestion: 'Something went wrong during response generation.',
      actions: [
        { label: 'Retry', onClick: handleRetry, primary: true },
        { label: 'Dismiss', onClick: handleDismiss },
      ],
    },
    NETWORK_ERROR: {
      icon: '🌐',
      title: 'Network Error',
      suggestion: 'Could not download the model. Check your internet connection and try again.',
      actions: [
        { label: 'Retry', onClick: handleRetry, primary: true },
        { label: 'Dismiss', onClick: handleDismiss },
      ],
    },
    UNKNOWN: {
      icon: '❓',
      title: 'Unknown Error',
      suggestion: 'An unexpected error occurred.',
      actions: [
        { label: 'Retry', onClick: handleRetry, primary: true },
        { label: 'Dismiss', onClick: handleDismiss },
      ],
    },
  }

  const config = recoveryConfig[errorCode ?? 'UNKNOWN'] ?? recoveryConfig.UNKNOWN

  return (
    <div
      className="mx-4 mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 animate-in fade-in slide-in-from-bottom-2"
      data-testid="error-display"
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-400">{config.title}</h3>
          <p className="text-xs text-slate-400 mt-1">{config.suggestion}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono truncate">{errorMessage}</p>

          <div className="flex flex-wrap gap-2 mt-3">
            {config.actions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  action.primary
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                    : 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 rounded hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
