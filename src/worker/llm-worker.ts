// ============================================================
// LLM Web Worker — runs WebLLM engine in a background thread
// ============================================================

import type {
  WorkerMessageToWorker,
  WorkerMessageFromWorker,
  ChatMessage,
  GenerateConfig,
} from '../types'

let engine: import('@mlc-ai/web-llm').MLCEngine | null = null
let abortController: AbortController | null = null

// Post a typed message back to main thread
function post(msg: WorkerMessageFromWorker) {
  self.postMessage(msg)
}

async function handleInit(model: string) {
  try {
    const { MLCEngine } = await import('@mlc-ai/web-llm')

    engine = new MLCEngine()

    engine.setInitProgressCallback((report) => {
      post({
        type: 'init-progress',
        progress: report.progress,
        text: report.text,
      })
    })

    await engine.reload(model)

    post({ type: 'init-complete', success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)

    let code: WorkerMessageFromWorker & { type: 'error' } extends { code: infer C }
      ? C
      : never = 'UNKNOWN'

    if (message.includes('WebGPU') || message.includes('navigator.gpu')) {
      code = 'WEBGPU_NOT_SUPPORTED'
    } else if (message.includes('memory') || message.includes('OOM')) {
      code = 'OUT_OF_MEMORY'
    } else {
      code = 'MODEL_LOAD_FAILED'
    }

    post({ type: 'error', error: message, code })
    post({ type: 'init-complete', success: false })
  }
}

async function handleChat(messages: ChatMessage[], config?: GenerateConfig) {
  if (!engine) {
    post({
      type: 'error',
      error: 'Engine not initialized. Load a model first.',
      code: 'GENERATION_ERROR',
    })
    return
  }

  abortController = new AbortController()

  try {
    const completion = await engine.chat.completions.create(
      {
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        temperature: config?.temperature,
        top_p: config?.top_p,
        max_tokens: config?.max_tokens,
        frequency_penalty: config?.frequency_penalty,
        presence_penalty: config?.presence_penalty,
      },
    )

    for await (const chunk of completion) {
      if (abortController.signal.aborted) break

      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        post({ type: 'chunk', content: delta })
      }
    }

    const usage = await engine.runtimeStatsText()
    post({
      type: 'done',
      usage: {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    })
  } catch (err) {
    if (abortController.signal.aborted) {
      post({ type: 'done' })
      return
    }

    const message = err instanceof Error ? err.message : String(err)
    let code: 'OUT_OF_MEMORY' | 'GENERATION_ERROR' = 'GENERATION_ERROR'
    if (message.includes('memory') || message.includes('OOM')) {
      code = 'OUT_OF_MEMORY'
    }
    post({ type: 'error', error: message, code })
  } finally {
    abortController = null
  }
}

function handleAbort() {
  if (abortController) {
    abortController.abort()
  }
}

// ============================================================
// Message listener
// ============================================================

self.onmessage = (e: MessageEvent<WorkerMessageToWorker>) => {
  const msg = e.data
  switch (msg.type) {
    case 'init':
      handleInit(msg.model)
      break
    case 'chat':
      handleChat(msg.messages, msg.config)
      break
    case 'abort':
      handleAbort()
      break
  }
}
