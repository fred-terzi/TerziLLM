// ============================================================
// WorkerBridge — Main-thread interface to the LLM Web Worker
//
// Provides a ReadableStream-based API that is compatible with
// the Vercel AI SDK's custom fetch handler.
// ============================================================

import type {
  WorkerMessageToWorker,
  WorkerMessageFromWorker,
  ChatMessage,
  GenerateConfig,
  ModelStatus,
} from '../types'

export type WorkerBridgeCallback = {
  onStatusChange?: (status: ModelStatus) => void
  onProgress?: (progress: number, text: string) => void
  onError?: (error: string, code: string) => void
}

export class WorkerBridge {
  private worker: Worker | null = null
  private callbacks: WorkerBridgeCallback = {}

  constructor() {
    // Worker will be created lazily on first init
  }

  private ensureWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../worker/llm-worker.ts', import.meta.url),
        { type: 'module' },
      )
    }
    return this.worker
  }

  private post(msg: WorkerMessageToWorker) {
    this.ensureWorker().postMessage(msg)
  }

  setCallbacks(cb: WorkerBridgeCallback) {
    this.callbacks = cb
  }

  /**
   * Initialize the engine with a model.
   * Returns a promise that resolves when loading is complete.
   */
  async init(model: string): Promise<boolean> {
    const worker = this.ensureWorker()
    this.callbacks.onStatusChange?.('loading')

    return new Promise<boolean>((resolve) => {
      const handler = (e: MessageEvent<WorkerMessageFromWorker>) => {
        const msg = e.data
        switch (msg.type) {
          case 'init-progress':
            this.callbacks.onProgress?.(msg.progress, msg.text)
            break
          case 'init-complete':
            worker.removeEventListener('message', handler)
            this.callbacks.onStatusChange?.(msg.success ? 'ready' : 'error')
            resolve(msg.success)
            break
          case 'error':
            this.callbacks.onError?.(msg.error, msg.code)
            break
        }
      }

      worker.addEventListener('message', handler)
      this.post({ type: 'init', model })
    })
  }

  /**
   * Send a chat request and get back a ReadableStream of content chunks.
   * This is compatible with the Vercel AI SDK custom fetch pattern.
   */
  chat(messages: ChatMessage[], config?: GenerateConfig): ReadableStream<string> {
    const worker = this.ensureWorker()

    return new ReadableStream<string>({
      start: (controller) => {
        const handler = (e: MessageEvent<WorkerMessageFromWorker>) => {
          const msg = e.data
          switch (msg.type) {
            case 'chunk':
              controller.enqueue(msg.content)
              break
            case 'done':
              worker.removeEventListener('message', handler)
              controller.close()
              break
            case 'error':
              worker.removeEventListener('message', handler)
              controller.error(new Error(msg.error))
              break
          }
        }

        worker.addEventListener('message', handler)
        this.post({ type: 'chat', messages, config })
      },
      cancel: () => {
        this.post({ type: 'abort' })
      },
    })
  }

  /**
   * Abort the current generation.
   */
  abort() {
    this.post({ type: 'abort' })
  }

  /**
   * Terminate the worker entirely.
   */
  terminate() {
    this.worker?.terminate()
    this.worker = null
  }
}
