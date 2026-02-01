/**
 * Type definitions for LLM interactions
 * Extracted and simplified from web-llm-chat
 */

export const ROLES = ['system', 'user', 'assistant'] as const;
export type MessageRole = (typeof ROLES)[number];

/**
 * Multimodal content for messages that may contain images
 */
export interface MultimodalContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

/**
 * A message in a chat conversation
 */
export interface ChatMessage {
  role: MessageRole;
  content: string | MultimodalContent[];
}

/**
 * Configuration for model inference
 */
export interface ModelConfig {
  model: string;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  context_window_size?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
}

/**
 * Options for a chat completion request
 */
export interface ChatOptions {
  messages: ChatMessage[];
  config: ModelConfig;
  onUpdate?: (message: string, chunk: string) => void;
  onFinish?: (message: string, stats?: CompletionStats) => void;
  onError?: (error: Error) => void;
}

/**
 * Statistics from a completed inference
 */
export interface CompletionStats {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  tokensPerSecond?: number;
  totalTimeMs?: number;
}

/**
 * Progress report during model loading
 */
export interface LoadProgress {
  progress: number; // 0-1
  text: string;
  timeElapsedMs?: number;
}

/**
 * Abstract interface for LLM clients
 */
export interface LLMClient {
  loadModel(modelId: string, onProgress?: (progress: LoadProgress) => void): Promise<void>;
  chat(options: ChatOptions): Promise<string>;
  abort(): Promise<void>;
  isReady(): boolean;
  getCurrentModel(): string | null;
}
