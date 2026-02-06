/**
 * WorkerBridge - Connects main thread to WebLLM worker
 * Provides a fetch-compatible interface for streaming chat responses
 */

// Types matching the worker protocol
interface InitProgressMessage {
  type: 'init-progress';
  progress: number;
  text: string;
}

interface InitCompleteMessage {
  type: 'init-complete';
  success: boolean;
  error?: string;
}

interface ChunkMessage {
  type: 'chunk';
  content: string;
}

interface DoneMessage {
  type: 'done';
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface ErrorMessage {
  type: 'error';
  error: string;
  code: string;
}

interface StatusMessage {
  type: 'status';
  state: 'idle' | 'loading' | 'ready' | 'generating' | 'error';
}

type WorkerMessage =
  | InitProgressMessage
  | InitCompleteMessage
  | ChunkMessage
  | DoneMessage
  | ErrorMessage
  | StatusMessage;

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatConfig {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface WorkerBridgeCallbacks {
  onInitProgress?: (progress: number, text: string) => void;
  onStatusChange?: (status: 'idle' | 'loading' | 'ready' | 'generating' | 'error') => void;
  onError?: (error: string, code: string) => void;
}

/**
 * WorkerBridge class - Manages communication with LLM worker
 */
export class WorkerBridge {
  private worker: Worker;
  private callbacks: WorkerBridgeCallbacks;
  private currentStatus: 'idle' | 'loading' | 'ready' | 'generating' | 'error' = 'idle';
  private initPromise: Promise<void> | null = null;

  constructor(workerUrl: string | URL, callbacks: WorkerBridgeCallbacks = {}) {
    this.worker = new Worker(workerUrl, { type: 'module' });
    this.callbacks = callbacks;
    this.setupMessageHandler();
  }

  /**
   * Setup worker message handler
   */
  private setupMessageHandler(): void {
    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      switch (message.type) {
        case 'init-progress':
          this.callbacks.onInitProgress?.(message.progress, message.text);
          break;

        case 'status':
          this.currentStatus = message.state;
          this.callbacks.onStatusChange?.(message.state);
          break;

        case 'error':
          this.callbacks.onError?.(message.error, message.code);
          break;

        // Other messages (chunk, done, init-complete) are handled by specific operations
        default:
          break;
      }
    };

    this.worker.onerror = (error) => {
      console.error('Worker error:', error);
      this.callbacks.onError?.('Worker error: ' + error.message, 'WORKER_ERROR');
    };
  }

  /**
   * Initialize the worker with a specific model
   */
  async initialize(modelId: string): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      const handler = (event: MessageEvent<WorkerMessage>) => {
        const message = event.data;

        if (message.type === 'init-complete') {
          this.worker.removeEventListener('message', handler);

          if (message.success) {
            resolve();
          } else {
            reject(new Error(message.error || 'Initialization failed'));
          }
        }
      };

      this.worker.addEventListener('message', handler);
      this.worker.postMessage({ type: 'init', model: modelId });
    });

    return this.initPromise;
  }

  /**
   * Send a chat request and return a ReadableStream
   * Compatible with Vercel AI SDK's fetch interface
   */
  async chat(messages: Message[], config?: ChatConfig): Promise<ReadableStream<Uint8Array>> {
    return new ReadableStream<Uint8Array>({
      start: (controller) => {
        const handler = (event: MessageEvent<WorkerMessage>) => {
          const message = event.data;

          try {
            switch (message.type) {
              case 'chunk': {
                // Encode chunk as Server-Sent Events format for AI SDK compatibility
                const chunk = `data: ${JSON.stringify({ 
                  choices: [{ delta: { content: message.content } }] 
                })}\n\n`;
                controller.enqueue(new TextEncoder().encode(chunk));
                break;
              }

              case 'done': {
                // Send final message
                const done = `data: [DONE]\n\n`;
                controller.enqueue(new TextEncoder().encode(done));
                this.worker.removeEventListener('message', handler);
                controller.close();
                break;
              }

              case 'error':
                this.worker.removeEventListener('message', handler);
                controller.error(new Error(`${message.code}: ${message.error}`));
                break;

              default:
                break;
            }
          } catch (error) {
            console.error('Error processing worker message:', error);
            this.worker.removeEventListener('message', handler);
            controller.error(error);
          }
        };

        this.worker.addEventListener('message', handler);
        this.worker.postMessage({ type: 'chat', messages, config });
      },

      cancel: () => {
        this.abort();
      },
    });
  }

  /**
   * Abort the current generation
   */
  abort(): void {
    this.worker.postMessage({ type: 'abort' });
  }

  /**
   * Retry initialization after error
   */
  retry(): void {
    this.initPromise = null;
    this.worker.postMessage({ type: 'retry' });
  }

  /**
   * Unload the current model
   */
  async unload(): Promise<void> {
    this.initPromise = null;
    this.worker.postMessage({ type: 'unload' });
    
    // Wait for status to change to idle
    return new Promise<void>((resolve) => {
      const checkStatus = () => {
        if (this.currentStatus === 'idle') {
          resolve();
        } else {
          setTimeout(checkStatus, 100);
        }
      };
      checkStatus();
    });
  }

  /**
   * Get current worker status
   */
  getStatus(): 'idle' | 'loading' | 'ready' | 'generating' | 'error' {
    return this.currentStatus;
  }

  /**
   * Terminate the worker
   */
  terminate(): void {
    this.worker.terminate();
  }

  /**
   * Create a fetch-compatible handler for use with Vercel AI SDK
   */
  createFetchHandler(): (url: string, init?: RequestInit) => Promise<Response> {
    return async (_url: string, init?: RequestInit) => {
      if (!init?.body) {
        throw new Error('Request body is required');
      }

      const body = JSON.parse(init.body as string);
      const messages = body.messages as Message[];
      const config = body.config as ChatConfig | undefined;

      const stream = await this.chat(messages, config);

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    };
  }
}

/**
 * Create a WorkerBridge instance with default worker URL
 */
export function createWorkerBridge(callbacks?: WorkerBridgeCallbacks): WorkerBridge {
  // Use Vite's worker import syntax
  const workerUrl = new URL('../worker/llm-worker.ts', import.meta.url);
  return new WorkerBridge(workerUrl, callbacks);
}
