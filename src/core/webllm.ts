/**
 * WebLLM Handler - Core interface for local AI inference
 *
 * This module provides a robust, type-safe interface to WebLLM for
 * running language models locally in the browser using WebGPU.
 *
 * @module webllm
 */

import {
  MLCEngine,
  prebuiltAppConfig,
  type ChatCompletionMessageParam,
} from "@mlc-ai/web-llm";

import {
  type EngineConfig,
  type EngineStatus,
  type LoadingProgress,
  type ChatMessage,
  type GenerationOptions,
  type CompletionResult,
  type ModelId,
  type IWebLLMHandler,
  DEFAULT_ENGINE_CONFIG,
  WebLLMError,
  toChatCompletionMessage,
} from "./types";

/**
 * WebLLM Handler class
 *
 * Provides a clean interface to WebLLM with proper error handling,
 * streaming support, and resource management.
 *
 * @example
 * ```typescript
 * const handler = new WebLLMHandler();
 *
 * await handler.initialize({
 *   modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC"
 * }, (progress) => {
 *   console.log(`Loading: ${progress.progress}%`);
 * });
 *
 * const result = await handler.generate([
 *   { id: "1", role: "user", content: "Hello!", timestamp: Date.now() }
 * ]);
 *
 * console.log(result.content);
 * ```
 */
export class WebLLMHandler implements IWebLLMHandler {
  private engine: MLCEngine | null = null;
  private config: EngineConfig | null = null;
  private _status: EngineStatus = "idle";
  private _currentModel: ModelId | null = null;
  private abortController: AbortController | null = null;
  private generationStartTime: number = 0;

  /**
   * Current engine status
   */
  get status(): EngineStatus {
    return this._status;
  }

  /**
   * Currently loaded model ID
   */
  get currentModel(): ModelId | null {
    return this._currentModel;
  }

  /**
   * Whether the engine is ready for generation
   */
  get isReady(): boolean {
    return this._status === "ready" && this.engine !== null;
  }

  /**
   * Check if WebGPU is supported in the current environment
   */
  static async checkWebGPUSupport(): Promise<boolean> {
    if (typeof navigator === "undefined") {
      return false;
    }

    if (!("gpu" in navigator)) {
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  /**
   * Validate engine configuration
   */
  private validateConfig(config: EngineConfig): void {
    if (!config.modelId || typeof config.modelId !== "string") {
      throw new WebLLMError(
        "Model ID is required and must be a string",
        "INVALID_CONFIG"
      );
    }

    if (
      config.temperature !== undefined &&
      (config.temperature < 0 || config.temperature > 2)
    ) {
      throw new WebLLMError(
        "Temperature must be between 0 and 2",
        "INVALID_CONFIG"
      );
    }

    if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
      throw new WebLLMError("Top-p must be between 0 and 1", "INVALID_CONFIG");
    }

    if (config.maxTokens !== undefined && config.maxTokens < 1) {
      throw new WebLLMError(
        "Max tokens must be a positive integer",
        "INVALID_CONFIG"
      );
    }
  }

  /**
   * Initialize the WebLLM engine with the specified model
   *
   * @param config - Engine configuration including model ID and generation params
   * @param onProgress - Optional callback for loading progress updates
   * @throws {WebLLMError} If initialization fails
   */
  async initialize(
    config: EngineConfig,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<void> {
    // Validate configuration
    this.validateConfig(config);

    // Check WebGPU support
    const webGPUSupported = await WebLLMHandler.checkWebGPUSupport();
    if (!webGPUSupported) {
      throw new WebLLMError(
        "WebGPU is not supported in this browser. Please use a WebGPU-enabled browser like Chrome 113+ or Edge 113+.",
        "WEBGPU_NOT_SUPPORTED"
      );
    }

    // Check if model exists in prebuilt config
    const availableModels = this.getAvailableModels();
    if (!availableModels.includes(config.modelId as ModelId)) {
      throw new WebLLMError(
        `Model "${config.modelId}" not found. Available models: ${availableModels.slice(0, 5).join(", ")}...`,
        "MODEL_NOT_FOUND"
      );
    }

    // Unload existing engine if any
    if (this.engine) {
      await this.unload();
    }

    this._status = "loading";
    this.config = {
      ...DEFAULT_ENGINE_CONFIG,
      ...config,
    };

    const startTime = Date.now();

    try {
      // Create progress callback wrapper
      const progressCallback = (report: { text: string; progress: number }) => {
        if (onProgress) {
          onProgress({
            text: report.text,
            progress: Math.round(report.progress * 100),
            timeElapsed: Date.now() - startTime,
          });
        }
      };

      // Initialize the MLCEngine
      this.engine = new MLCEngine({
        initProgressCallback: progressCallback,
        appConfig: prebuiltAppConfig,
      });

      // Load the model
      await this.engine.reload(config.modelId);

      this._currentModel = config.modelId;
      this._status = "ready";
    } catch (error) {
      this._status = "error";
      this.engine = null;
      this.config = null;

      throw new WebLLMError(
        `Failed to initialize WebLLM engine: ${error instanceof Error ? error.message : String(error)}`,
        "INITIALIZATION_FAILED",
        error
      );
    }
  }

  /**
   * Generate a chat completion from the given messages
   *
   * @param messages - Array of chat messages forming the conversation
   * @param options - Optional generation parameters
   * @returns Promise resolving to the completion result
   * @throws {WebLLMError} If generation fails or engine is not ready
   */
  async generate(
    messages: ChatMessage[],
    options: GenerationOptions = {}
  ): Promise<CompletionResult> {
    if (!this.isReady || !this.engine || !this.config) {
      throw new WebLLMError(
        "Engine is not ready. Call initialize() first.",
        "ENGINE_NOT_READY"
      );
    }

    if (!messages || messages.length === 0) {
      throw new WebLLMError(
        "At least one message is required for generation",
        "INVALID_CONFIG"
      );
    }

    // Create abort controller for this generation
    this.abortController = new AbortController();
    this._status = "generating";
    this.generationStartTime = Date.now();

    // Link external abort signal if provided
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        this.abort();
      });
    }

