/**
 * Simplified WebLLM Client
 * Core inference engine wrapper extracted from web-llm-chat
 */
import {
  WebWorkerMLCEngine,
  prebuiltAppConfig,
  ChatCompletionMessageParam,
  InitProgressReport,
  ChatCompletionChunk,
  ChatCompletion,
} from '@mlc-ai/web-llm';
import log from 'loglevel';
import type { ChatMessage, ChatOptions, CompletionStats, LoadProgress, LLMClient } from './api-types';

// Set default log level
log.setLevel('INFO');

/**
 * SimpleLLMClient - A minimal wrapper around WebLLM's WebWorkerMLCEngine
 * Handles model loading, chat completion, and streaming responses
 */
export class SimpleLLMClient implements LLMClient {
  private engine: WebWorkerMLCEngine | null = null;
  private currentModel: string | null = null;
  private isInitialized = false;

  constructor() {
    this.initEngine();
  }

  private initEngine(): void {
    try {
      this.engine = new WebWorkerMLCEngine(
        new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }),
        { appConfig: prebuiltAppConfig }
      );
      log.info('[SimpleLLMClient] Engine created');
    } catch (error) {
      log.error('[SimpleLLMClient] Failed to create engine:', error);
      throw error;
    }
  }

  /**
   * Load a model into the engine
   */
  async loadModel(
    modelId: string,
    onProgress?: (progress: LoadProgress) => void
  ): Promise<void> {
    if (!this.engine) {
      throw new Error('Engine not initialized');
    }

    const startTime = performance.now();

    if (onProgress) {
      this.engine.setInitProgressCallback((report: InitProgressReport) => {
        onProgress({
          progress: report.progress,
          text: report.text,
          timeElapsedMs: performance.now() - startTime,
        });
      });
    }

    try {
      log.info(`[SimpleLLMClient] Loading model: ${modelId}`);
      await this.engine.reload(modelId);
      this.currentModel = modelId;
      this.isInitialized = true;
      log.info(`[SimpleLLMClient] Model loaded in ${(performance.now() - startTime).toFixed(0)}ms`);
    } catch (error) {
      log.error('[SimpleLLMClient] Failed to load model:', error);
      this.currentModel = null;
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Send a chat completion request
   */
  async chat(options: ChatOptions): Promise<string> {
    if (!this.engine || !this.isInitialized) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    const { messages, config, onUpdate, onFinish, onError } = options;
    const startTime = performance.now();

    try {
      const completion = await this.engine.chatCompletion({
        messages: messages as ChatCompletionMessageParam[],
        stream: config.stream ?? true,
        temperature: config.temperature,
        top_p: config.top_p,
        presence_penalty: config.presence_penalty,
        frequency_penalty: config.frequency_penalty,
        ...(config.stream ? { stream_options: { include_usage: true } } : {}),
      });

      if (config.stream) {
        return await this.handleStreamingResponse(
          completion as AsyncIterable<ChatCompletionChunk>,
          startTime,
          onUpdate,
          onFinish
        );
      }

      const chatCompletion = completion as ChatCompletion;
      const content = chatCompletion.choices[0]?.message?.content || '';
      const stats = this.buildStats(chatCompletion.usage, startTime);
      onFinish?.(content, stats);
      return content;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.error('[SimpleLLMClient] Chat error:', err);
      onError?.(err);
      throw err;
    }
  }

  private async handleStreamingResponse(
    asyncGenerator: AsyncIterable<ChatCompletionChunk>,
    startTime: number,
    onUpdate?: (message: string, chunk: string) => void,
    onFinish?: (message: string, stats?: CompletionStats) => void
  ): Promise<string> {
    let fullContent = '';
    let usage: ChatCompletionChunk['usage'];

    for await (const chunk of asyncGenerator) {
      const delta = chunk.choices[0]?.delta?.content || '';
      if (delta) {
        fullContent += delta;
        onUpdate?.(fullContent, delta);
      }
      if (chunk.usage) {
        usage = chunk.usage;
      }
    }

    const stats = this.buildStats(usage, startTime);
    onFinish?.(fullContent, stats);
    return fullContent;
  }

  private buildStats(
    usage: ChatCompletion['usage'] | ChatCompletionChunk['usage'] | undefined,
    startTime: number
  ): CompletionStats {
    const totalTimeMs = performance.now() - startTime;
    return {
      promptTokens: usage?.prompt_tokens,
      completionTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
      tokensPerSecond: usage?.completion_tokens 
        ? (usage.completion_tokens / totalTimeMs) * 1000 
        : undefined,
      totalTimeMs,
    };
  }

  /**
   * Abort the current generation
   */
  async abort(): Promise<void> {
    if (this.engine) {
      await this.engine.interruptGenerate();
      log.info('[SimpleLLMClient] Generation aborted');
    }
  }

  /**
   * Check if a model is loaded and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.currentModel !== null;
  }

  /**
   * Get the currently loaded model ID
   */
  getCurrentModel(): string | null {
    return this.currentModel;
  }

  /**
   * Reset the client state
   */
  async reset(): Promise<void> {
    if (this.engine) {
      await this.engine.resetChat();
      log.info('[SimpleLLMClient] Chat reset');
    }
  }
}

// Export singleton for simple use cases
let defaultClient: SimpleLLMClient | null = null;

export function getDefaultClient(): SimpleLLMClient {
  if (!defaultClient) {
    defaultClient = new SimpleLLMClient();
  }
  return defaultClient;
}
