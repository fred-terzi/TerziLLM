/**
 * Zustand State Management for TerziLLM
 *
 * This module provides the central state store for the application,
 * managing engine state, conversations, and user settings.
 *
 * @module state
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import type {
  AppState,
  EngineSlice,
  ConversationSlice,
  SettingsSlice,
  Conversation,
  ConversationId,
  AppError,
  AppSettings,
} from "./state.types";

import {
  DEFAULT_APP_SETTINGS,
  generateConversationId,
  createConversation as createConversationObj,
  createAppError,
} from "./state.types";

import type {
  EngineStatus,
  LoadingProgress,
  ModelId,
  ChatMessage,
  EngineConfig,
} from "./types";

import { generateMessageId } from "./types";

/**
 * Initial engine state
 */
const initialEngineState: Omit<
  EngineSlice,
  | "setEngineStatus"
  | "setCurrentModel"
  | "setLoadingProgress"
  | "setEngineError"
  | "clearEngineError"
> = {
  engineStatus: "idle",
  currentModel: null,
  loadingProgress: null,
  engineError: null,
};

/**
 * Initial conversation state
 */
const initialConversationState: Omit<
  ConversationSlice,
  | "createConversation"
  | "deleteConversation"
  | "setActiveConversation"
  | "addMessage"
  | "updateMessage"
  | "deleteMessage"
  | "clearMessages"
  | "updateConversationTitle"
  | "setIsGenerating"
  | "setStreamingContent"
  | "getActiveConversation"
  | "getConversationsList"
> = {
  conversations: new Map(),
  activeConversationId: null,
  isGenerating: false,
  streamingContent: "",
};

/**
 * Initial settings state
 */
const initialSettingsState: Omit<
  SettingsSlice,
  "updateSettings" | "resetSettings" | "getEngineConfig"
> = {
  settings: { ...DEFAULT_APP_SETTINGS },
};

/**
 * Create the engine slice
 */
const createEngineSlice = (
  set: (fn: (state: AppState) => Partial<AppState>) => void
): EngineSlice => ({
  ...initialEngineState,

  setEngineStatus: (status: EngineStatus) =>
    set(() => ({ engineStatus: status })),

  setCurrentModel: (modelId: ModelId | null) =>
    set(() => ({ currentModel: modelId })),

  setLoadingProgress: (progress: LoadingProgress | null) =>
    set(() => ({ loadingProgress: progress })),

  setEngineError: (error: AppError | null) =>
    set(() => ({ engineError: error })),

  clearEngineError: () =>
    set((state) => ({
      engineError: state.engineError
        ? { ...state.engineError, dismissed: true }
        : null,
    })),
});

/**
 * Create the conversation slice
 */
const createConversationSlice = (
  set: (fn: (state: AppState) => Partial<AppState>) => void,
  get: () => AppState
): ConversationSlice => ({
  ...initialConversationState,

  createConversation: (modelId?: ModelId): ConversationId => {
    const state = get();
    const effectiveModelId = modelId ?? state.settings.defaultModelId;
    const conversation = createConversationObj(effectiveModelId);

    set((state) => {
      const newConversations = new Map(state.conversations);
      newConversations.set(conversation.id, conversation);
      return {
        conversations: newConversations,
        activeConversationId: conversation.id,
      };
    });

    return conversation.id;
  },

  deleteConversation: (id: ConversationId) =>
    set((state) => {
      const newConversations = new Map(state.conversations);
      newConversations.delete(id);

      // If deleting active conversation, clear or select another
      let newActiveId = state.activeConversationId;
      if (state.activeConversationId === id) {
        const remaining = Array.from(newConversations.keys());
        newActiveId = remaining.length > 0 ? remaining[0] : null;
      }

      return {
        conversations: newConversations,
        activeConversationId: newActiveId,
      };
    }),

  setActiveConversation: (id: ConversationId | null) =>
    set(() => ({
      activeConversationId: id,
      streamingContent: "", // Clear streaming content when switching
    })),

  addMessage: (conversationId: ConversationId, message: ChatMessage) =>
    set((state) => {
      const conversation = state.conversations.get(conversationId);
      if (!conversation) return {};

      const updatedConversation: Conversation = {
        ...conversation,
        messages: [...conversation.messages, message],
        updatedAt: Date.now(),
      };

      // Auto-generate title from first user message if still default
      if (
        updatedConversation.title === "New Conversation" &&
        message.role === "user" &&
        updatedConversation.messages.length === 1
      ) {
        updatedConversation.title =
          message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "");
      }

      const newConversations = new Map(state.conversations);
      newConversations.set(conversationId, updatedConversation);

      return { conversations: newConversations };
    }),

  updateMessage: (
    conversationId: ConversationId,
    messageId: string,
    content: string
  ) =>
    set((state) => {
      const conversation = state.conversations.get(conversationId);
      if (!conversation) return {};

      const updatedMessages = conversation.messages.map((msg) =>
        msg.id === messageId ? { ...msg, content } : msg
      );

      const updatedConversation: Conversation = {
        ...conversation,
        messages: updatedMessages,
        updatedAt: Date.now(),
      };

      const newConversations = new Map(state.conversations);
      newConversations.set(conversationId, updatedConversation);

      return { conversations: newConversations };
    }),

  deleteMessage: (conversationId: ConversationId, messageId: string) =>
    set((state) => {
      const conversation = state.conversations.get(conversationId);
      if (!conversation) return {};

      const updatedConversation: Conversation = {
        ...conversation,
        messages: conversation.messages.filter((msg) => msg.id !== messageId),
        updatedAt: Date.now(),
      };

      const newConversations = new Map(state.conversations);
      newConversations.set(conversationId, updatedConversation);

      return { conversations: newConversations };
    }),

  clearMessages: (conversationId: ConversationId) =>
    set((state) => {
      const conversation = state.conversations.get(conversationId);
      if (!conversation) return {};

      const updatedConversation: Conversation = {
        ...conversation,
        messages: [],
        updatedAt: Date.now(),
      };

      const newConversations = new Map(state.conversations);
      newConversations.set(conversationId, updatedConversation);

      return { conversations: newConversations };
    }),

  updateConversationTitle: (id: ConversationId, title: string) =>
    set((state) => {
      const conversation = state.conversations.get(id);
      if (!conversation) return {};

      const updatedConversation: Conversation = {
        ...conversation,
        title,
        updatedAt: Date.now(),
      };

      const newConversations = new Map(state.conversations);
      newConversations.set(id, updatedConversation);

      return { conversations: newConversations };
    }),

  setIsGenerating: (isGenerating: boolean) =>
    set(() => ({
      isGenerating,
      streamingContent: isGenerating ? "" : "",
    })),

  setStreamingContent: (content: string) =>
    set(() => ({ streamingContent: content })),

  getActiveConversation: (): Conversation | null => {
    const state = get();
    if (!state.activeConversationId) return null;
    return state.conversations.get(state.activeConversationId) ?? null;
  },

  getConversationsList: (): Conversation[] => {
    const state = get();
    return Array.from(state.conversations.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt
    );
  },
});

