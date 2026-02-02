/**
 * Core module exports for TerziLLM
 *
 * This module provides the primary API for interacting with local AI models
 * using WebLLM in the browser.
 *
 * @module core
 */

// WebLLM Handler - Main interface for AI inference
export {
  WebLLMHandler,
  createWebLLMHandler,
  WebLLMError,
  createMessage,
  generateMessageId,
} from "./webllm";

// State Management - Zustand store for app state
export {
  useAppStore,
  useEngineState,
  useConversationState,
  useSettings,
  useActiveConversation,
  useConversationsList,
  DEFAULT_APP_SETTINGS,
  generateConversationId,
  createConversationObject,
  createAppError,
} from "./state";

// Types
export type {
  EngineConfig,
  EngineStatus,
  LoadingProgress,
  ChatMessage,
  GenerationOptions,
  CompletionResult,
  ModelId,
  IWebLLMHandler,
  WebLLMErrorCode,
} from "./types";

export type {
  AppState,
  Conversation,
  ConversationId,
  AppSettings,
  AppError,
} from "./state.types";

export { DEFAULT_ENGINE_CONFIG } from "./types";
