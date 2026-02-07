import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { WorkerMessageFromWorker, WorkerMessageToWorker } from '../../types'

// ============================================================
// Mock Worker that simulates the LLM Worker's message protocol
// ============================================================

class MockLLMWorker {
  private handlers: ((e: MessageEvent) => void)[] = []
  public terminated = false

  addEventListener(_: string, handler: (e: MessageEvent) => void) {
    this.handlers.push(handler)
  }

  removeEventListener(_: string, handler: (e: MessageEvent) => void) {
    this.handlers = this.handlers.filter((h) => h !== handler)
  }

  /** Simulate receiving a message from main thread */
  postMessage(msg: WorkerMessageToWorker) {
    // Simulate async worker behavior
    setTimeout(() => this.handleMessage(msg), 0)
  }

  terminate() {
    this.terminated = true
  }

  /** Dispatch a message to all listeners (simulates worker → main) */
  protected dispatch(data: WorkerMessageFromWorker) {
    for (const handler of this.handlers) {
      handler(new MessageEvent('message', { data }))
    }
  }

  /** Process messages like the real worker would */
  protected handleMessage(msg: WorkerMessageToWorker) {
    switch (msg.type) {
      case 'init':
        this.dispatch({ type: 'init-progress', progress: 0.5, text: 'Loading...' })
        this.dispatch({ type: 'init-progress', progress: 1.0, text: 'Ready' })
        this.dispatch({ type: 'init-complete', success: true })
        break

      case 'chat':
        // Stream 3 tokens then done
        this.dispatch({ type: 'chunk', content: 'Hello' })
        this.dispatch({ type: 'chunk', content: ' world' })
        this.dispatch({ type: 'chunk', content: '!' })
        this.dispatch({
          type: 'done',
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        })
        break

      case 'abort':
        this.dispatch({ type: 'done' })
        break
    }
  }
}

class FailingMockWorker extends MockLLMWorker {
  protected override handleMessage(msg: WorkerMessageToWorker) {
    switch (msg.type) {
      case 'init':
        this.dispatch({ type: 'error', error: 'WebGPU is not supported', code: 'WEBGPU_NOT_SUPPORTED' })
        this.dispatch({ type: 'init-complete', success: false })
        break
      case 'chat':
        this.dispatch({ type: 'error', error: 'Out of memory', code: 'OUT_OF_MEMORY' })
        break
    }
  }
}

// ============================================================
// WorkerBridge under test — we inject the mock worker
// ============================================================

// We can't use import.meta.url in tests, so we'll test the bridge
// by constructing it and monkey-patching the worker field
import { WorkerBridge } from '../worker-bridge'

function createBridgeWithMock(mock: MockLLMWorker): WorkerBridge {
  const bridge = new WorkerBridge()
  // Inject mock worker via private field
  ;(bridge as any).worker = mock
  return bridge
}

// ============================================================
// Tests
// ============================================================

describe('WorkerBridge', () => {
  let mock: MockLLMWorker
  let bridge: WorkerBridge

  beforeEach(() => {
    mock = new MockLLMWorker()
    bridge = createBridgeWithMock(mock)
  })

  afterEach(() => {
    bridge.terminate()
  })

  describe('init()', () => {
    it('resolves true on successful init', async () => {
      const onProgress = vi.fn()
      const onStatusChange = vi.fn()
      bridge.setCallbacks({ onProgress, onStatusChange })

      const result = await bridge.init('test-model')

      expect(result).toBe(true)
      expect(onStatusChange).toHaveBeenCalledWith('loading')
      expect(onStatusChange).toHaveBeenCalledWith('ready')
      expect(onProgress).toHaveBeenCalledWith(0.5, 'Loading...')
      expect(onProgress).toHaveBeenCalledWith(1.0, 'Ready')
    })

    it('resolves false on failed init', async () => {
      const failMock = new FailingMockWorker()
      const failBridge = createBridgeWithMock(failMock)
      const onError = vi.fn()
      const onStatusChange = vi.fn()
      failBridge.setCallbacks({ onError, onStatusChange })

      const result = await failBridge.init('bad-model')

      expect(result).toBe(false)
      expect(onStatusChange).toHaveBeenCalledWith('error')
      expect(onError).toHaveBeenCalledWith('WebGPU is not supported', 'WEBGPU_NOT_SUPPORTED')

      failBridge.terminate()
    })
  })

  describe('chat()', () => {
    it('streams tokens as a ReadableStream', async () => {
      const stream = bridge.chat([{ role: 'user', content: 'Hi' }])
      const reader = stream.getReader()

      const chunks: string[] = []
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }

      expect(chunks).toEqual(['Hello', ' world', '!'])
    })

    it('can be collected into a full string', async () => {
      const stream = bridge.chat([{ role: 'user', content: 'Hi' }])
      const reader = stream.getReader()

      let result = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        result += value
      }

      expect(result).toBe('Hello world!')
    })

    it('errors from worker propagate as stream errors', async () => {
      const failMock = new FailingMockWorker()
      const failBridge = createBridgeWithMock(failMock)

      const stream = failBridge.chat([{ role: 'user', content: 'Hi' }])
      const reader = stream.getReader()

      await expect(reader.read()).rejects.toThrow('Out of memory')

      failBridge.terminate()
    })
  })

  describe('abort()', () => {
    it('sends abort message to worker', () => {
      const postSpy = vi.spyOn(mock, 'postMessage')
      bridge.abort()
      expect(postSpy).toHaveBeenCalledWith({ type: 'abort' })
    })
  })

  describe('terminate()', () => {
    it('terminates the worker', () => {
      bridge.terminate()
      expect(mock.terminated).toBe(true)
    })
  })
})
