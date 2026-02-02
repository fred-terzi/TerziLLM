/**
 * Unit tests for Zustand State Management
 *
 * Comprehensive tests covering all state slices, actions,
 * and edge cases for the TerziLLM state store.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";

import { useAppStore } from "./state";
import {
  DEFAULT_APP_SETTINGS,
  generateConversationId,
  createConversation,
  createAppError,
} from "./state.types";
import { generateMessageId } from "./types";
import type { ChatMessage, ModelId } from "./types";

// Helper to create test messages
function createTestMessage(
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

// Reset store before each test
beforeEach(() => {
  act(() => {
    useAppStore.getState().resetStore();
  });
});

describe("State Types Utilities", () => {
  describe("generateConversationId", () => {
    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateConversationId());
      }
      expect(ids.size).toBe(100);
    });

    it("should start with conv_ prefix", () => {
      const id = generateConversationId();
      expect(id.startsWith("conv_")).toBe(true);
    });
  });

  describe("createConversation", () => {
    it("should create conversation with default values", () => {
      const conv = createConversation();
      expect(conv.id).toBeDefined();
      expect(conv.title).toBe("New Conversation");
      expect(conv.messages).toEqual([]);
      expect(conv.modelId).toBeNull();
      expect(conv.createdAt).toBeDefined();
      expect(conv.updatedAt).toBeDefined();
    });

    it("should create conversation with specified model", () => {
      const modelId: ModelId = "Llama-3.2-3B-Instruct-q4f32_1-MLC";
      const conv = createConversation(modelId);
      expect(conv.modelId).toBe(modelId);
    });
  });

  describe("createAppError", () => {
    it("should create error with correct structure", () => {
      const error = createAppError("TEST_ERROR", "Test error message");
      expect(error.code).toBe("TEST_ERROR");
      expect(error.message).toBe("Test error message");
      expect(error.timestamp).toBeDefined();
      expect(error.dismissed).toBe(false);
    });
  });
});

describe("Engine Slice", () => {
  describe("Initial State", () => {
    it("should have idle status initially", () => {
      const state = useAppStore.getState();
      expect(state.engineStatus).toBe("idle");
    });

    it("should have no current model initially", () => {
      const state = useAppStore.getState();
      expect(state.currentModel).toBeNull();
    });

    it("should have no loading progress initially", () => {
      const state = useAppStore.getState();
      expect(state.loadingProgress).toBeNull();
    });

    it("should have no engine error initially", () => {
      const state = useAppStore.getState();
      expect(state.engineError).toBeNull();
    });
  });

  describe("setEngineStatus", () => {
    it("should update engine status to loading", () => {
      act(() => {
        useAppStore.getState().setEngineStatus("loading");
      });
      expect(useAppStore.getState().engineStatus).toBe("loading");
    });

    it("should update engine status to ready", () => {
      act(() => {
        useAppStore.getState().setEngineStatus("ready");
      });
      expect(useAppStore.getState().engineStatus).toBe("ready");
    });

    it("should update engine status to error", () => {
      act(() => {
        useAppStore.getState().setEngineStatus("error");
      });
      expect(useAppStore.getState().engineStatus).toBe("error");
    });

    it("should update engine status to generating", () => {
      act(() => {
        useAppStore.getState().setEngineStatus("generating");
      });
      expect(useAppStore.getState().engineStatus).toBe("generating");
    });
  });

  describe("setCurrentModel", () => {
    it("should set current model", () => {
      const modelId: ModelId = "Llama-3.2-3B-Instruct-q4f32_1-MLC";
      act(() => {
        useAppStore.getState().setCurrentModel(modelId);
      });
      expect(useAppStore.getState().currentModel).toBe(modelId);
    });

    it("should clear current model when set to null", () => {
      act(() => {
        useAppStore.getState().setCurrentModel("Llama-3.2-3B-Instruct-q4f32_1-MLC");
        useAppStore.getState().setCurrentModel(null);
      });
      expect(useAppStore.getState().currentModel).toBeNull();
    });
  });

  describe("setLoadingProgress", () => {
    it("should set loading progress", () => {
      const progress = { text: "Loading model...", progress: 50, timeElapsed: 1000 };
      act(() => {
        useAppStore.getState().setLoadingProgress(progress);
      });
      expect(useAppStore.getState().loadingProgress).toEqual(progress);
    });

    it("should clear loading progress", () => {
      act(() => {
        useAppStore.getState().setLoadingProgress({ text: "Loading...", progress: 50 });
        useAppStore.getState().setLoadingProgress(null);
      });
      expect(useAppStore.getState().loadingProgress).toBeNull();
    });
  });

  describe("setEngineError", () => {
    it("should set engine error", () => {
      const error = createAppError("TEST_ERROR", "Test error");
      act(() => {
        useAppStore.getState().setEngineError(error);
      });
      expect(useAppStore.getState().engineError).toEqual(error);
    });

    it("should clear engine error", () => {
      act(() => {
        useAppStore.getState().setEngineError(createAppError("TEST", "Test"));
        useAppStore.getState().setEngineError(null);
      });
      expect(useAppStore.getState().engineError).toBeNull();
    });
  });

  describe("clearEngineError", () => {
    it("should mark error as dismissed", () => {
      const error = createAppError("TEST_ERROR", "Test error");
      act(() => {
        useAppStore.getState().setEngineError(error);
        useAppStore.getState().clearEngineError();
      });
      expect(useAppStore.getState().engineError?.dismissed).toBe(true);
    });

    it("should handle clearing when no error exists", () => {
      act(() => {
        useAppStore.getState().clearEngineError();
      });
      expect(useAppStore.getState().engineError).toBeNull();
    });
  });
});

describe("Conversation Slice", () => {
  describe("Initial State", () => {
    it("should have empty conversations initially", () => {
      const state = useAppStore.getState();
      expect(state.conversations.size).toBe(0);
    });

    it("should have no active conversation initially", () => {
      const state = useAppStore.getState();
      expect(state.activeConversationId).toBeNull();
    });

    it("should not be generating initially", () => {
      const state = useAppStore.getState();
      expect(state.isGenerating).toBe(false);
    });

    it("should have empty streaming content initially", () => {
      const state = useAppStore.getState();
      expect(state.streamingContent).toBe("");
    });
  });

  describe("createConversation", () => {
    it("should create a new conversation", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
      });
      expect(useAppStore.getState().conversations.size).toBe(1);
      expect(useAppStore.getState().conversations.has(convId!)).toBe(true);
    });

    it("should set new conversation as active", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
      });
      expect(useAppStore.getState().activeConversationId).toBe(convId!);
    });

    it("should use default model from settings", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.modelId).toBe(DEFAULT_APP_SETTINGS.defaultModelId);
    });

    it("should use specified model when provided", () => {
      const modelId: ModelId = "Phi-3.5-mini-instruct-q4f32_1-MLC";
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation(modelId);
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.modelId).toBe(modelId);
    });

    it("should create multiple conversations", () => {
      act(() => {
        useAppStore.getState().createConversation();
        useAppStore.getState().createConversation();
        useAppStore.getState().createConversation();
      });
      expect(useAppStore.getState().conversations.size).toBe(3);
    });
  });

  describe("deleteConversation", () => {
    it("should delete a conversation", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().deleteConversation(convId);
      });
      expect(useAppStore.getState().conversations.size).toBe(0);
    });

    it("should clear active conversation when deleting active", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().deleteConversation(convId);
      });
      expect(useAppStore.getState().activeConversationId).toBeNull();
    });

    it("should select another conversation when deleting active with multiple", () => {
      let convId1: string, convId2: string;
      act(() => {
        convId1 = useAppStore.getState().createConversation();
        convId2 = useAppStore.getState().createConversation();
        useAppStore.getState().deleteConversation(convId2);
      });
      expect(useAppStore.getState().activeConversationId).toBe(convId1!);
    });

    it("should not affect other conversations", () => {
      let convId1: string, convId2: string;
      act(() => {
        convId1 = useAppStore.getState().createConversation();
        convId2 = useAppStore.getState().createConversation();
        useAppStore.getState().deleteConversation(convId1);
      });
      expect(useAppStore.getState().conversations.has(convId2!)).toBe(true);
    });

    it("should handle deleting non-existent conversation", () => {
      act(() => {
        useAppStore.getState().deleteConversation("non-existent-id");
      });
      // Should not throw
      expect(useAppStore.getState().conversations.size).toBe(0);
    });
  });

  describe("setActiveConversation", () => {
    it("should set active conversation", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().setActiveConversation(null);
        useAppStore.getState().setActiveConversation(convId);
      });
      expect(useAppStore.getState().activeConversationId).toBe(convId!);
    });

    it("should clear active conversation when set to null", () => {
      act(() => {
        useAppStore.getState().createConversation();
        useAppStore.getState().setActiveConversation(null);
      });
      expect(useAppStore.getState().activeConversationId).toBeNull();
    });

    it("should clear streaming content when switching", () => {
      let convId1: string, convId2: string;
      act(() => {
        convId1 = useAppStore.getState().createConversation();
        convId2 = useAppStore.getState().createConversation();
        useAppStore.getState().setStreamingContent("test content");
        useAppStore.getState().setActiveConversation(convId1);
      });
      expect(useAppStore.getState().streamingContent).toBe("");
    });
  });

  describe("addMessage", () => {
    it("should add message to conversation", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().addMessage(convId, createTestMessage("user", "Hello"));
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.messages.length).toBe(1);
      expect(conv?.messages[0].content).toBe("Hello");
    });

    it("should update conversation timestamp when adding message", () => {
      let convId: string;
      let originalUpdatedAt: number;
      act(() => {
        convId = useAppStore.getState().createConversation();
        originalUpdatedAt = useAppStore.getState().conversations.get(convId)!.updatedAt;
        // Add message - updatedAt should be >= original
        useAppStore.getState().addMessage(convId, createTestMessage("user", "Hello"));
      });

      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.updatedAt).toBeGreaterThanOrEqual(originalUpdatedAt!);
    });

    it("should auto-generate title from first user message", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().addMessage(
          convId,
          createTestMessage("user", "What is the meaning of life?")
        );
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.title).toBe("What is the meaning of life?");
    });

    it("should truncate long titles with ellipsis", () => {
      let convId: string;
      const longMessage = "A".repeat(100);
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().addMessage(convId, createTestMessage("user", longMessage));
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.title.length).toBe(53); // 50 chars + "..."
      expect(conv?.title.endsWith("...")).toBe(true);
    });

    it("should not change title on subsequent messages", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().addMessage(convId, createTestMessage("user", "First message"));
        useAppStore.getState().addMessage(convId, createTestMessage("user", "Second message"));
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.title).toBe("First message");
    });

    it("should handle adding message to non-existent conversation", () => {
      act(() => {
        useAppStore.getState().addMessage("non-existent", createTestMessage("user", "Hello"));
      });
      // Should not throw, just return empty update
      expect(useAppStore.getState().conversations.size).toBe(0);
    });
  });

  describe("updateMessage", () => {
    it("should update message content", () => {
      let convId: string;
      let messageId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        const msg = createTestMessage("user", "Original");
        messageId = msg.id;
        useAppStore.getState().addMessage(convId, msg);
        useAppStore.getState().updateMessage(convId, messageId, "Updated");
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.messages[0].content).toBe("Updated");
    });

    it("should handle updating non-existent message", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().addMessage(convId, createTestMessage("user", "Hello"));
        useAppStore.getState().updateMessage(convId, "non-existent-msg", "Updated");
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.messages[0].content).toBe("Hello"); // Unchanged
    });
  });

  describe("deleteMessage", () => {
    it("should delete message from conversation", () => {
      let convId: string;
      let messageId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        const msg = createTestMessage("user", "To delete");
        messageId = msg.id;
        useAppStore.getState().addMessage(convId, msg);
        useAppStore.getState().deleteMessage(convId, messageId);
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.messages.length).toBe(0);
    });

    it("should handle deleting non-existent message", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().addMessage(convId, createTestMessage("user", "Hello"));
        useAppStore.getState().deleteMessage(convId, "non-existent");
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.messages.length).toBe(1);
    });
  });

  describe("clearMessages", () => {
    it("should clear all messages in conversation", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().addMessage(convId, createTestMessage("user", "Message 1"));
        useAppStore.getState().addMessage(convId, createTestMessage("assistant", "Response 1"));
        useAppStore.getState().addMessage(convId, createTestMessage("user", "Message 2"));
        useAppStore.getState().clearMessages(convId);
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.messages.length).toBe(0);
    });
  });

  describe("updateConversationTitle", () => {
    it("should update conversation title", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
        useAppStore.getState().updateConversationTitle(convId, "Custom Title");
      });
      const conv = useAppStore.getState().conversations.get(convId!);
      expect(conv?.title).toBe("Custom Title");
    });
  });

  describe("setIsGenerating", () => {
    it("should set generating state to true", () => {
      act(() => {
        useAppStore.getState().setIsGenerating(true);
      });
      expect(useAppStore.getState().isGenerating).toBe(true);
    });

    it("should set generating state to false", () => {
      act(() => {
        useAppStore.getState().setIsGenerating(true);
        useAppStore.getState().setIsGenerating(false);
      });
      expect(useAppStore.getState().isGenerating).toBe(false);
    });

    it("should clear streaming content when starting generation", () => {
      act(() => {
        useAppStore.getState().setStreamingContent("old content");
        useAppStore.getState().setIsGenerating(true);
      });
      expect(useAppStore.getState().streamingContent).toBe("");
    });
  });

  describe("setStreamingContent", () => {
    it("should update streaming content", () => {
      act(() => {
        useAppStore.getState().setStreamingContent("Streaming...");
      });
      expect(useAppStore.getState().streamingContent).toBe("Streaming...");
    });

    it("should append to streaming content", () => {
      act(() => {
        useAppStore.getState().setStreamingContent("Hello");
        useAppStore.getState().setStreamingContent("Hello world");
      });
      expect(useAppStore.getState().streamingContent).toBe("Hello world");
    });
  });

  describe("getActiveConversation", () => {
    it("should return active conversation", () => {
      let convId: string;
      act(() => {
        convId = useAppStore.getState().createConversation();
      });
      const activeConv = useAppStore.getState().getActiveConversation();
      expect(activeConv?.id).toBe(convId!);
    });

    it("should return null when no active conversation", () => {
      const activeConv = useAppStore.getState().getActiveConversation();
      expect(activeConv).toBeNull();
    });
  });

  describe("getConversationsList", () => {
    it("should return empty array when no conversations", () => {
      const list = useAppStore.getState().getConversationsList();
      expect(list).toEqual([]);
    });

    it("should return conversations sorted by updatedAt descending", () => {
      let convId1: string, convId2: string, convId3: string;
      act(() => {
        convId1 = useAppStore.getState().createConversation();
        convId2 = useAppStore.getState().createConversation();
        convId3 = useAppStore.getState().createConversation();
        // Update first conversation to make it most recent
        useAppStore.getState().addMessage(convId1, createTestMessage("user", "Hello"));
      });
      const list = useAppStore.getState().getConversationsList();
      expect(list[0].id).toBe(convId1!); // Most recently updated
    });
  });
});

describe("Settings Slice", () => {
  describe("Initial State", () => {
    it("should have default settings", () => {
      const state = useAppStore.getState();
      expect(state.settings).toEqual(DEFAULT_APP_SETTINGS);
    });
  });

  describe("updateSettings", () => {
    it("should update single setting", () => {
      act(() => {
        useAppStore.getState().updateSettings({ temperature: 0.5 });
      });
      expect(useAppStore.getState().settings.temperature).toBe(0.5);
    });

    it("should update multiple settings", () => {
      act(() => {
        useAppStore.getState().updateSettings({
          temperature: 0.3,
          topP: 0.8,
          theme: "dark",
        });
      });
      const settings = useAppStore.getState().settings;
      expect(settings.temperature).toBe(0.3);
      expect(settings.topP).toBe(0.8);
      expect(settings.theme).toBe("dark");
    });

    it("should preserve other settings when updating", () => {
      const originalSystemPrompt = useAppStore.getState().settings.systemPrompt;
      act(() => {
        useAppStore.getState().updateSettings({ temperature: 0.1 });
      });
      expect(useAppStore.getState().settings.systemPrompt).toBe(originalSystemPrompt);
    });
  });

  describe("resetSettings", () => {
    it("should reset all settings to defaults", () => {
      act(() => {
        useAppStore.getState().updateSettings({
          temperature: 0.1,
          topP: 0.5,
          maxTokens: 100,
          theme: "dark",
          streamResponses: false,
        });
        useAppStore.getState().resetSettings();
      });
      expect(useAppStore.getState().settings).toEqual(DEFAULT_APP_SETTINGS);
    });
  });

  describe("getEngineConfig", () => {
    it("should return engine config from settings", () => {
      const config = useAppStore.getState().getEngineConfig();
      expect(config.modelId).toBe(DEFAULT_APP_SETTINGS.defaultModelId);
      expect(config.temperature).toBe(DEFAULT_APP_SETTINGS.temperature);
      expect(config.topP).toBe(DEFAULT_APP_SETTINGS.topP);
      expect(config.maxTokens).toBe(DEFAULT_APP_SETTINGS.maxTokens);
      expect(config.systemPrompt).toBe(DEFAULT_APP_SETTINGS.systemPrompt);
    });

    it("should use specified model when provided", () => {
      const modelId: ModelId = "Phi-3.5-mini-instruct-q4f32_1-MLC";
      const config = useAppStore.getState().getEngineConfig(modelId);
      expect(config.modelId).toBe(modelId);
    });

    it("should reflect updated settings", () => {
      act(() => {
        useAppStore.getState().updateSettings({
          temperature: 0.3,
          systemPrompt: "Custom prompt",
        });
      });
      const config = useAppStore.getState().getEngineConfig();
      expect(config.temperature).toBe(0.3);
      expect(config.systemPrompt).toBe("Custom prompt");
    });
  });
});

describe("Global Store Actions", () => {
  describe("resetStore", () => {
    it("should reset all state to initial values", () => {
      // Set up some state
      act(() => {
        useAppStore.getState().setEngineStatus("ready");
        useAppStore.getState().setCurrentModel("Llama-3.2-3B-Instruct-q4f32_1-MLC");
        useAppStore.getState().createConversation();
        useAppStore.getState().updateSettings({ temperature: 0.1 });
        useAppStore.getState().setIsGenerating(true);
        useAppStore.getState().setStreamingContent("test");

        // Reset
        useAppStore.getState().resetStore();
      });

      const state = useAppStore.getState();
      expect(state.engineStatus).toBe("idle");
      expect(state.currentModel).toBeNull();
      expect(state.conversations.size).toBe(0);
      expect(state.activeConversationId).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.streamingContent).toBe("");
      expect(state.settings).toEqual(DEFAULT_APP_SETTINGS);
    });
  });
});

describe("Store Subscriptions", () => {
  it("should notify subscribers on state change", () => {
    const listener = vi.fn();
    const unsubscribe = useAppStore.subscribe(
      (state) => state.engineStatus,
      listener
    );

    act(() => {
      useAppStore.getState().setEngineStatus("loading");
    });

    expect(listener).toHaveBeenCalledWith("loading", "idle");
    unsubscribe();
  });

  it("should not notify when value unchanged", () => {
    const listener = vi.fn();
    const unsubscribe = useAppStore.subscribe(
      (state) => state.engineStatus,
      listener
    );

    act(() => {
      useAppStore.getState().setEngineStatus("idle"); // Same as initial
    });

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe("Edge Cases", () => {
  it("should handle rapid state updates", () => {
    act(() => {
      for (let i = 0; i < 100; i++) {
        useAppStore.getState().setStreamingContent(`content ${i}`);
      }
    });
    expect(useAppStore.getState().streamingContent).toBe("content 99");
  });

  it("should handle empty strings in messages", () => {
    let convId: string;
    act(() => {
      convId = useAppStore.getState().createConversation();
      useAppStore.getState().addMessage(convId, createTestMessage("user", ""));
    });
    const conv = useAppStore.getState().conversations.get(convId!);
    expect(conv?.messages[0].content).toBe("");
  });

  it("should handle special characters in conversation title", () => {
    let convId: string;
    act(() => {
      convId = useAppStore.getState().createConversation();
      useAppStore.getState().updateConversationTitle(convId, "Test <script>alert('xss')</script>");
    });
    const conv = useAppStore.getState().conversations.get(convId!);
    expect(conv?.title).toBe("Test <script>alert('xss')</script>");
  });

  it("should handle unicode in messages", () => {
    let convId: string;
    act(() => {
      convId = useAppStore.getState().createConversation();
      useAppStore.getState().addMessage(convId, createTestMessage("user", "Hello 你好 مرحبا 🎉"));
    });
    const conv = useAppStore.getState().conversations.get(convId!);
    expect(conv?.messages[0].content).toBe("Hello 你好 مرحبا 🎉");
  });
});
