import * as webllm from "@mlc-ai/web-llm";

// Worker state machine
type WorkerState = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

// Message types from main thread
interface InitMessage {
  type: 'init';
  model: string;
}

interface ChatMessage {
  type: 'chat';
  messages: webllm.ChatCompletionMessageParam[];
  config?: webllm.ChatCompletionRequestStreaming;
}

interface AbortMessage {
  type: 'abort';
}

interface RetryMessage {
  type: 'retry';
}

interface UnloadMessage {
  type: 'unload';
}

type IncomingMessage = InitMessage | ChatMessage | AbortMessage | RetryMessage | UnloadMessage;

// Message types to main thread
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
  state: WorkerState;
}

type OutgoingMessage = 
  | InitProgressMessage 
  | InitCompleteMessage 
  | ChunkMessage 
  | DoneMessage 
  | ErrorMessage 
  | StatusMessage;

// Worker state
let state: WorkerState = 'idle';
let engine: webllm.MLCEngine | null = null;
let currentModel: string | null = null;
let abortController: AbortController | null = null;

/**
 * Post a message to the main thread
 */
function postMessage(message: OutgoingMessage): void {
  self.postMessage(message);
}

/**
 * Update worker state and notify main thread
 */
function setState(newState: WorkerState): void {
  state = newState;
  postMessage({ type: 'status', state });
}

/**
 * Initialize the WebLLM engine with a specific model
 */
async function initializeEngine(modelId: string): Promise<void> {
  setState('loading');
  
  try {
    // Create engine with progress callback
    engine = new webllm.MLCEngine();
    
    engine.setInitProgressCallback((progress) => {
      postMessage({
        type: 'init-progress',
        progress: progress.progress,
        text: progress.text,
      });
    });
    
    // Reload the model
    await engine.reload(modelId);
    
    currentModel = modelId;
    setState('ready');
    
    postMessage({
      type: 'init-complete',
      success: true,
    });
  } catch (error) {
    setState('error');
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    postMessage({
      type: 'init-complete',
      success: false,
      error: errorMessage,
    });
    
    postMessage({
      type: 'error',
      error: errorMessage,
      code: 'INIT_FAILED',
    });
  }
}

/**
 * Handle chat completion request with streaming
 */
async function handleChat(
  messages: webllm.ChatCompletionMessageParam[],
  config?: webllm.ChatCompletionRequestStreaming
): Promise<void> {
  if (!engine) {
    postMessage({
      type: 'error',
      error: 'Engine not initialized. Call init first.',
      code: 'ENGINE_NOT_INITIALIZED',
    });
    return;
  }
  
  if (state !== 'ready') {
    postMessage({
      type: 'error',
      error: `Cannot start chat in state: ${state}`,
      code: 'INVALID_STATE',
    });
    return;
  }
  
  setState('generating');
  abortController = new AbortController();
  
  try {
    const completion = await engine.chat.completions.create({
      messages,
      stream: true,
      temperature: config?.temperature ?? 0.7,
      max_tokens: config?.max_tokens ?? 2048,
      top_p: config?.top_p ?? 0.9,
      ...config,
    });
    
    // Stream chunks to main thread
    for await (const chunk of completion) {
      // Check if aborted
      if (abortController.signal.aborted) {
        postMessage({
          type: 'error',
          error: 'Generation aborted by user',
          code: 'ABORTED',
        });
        setState('ready');
        return;
      }
      
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        postMessage({
          type: 'chunk',
          content: delta,
        });
      }
    }
    
    // Generation complete
    setState('ready');
    
    // Get usage statistics if available
    // WebLLM may provide usage in different format, so we return undefined for now
    const usage = undefined;
    
    postMessage({
      type: 'done',
      usage,
    });
  } catch (error) {
    setState('ready');
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    postMessage({
      type: 'error',
      error: errorMessage,
      code: 'GENERATION_FAILED',
    });
  } finally {
    abortController = null;
  }
}

/**
 * Abort the current generation
 */
function handleAbort(): void {
  if (abortController) {
    abortController.abort();
  }
}

/**
 * Retry initialization after error
 */
async function handleRetry(): Promise<void> {
  if (currentModel) {
    await initializeEngine(currentModel);
  } else {
    postMessage({
      type: 'error',
      error: 'No model to retry. Call init first.',
      code: 'NO_MODEL',
    });
  }
}

/**
 * Unload the current model and reset engine
 */
async function handleUnload(): Promise<void> {
  try {
    if (engine) {
      // WebLLM doesn't have explicit unload, but we can reset the engine
      engine = null;
      currentModel = null;
      setState('idle');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    postMessage({
      type: 'error',
      error: errorMessage,
      code: 'UNLOAD_FAILED',
    });
  }
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;
  
  switch (message.type) {
    case 'init':
      await initializeEngine(message.model);
      break;
      
    case 'chat':
      await handleChat(message.messages, message.config);
      break;
      
    case 'abort':
      handleAbort();
      break;
      
    case 'retry':
      await handleRetry();
      break;
      
    case 'unload':
      await handleUnload();
      break;
      
    default:
      postMessage({
        type: 'error',
        error: `Unknown message type: ${(message as { type: string }).type}`,
        code: 'UNKNOWN_MESSAGE_TYPE',
      });
  }
};

// Send initial status
postMessage({ type: 'status', state: 'idle' });
