// ============================================================
// LoadProgressBar — model download/load progress indicator
// ============================================================

import { useAppStore } from '../../store/app-store'

export function LoadProgressBar() {
  const modelStatus = useAppStore((s) => s.modelStatus)
  const loadProgress = useAppStore((s) => s.loadProgress)
  const loadProgressText = useAppStore((s) => s.loadProgressText)

  if (modelStatus !== 'loading') return null

  const percentage = Math.round(loadProgress * 100)

  return (
    <div className="space-y-2" data-testid="load-progress">
      <div className="flex justify-between text-xs text-slate-400">
        <span>{loadProgressText || 'Loading model...'}</span>
        <span>{percentage}%</span>
      </div>
      <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
