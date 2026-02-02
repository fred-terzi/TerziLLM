/**
 * State types for TerziLLM application
 *
 * Defines all types related to Zustand store state management
 * including conversations, settings, and UI state.
 *
 * @module state/types
 */

import type {
  ChatMessage,
  ModelId,
  EngineStatus,
  LoadingProgress,
  EngineConfig,
} from "./types";

/**
 * Unique identifier for conversations
 */
export type ConversationId = string;

/**
 * A conversation containing messages and metadata
 */
export interface Conversation {
  /** Unique conversation identifier */
  id: ConversationId;
  /** Conversation title (auto-generated or user-defined) */
  title: string;
  /** Messages in this conversation */
  messages: ChatMessage[];
  /** Model used for this conversation */
  modelId: ModelId | null;
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * User settings for the application
 */
export interface AppSettings {
  /** Default model to use for new conversations */
  defaultModelId: ModelId;
  /** Default temperature for generation */
  temperature: number;
  /** Default top-p for generation */
  topP: number;
  /** Default max tokens for generation */
  maxTokens: number;
  /** Default system prompt */
  systemPrompt: string;
  /** Theme preference */
  theme: "light" | "dark" | "system";
  /** Whether to stream responses */
  streamResponses: boolean;
}

/**
 * Default application settings
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultModelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
  temperature: 0.7,
  topP: 0.95,
  maxTokens: 2048,
  systemPrompt: "You are a helpful assistant.",
  theme: "system",
  streamResponses: true,
};

/**
 * Error state for the application
 */
export interface AppError {
  /** Error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Whether the error has been dismissed */
  dismissed: boolean;
}

/**
 * Engine slice state - manages WebLLM engine state
 */
export interface EngineSlice {
  /** Current engine status */
  engineStatus: EngineStatus;
  /** Currently loaded model */
  currentModel: ModelId | null;
  /** Loading progress information */
  loadingProgress: LoadingProgress | null;
  /** Last error from engine operations */
  engineError: AppError | null;

  // Actions
  /** Set engine status */
  setEngineStatus: (status: EngineStatus) => void;
  /** Set current model */
  setCurrentModel: (modelId: ModelId | null) => void;
  /** Update loading progress */
  setLoadingProgress: (progress: LoadingProgress | null) => void;
  /** Set engine error */
  setEngineError: (error: AppError | null) => void;
  /** Clear engine error */
  clearEngineError: () => void;
}

/**
 * Conversation slice state - manages conversations and messages
 */
export interface ConversationSlice {
  /** All conversations */
  conversations: Map<ConversationId, Conversation>;
  /** Currently active conversation ID */
  activeConversationId: ConversationId | null;
  /** Whether a response is being generated */
  isGenerating: boolean;
  /** Current streaming content (partial response) */
  streamingContent: string;

  // Actions
  /** Create a new conversation */
  createConversation: (modelId?: ModelId) => ConversationId;
  /** Delete a conversation */
  deleteConversation: (id: ConversationId) => void;
  /** Set active conversation */
  setActiveConversation: (id: ConversationId | null) => void;
  /** Add a message to a conversation */
  addMessage: (conversationId: ConversationId, message: ChatMessage) => void;
  /** Update a message in a conversation */
  updateMessage: (
    conversationId: ConversationId,
    messageId: string,
    content: string
  ) => void;
  /** Delete a message from a conversation */
  deleteMessage: (conversationId: ConversationId, messageId: string) => void;
  /** Clear all messages in a conversation */
  clearMessages: (conversationId: ConversationId) => void;
  /** Update conversation title */
  updateConversationTitle: (id: ConversationId, title: string) => void;
  /** Set generating state */
  setIsGenerating: (isGenerating: boolean) => void;
  /** Update streaming content */
  setStreamingContent: (content: string) => void;
  /** Get active conversation */
  getActiveConversation: () => Conversation | null;
  /** Get all conversations as array (sorted by updatedAt desc) */
  getConversationsList: () => Conversation[];
}

/**
 * Settings slice state - manages user settings
 */
export interface SettingsSlice {
  /** User settings */
  settings: AppSettings;

  // Actions
  /** Update settings */
  updateSettings: (settings: Partial<AppSettings>) => void;
  /** Reset settings to defaults */
  resetSettings: () => void;
  /** Get engine config from settings */
  getEngineConfig: (modelId?: ModelId) => EngineConfig;
}

/**
 * Combined app store state
 */
export interface AppState extends EngineSlice, ConversationSlice, SettingsSlice {
  /** Reset entire store to initial state */
  resetStore: () => void;
}

/**
 * Generate a unique conversation ID
 */
export function generateConversationId(): ConversationId {
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new conversation object
 */
export function createConversation(modelId: ModelId | null = null): Conversation {
  const now = Date.now();
  return {
    id: generateConversationId(),
    title: "New Conversation",
    messages: [],
    modelId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Create an app error object
 */
export function createAppError(code: string, message: string): AppError {
  return {
    code,
    message,
    timestamp: Date.now(),
    dismissed: false,
  };
}
