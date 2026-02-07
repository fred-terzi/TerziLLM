// ============================================================
// useWorkerBridge — singleton hook for the WorkerBridge
// ============================================================

import { useRef, useEffect } from 'react'
import { WorkerBridge } from '../lib/worker-bridge'
import { useAppStore } from '../store/app-store'

let sharedBridge: WorkerBridge | null = null

export function getWorkerBridge(): WorkerBridge {
  if (!sharedBridge) {
    sharedBridge = new WorkerBridge()
  }
  return sharedBridge
}

export function useWorkerBridge() {
  const bridge = useRef(getWorkerBridge())
  const setModelStatus = useAppStore((s) => s.setModelStatus)
  const setLoadProgress = useAppStore((s) => s.setLoadProgress)
  const setError = useAppStore((s) => s.setError)

  useEffect(() => {
    bridge.current.setCallbacks({
      onStatusChange: setModelStatus,
      onProgress: setLoadProgress,
      onError: (msg, code) => setError(msg, code as any),
    })
  }, [setModelStatus, setLoadProgress, setError])

  return bridge.current
}
