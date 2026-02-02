/**
 * Core types for the WebLLM handler
 * @module types
 */

import type { ChatCompletionMessageParam } from "@mlc-ai/web-llm";

/**
 * Supported model identifiers for WebLLM
 * These are commonly available models that work well in browser environments
 */
export type ModelId =
  | "Llama-3.1-8B-Instruct-q4f32_1-MLC"
  | "Llama-3.2-3B-Instruct-q4f32_1-MLC"
  | "Phi-3.5-mini-instruct-q4f32_1-MLC"
  | "Qwen2.5-1.5B-Instruct-q4f32_1-MLC"
  | "gemma-2-2b-it-q4f32_1-MLC"
  | "SmolLM2-1.7B-Instruct-q4f32_1-MLC"
  | (string & {}); // Allow custom model IDs

/**
 * Engine initialization status
 */
export type EngineStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "generating";

/**
 * Progress information during model loading
 */
export interface LoadingProgress {
  /** Current loading step description */
  text: string;
  /** Progress percentage (0-100) */
  progress: number;
  /** Time elapsed in milliseconds */
  timeElapsed?: number;
}

/**
 * Configuration options for the WebLLM engine
 */
export interface EngineConfig {
  /** Model identifier to load */
  modelId: ModelId;
  /** Temperature for generation (0-2, default: 0.7) */
  temperature?: number;
  /** Top-p sampling parameter (0-1, default: 0.95) */
  topP?: number;
  /** Maximum tokens to generate (default: 2048) */
  maxTokens?: number;
  /** System prompt to prepend to conversations */
  systemPrompt?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_ENGINE_CONFIG: Required<Omit<EngineConfig, "modelId">> = {
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 2048,
  systemPrompt: "You are a helpful assistant.",
};

/**
 * Chat message structure
 */
export interface ChatMessage {
  /** Unique message identifier */
  id: string;
  /** Role of the message sender */
  role: "user" | "assistant" | "system";
  /** Message content */
  content: string;
  /** Timestamp of message creation */
  timestamp: number;
}

/**
 * Generation options for chat completion
 */
export interface GenerationOptions {
  /** Override temperature for this generation */
  temperature?: number;
  /** Override top-p for this generation */
  topP?: number;
  /** Override max tokens for this generation */
  maxTokens?: number;
  /** Callback for streaming tokens */
  onToken?: (token: string, fullText: string) => void;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Result of a chat completion
 */
export interface CompletionResult {
  /** Generated response content */
  content: string;
  /** Number of tokens in the prompt */
  promptTokens: number;
  /** Number of tokens generated */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
  /** Time taken for generation in milliseconds */
  generationTime: number;
  /** Whether the generation was stopped early */
  stopped: boolean;
  /** Finish reason */
  finishReason: "stop" | "length" | "abort" | "error";
}

/**
 * WebLLM handler interface
 */
export interface IWebLLMHandler {
  /** Current engine status */
  readonly status: EngineStatus;
  /** Current model ID (if loaded) */
  readonly currentModel: ModelId | null;
  /** Whether the engine is ready for generation */
  readonly isReady: boolean;

  /**
   * Initialize the engine with a specific model
   * @param config - Engine configuration
   * @param onProgress - Progress callback
   * @returns Promise that resolves when engine is ready
   */
  initialize(
    config: EngineConfig,
    onProgress?: (progress: LoadingProgress) => void
  ): Promise<void>;

  /**
   * Generate a chat completion
   * @param messages - Conversation messages
   * @param options - Generation options
   * @returns Promise with completion result
   */
  generate(
    messages: ChatMessage[],
    options?: GenerationOptions
  ): Promise<CompletionResult>;

  /**
   * Abort current generation
   */
  abort(): void;

  /**
   * Reset the chat state
   */
  resetChat(): Promise<void>;

  /**
   * Unload the current model and free resources
   */
  unload(): Promise<void>;

  /**
   * Get available models
   */
  getAvailableModels(): ModelId[];
}

/**
 * Custom error class for WebLLM operations
 */
export class WebLLMError extends Error {
  constructor(
    message: string,
    public readonly code: WebLLMErrorCode,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "WebLLMError";
  }
}

/**
 * Error codes for WebLLM operations
 */
export type WebLLMErrorCode =
  | "INITIALIZATION_FAILED"
  | "MODEL_NOT_FOUND"
  | "GENERATION_FAILED"
  | "WEBGPU_NOT_SUPPORTED"
  | "ENGINE_NOT_READY"
  | "GENERATION_ABORTED"
  | "INVALID_CONFIG";

/**
 * Convert ChatMessage to WebLLM format
 */
export function toChatCompletionMessage(
  message: ChatMessage
): ChatCompletionMessageParam {
  return {
    role: message.role,
    content: message.content,
  };
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a ChatMessage
 */
export function createMessage(
  role: ChatMessage["role"],
  content: string
): ChatMessage {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: Date.now(),
  };
}