    try {
      // Build messages array with system prompt
      const chatMessages: ChatCompletionMessageParam[] = [];

      // Add system prompt if configured
      if (this.config.systemPrompt) {
        chatMessages.push({
          role: "system",
          content: this.config.systemPrompt,
        });
      }

      // Add conversation messages
      for (const msg of messages) {
        chatMessages.push(toChatCompletionMessage(msg));
      }

      // Determine generation parameters
      const temperature = options.temperature ?? this.config.temperature;
      const topP = options.topP ?? this.config.topP;
      const maxTokens = options.maxTokens ?? this.config.maxTokens;

      let fullContent = "";
      let promptTokens = 0;
      let completionTokens = 0;
      let finishReason: CompletionResult["finishReason"] = "stop";

      // Use streaming if callback provided
      if (options.onToken) {
        const stream = await this.engine.chat.completions.create({
          messages: chatMessages,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
          stream: true,
          stream_options: { include_usage: true },
        });

        for await (const chunk of stream) {
          // Check for abort
          if (this.abortController?.signal.aborted) {
            finishReason = "abort";
            break;
          }

          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            options.onToken(delta, fullContent);
          }

          // Capture usage from final chunk
          if (chunk.usage) {
            promptTokens = chunk.usage.prompt_tokens;
            completionTokens = chunk.usage.completion_tokens;
          }

          // Capture finish reason
          if (chunk.choices[0]?.finish_reason) {
            finishReason =
              chunk.choices[0].finish_reason === "length" ? "length" : "stop";
          }
        }
      } else {
        // Non-streaming generation
        const response = await this.engine.chat.completions.create({
          messages: chatMessages,
          temperature,
          top_p: topP,
          max_tokens: maxTokens,
          stream: false,
        });

        fullContent = response.choices[0]?.message?.content ?? "";
        promptTokens = response.usage?.prompt_tokens ?? 0;
        completionTokens = response.usage?.completion_tokens ?? 0;
        finishReason =
          response.choices[0]?.finish_reason === "length" ? "length" : "stop";
      }

      const generationTime = Date.now() - this.generationStartTime;
      this._status = "ready";
      this.abortController = null;

      return {
        content: fullContent,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        generationTime,
        stopped: finishReason === "abort",
        finishReason,
      };
    } catch (error) {
      this._status = "ready";
      this.abortController = null;

      // Check if this was an abort
      if (error instanceof Error && error.name === "AbortError") {
        return {
          content: "",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          generationTime: Date.now() - this.generationStartTime,
          stopped: true,
          finishReason: "abort",
        };
      }

      throw new WebLLMError(
        `Generation failed: ${error instanceof Error ? error.message : String(error)}`,
        "GENERATION_FAILED",
        error
      );
    }
  }

  /**
   * Abort the current generation
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
      this._status = "ready";
    }
  }

  /**
   * Reset the chat state (clears conversation context in the engine)
   */
  async resetChat(): Promise<void> {
    if (this.engine) {
      await this.engine.resetChat();
    }
  }

  /**
   * Unload the current model and free resources
   */
  async unload(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }

    this._currentModel = null;
    this.config = null;
    this._status = "idle";
    this.abortController = null;
  }

  /**
   * Get list of available model IDs
   */
  getAvailableModels(): ModelId[] {
    return prebuiltAppConfig.model_list.map((model) => model.model_id as ModelId);
  }
}

/**
 * Create a new WebLLM handler instance
 *
 * @returns New WebLLMHandler instance
 */
export function createWebLLMHandler(): IWebLLMHandler {
  return new WebLLMHandler();
}

// Re-export types for convenience
export type {
  EngineConfig,
  EngineStatus,
  LoadingProgress,
  ChatMessage,
  GenerationOptions,
  CompletionResult,
  ModelId,
  IWebLLMHandler,
};

export { WebLLMError, createMessage, generateMessageId } from "./types";