/**
 * Create the settings slice
 */
const createSettingsSlice = (
  set: (fn: (state: AppState) => Partial<AppState>) => void,
  get: () => AppState
): SettingsSlice => ({
  ...initialSettingsState,

  updateSettings: (newSettings: Partial<AppSettings>) =>
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    })),

  resetSettings: () =>
    set(() => ({
      settings: { ...DEFAULT_APP_SETTINGS },
    })),

  getEngineConfig: (modelId?: ModelId): EngineConfig => {
    const state = get();
    return {
      modelId: modelId ?? state.settings.defaultModelId,
      temperature: state.settings.temperature,
      topP: state.settings.topP,
      maxTokens: state.settings.maxTokens,
      systemPrompt: state.settings.systemPrompt,
    };
  },
});

/**
 * Create the main app store
 */
export const useAppStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    // Engine slice
    ...createEngineSlice(set),

    // Conversation slice
    ...createConversationSlice(set, get),

    // Settings slice
    ...createSettingsSlice(set, get),

    // Global reset
    resetStore: () =>
      set(() => ({
        ...initialEngineState,
        conversations: new Map(),
        activeConversationId: null,
        isGenerating: false,
        streamingContent: "",
        settings: { ...DEFAULT_APP_SETTINGS },
      })),
  }))
);

/**
 * Helper hook to get engine state
 */
export const useEngineState = () =>
  useAppStore((state) => ({
    status: state.engineStatus,
    currentModel: state.currentModel,
    loadingProgress: state.loadingProgress,
    error: state.engineError,
  }));

/**
 * Helper hook to get conversation state
 */
export const useConversationState = () =>
  useAppStore((state) => ({
    activeConversationId: state.activeConversationId,
    isGenerating: state.isGenerating,
    streamingContent: state.streamingContent,
  }));

/**
 * Helper hook to get settings
 */
export const useSettings = () => useAppStore((state) => state.settings);

/**
 * Helper hook to get active conversation
 */
export const useActiveConversation = () => {
  const activeId = useAppStore((state) => state.activeConversationId);
  const conversations = useAppStore((state) => state.conversations);
  return activeId ? conversations.get(activeId) ?? null : null;
};

/**
 * Helper hook to get conversations list
 */
export const useConversationsList = () => {
  const conversations = useAppStore((state) => state.conversations);
  return Array.from(conversations.values()).sort(
    (a, b) => b.updatedAt - a.updatedAt
  );
};

// Re-export types
export type {
  AppState,
  Conversation,
  ConversationId,
  AppSettings,
  AppError,
} from "./state.types";

export {
  DEFAULT_APP_SETTINGS,
  generateConversationId,
  createConversation as createConversationObject,
  createAppError,
} from "./state.types";
