// ============================================================
// WebGPUCheck — detects and displays WebGPU support status
// ============================================================

import { useState, useEffect, type ReactNode } from 'react'

interface WebGPUCheckProps {
  children: ReactNode
}

export function WebGPUCheck({ children }: WebGPUCheckProps) {
  const [status, setStatus] = useState<'checking' | 'supported' | 'unsupported'>('checking')

  useEffect(() => {
    const check = async () => {
      const nav = navigator as any
      if (!nav.gpu) {
        setStatus('unsupported')
        return
      }
      try {
        const adapter = await nav.gpu.requestAdapter()
        setStatus(adapter ? 'supported' : 'unsupported')
      } catch {
        setStatus('unsupported')
      }
    }
    check()
  }, [])

  if (status === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Checking WebGPU support...</p>
        </div>
      </div>
    )
  }

  if (status === 'unsupported') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 p-8">
        <div className="max-w-lg w-full bg-slate-800 rounded-2xl border border-slate-700/50 p-6 text-center" data-testid="webgpu-unsupported">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-white mb-2">WebGPU Not Supported</h2>
          <p className="text-slate-400 text-sm mb-6">
            Your browser doesn't support WebGPU, which is required for local AI inference.
            TerziLLM needs WebGPU to run models directly in your browser.
          </p>

          <div className="bg-slate-700/30 rounded-xl p-4 mb-6 text-left">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Supported Browsers</h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Chrome 113+ (Desktop & Android)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Edge 113+
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                Opera 99+
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">⏳</span>
                Firefox (behind flag in Nightly)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">⏳</span>
                Safari (Technology Preview)
              </li>
            </ul>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href="https://www.google.com/chrome/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Download Chrome
            </a>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              Check Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
