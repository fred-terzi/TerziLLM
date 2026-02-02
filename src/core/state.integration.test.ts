/**
 * Integration tests for State + WebLLM Handler
 *
 * Tests the interaction between Zustand state management
 * and the WebLLM handler for real-world user stories.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { act } from "@testing-library/react";

import { useAppStore } from "./state";
import { WebLLMHandler, createMessage } from "./webllm";
import type { ChatMessage, CompletionResult } from "./types";
import type { Conversation } from "./state.types";

// Mock WebLLM module
vi.mock("@mlc-ai/web-llm", () => {
  let mockEngineInstance: {
    reload: ReturnType<typeof vi.fn>;
    resetChat: ReturnType<typeof vi.fn>;
    unload: ReturnType<typeof vi.fn>;
    chat: {
      completions: {
        create: ReturnType<typeof vi.fn>;
      };
    };
  };

  return {
    MLCEngine: class MockMLCEngine {
      constructor() {
        mockEngineInstance = {
          reload: vi.fn().mockResolvedValue(undefined),
          resetChat: vi.fn().mockResolvedValue(undefined),
          unload: vi.fn().mockResolvedValue(undefined),
          chat: {
            completions: {
              create: vi.fn().mockResolvedValue({
                choices: [
                  {
                    message: { content: "Hello! How can I help you?" },
                    finish_reason: "stop",
                  },
                ],
                usage: { prompt_tokens: 10, completion_tokens: 8 },
              }),
            },
          },
        };
        Object.assign(this, mockEngineInstance);
      }
    },
    prebuiltAppConfig: {
      model_list: [
        { model_id: "Llama-3.1-8B-Instruct-q4f32_1-MLC" },
        { model_id: "Llama-3.2-3B-Instruct-q4f32_1-MLC" },
        { model_id: "Phi-3.5-mini-instruct-q4f32_1-MLC" },
      ],
    },
  };
});

// Mock WebGPU
const mockGPU = {
  requestAdapter: vi.fn().mockResolvedValue({}),
};

beforeEach(() => {
  act(() => {
    useAppStore.getState().resetStore();
  });
  vi.clearAllMocks();
  Object.defineProperty(global, "navigator", {
    value: { gpu: mockGPU },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("User Story: Initialize and Chat", () => {
  it("should initialize engine and update state", async () => {
    const handler = new WebLLMHandler();
    const store = useAppStore.getState();

    // Track loading progress
    act(() => {
      store.setEngineStatus("loading");
    });
    expect(useAppStore.getState().engineStatus).toBe("loading");

    // Initialize
    await handler.initialize({
      modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    });

    // Update state after successful init
    act(() => {
      store.setEngineStatus("ready");
      store.setCurrentModel("Llama-3.2-3B-Instruct-q4f32_1-MLC");
    });

    expect(useAppStore.getState().engineStatus).toBe("ready");
    expect(useAppStore.getState().currentModel).toBe("Llama-3.2-3B-Instruct-q4f32_1-MLC");
  });

  it("should create conversation and send message", async () => {
    const handler = new WebLLMHandler();
    const store = useAppStore.getState();

    // Initialize engine
    await handler.initialize({ modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC" });
    act(() => {
      store.setEngineStatus("ready");
    });

    // Create conversation
    let convId: string;
    act(() => {
      convId = store.createConversation("Llama-3.2-3B-Instruct-q4f32_1-MLC");
    });

    // Add user message
    const userMessage = createMessage("user", "Hello!");
    act(() => {
      store.addMessage(convId!, userMessage);
      store.setIsGenerating(true);
    });

    expect(useAppStore.getState().isGenerating).toBe(true);

    // Get conversation messages for generation
    const conv = useAppStore.getState().conversations.get(convId!);
    expect(conv?.messages.length).toBe(1);

    // Generate response
    const result = await handler.generate(conv!.messages);

    // Add assistant message
    const assistantMessage = createMessage("assistant", result.content);
    act(() => {
      store.addMessage(convId!, assistantMessage);
      store.setIsGenerating(false);
    });

    // Verify final state
    const finalConv = useAppStore.getState().conversations.get(convId!);
    expect(finalConv?.messages.length).toBe(2);
    expect(finalConv?.messages[0].role).toBe("user");
    expect(finalConv?.messages[1].role).toBe("assistant");
    expect(useAppStore.getState().isGenerating).toBe(false);
  });
});

describe("User Story: Multiple Conversations", () => {
  it("should manage multiple conversations independently", () => {
    const store = useAppStore.getState();

    // Create first conversation
    let conv1Id: string, conv2Id: string;
    act(() => {
      conv1Id = store.createConversation();
      store.addMessage(conv1Id, createMessage("user", "Conversation 1 message"));
    });

    // Create second conversation
    act(() => {
      conv2Id = store.createConversation();
      store.addMessage(conv2Id, createMessage("user", "Conversation 2 message"));
    });

    // Verify both exist with correct messages
    const conv1 = useAppStore.getState().conversations.get(conv1Id!);
    const conv2 = useAppStore.getState().conversations.get(conv2Id!);

    expect(conv1?.messages[0].content).toBe("Conversation 1 message");
    expect(conv2?.messages[0].content).toBe("Conversation 2 message");

    // Verify active is the last created
    expect(useAppStore.getState().activeConversationId).toBe(conv2Id!);
  });

  it("should switch between conversations", () => {
    const store = useAppStore.getState();

    let conv1Id: string, conv2Id: string;
    act(() => {
      conv1Id = store.createConversation();
      conv2Id = store.createConversation();
    });

    // Switch to first conversation
    act(() => {
      store.setActiveConversation(conv1Id!);
    });

    expect(useAppStore.getState().activeConversationId).toBe(conv1Id!);

    // Get active conversation helper
    const activeConv = useAppStore.getState().getActiveConversation();
    expect(activeConv?.id).toBe(conv1Id!);
  });
});

describe("User Story: Settings and Generation", () => {
  it("should use settings for engine config", async () => {
    const store = useAppStore.getState();

    // Update settings
    act(() => {
      store.updateSettings({
        temperature: 0.3,
        topP: 0.8,
        maxTokens: 1024,
        systemPrompt: "You are a coding assistant.",
      });
    });

    // Get engine config
    const config = useAppStore.getState().getEngineConfig();

    expect(config.temperature).toBe(0.3);
    expect(config.topP).toBe(0.8);
    expect(config.maxTokens).toBe(1024);
    expect(config.systemPrompt).toBe("You are a coding assistant.");
  });

  it("should override model in engine config", () => {
    const store = useAppStore.getState();

    // Set default model
    act(() => {
      store.updateSettings({
        defaultModelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
      });
    });

    // Get config with override
    const config = useAppStore.getState().getEngineConfig("Phi-3.5-mini-instruct-q4f32_1-MLC");

    expect(config.modelId).toBe("Phi-3.5-mini-instruct-q4f32_1-MLC");
  });
});

describe("User Story: Error Handling", () => {
  it("should track engine errors", () => {
    const store = useAppStore.getState();

    act(() => {
      store.setEngineStatus("error");
      store.setEngineError({
        code: "INITIALIZATION_FAILED",
        message: "WebGPU not supported",
        timestamp: Date.now(),
        dismissed: false,
      });
    });

    const state = useAppStore.getState();
    expect(state.engineStatus).toBe("error");
    expect(state.engineError?.code).toBe("INITIALIZATION_FAILED");
    expect(state.engineError?.dismissed).toBe(false);

    // Dismiss error
    act(() => {
      store.clearEngineError();
    });

    expect(useAppStore.getState().engineError?.dismissed).toBe(true);
  });

  it("should recover from error state", () => {
    const store = useAppStore.getState();

    // Set error state
    act(() => {
      store.setEngineStatus("error");
      store.setEngineError({
        code: "GENERATION_FAILED",
        message: "Out of memory",
        timestamp: Date.now(),
        dismissed: false,
      });
    });

    // Recover
    act(() => {
      store.setEngineError(null);
      store.setEngineStatus("ready");
    });

    const state = useAppStore.getState();
    expect(state.engineStatus).toBe("ready");
    expect(state.engineError).toBeNull();
  });
});

describe("User Story: Streaming Response", () => {
  it("should track streaming content during generation", () => {
    const store = useAppStore.getState();

    let convId: string;
    act(() => {
      convId = store.createConversation();
      store.addMessage(convId, createMessage("user", "Hello"));
      store.setIsGenerating(true);
    });

    // Simulate streaming tokens
    act(() => {
      store.setStreamingContent("Hello");
    });
    expect(useAppStore.getState().streamingContent).toBe("Hello");

    act(() => {
      store.setStreamingContent("Hello, how");
    });
    expect(useAppStore.getState().streamingContent).toBe("Hello, how");

    act(() => {
      store.setStreamingContent("Hello, how can I help?");
    });
    expect(useAppStore.getState().streamingContent).toBe("Hello, how can I help?");

    // Complete generation
    act(() => {
      store.addMessage(convId!, createMessage("assistant", "Hello, how can I help?"));
      store.setIsGenerating(false);
    });

    expect(useAppStore.getState().isGenerating).toBe(false);
    const conv = useAppStore.getState().conversations.get(convId!);
    expect(conv?.messages[1].content).toBe("Hello, how can I help?");
  });
});

describe("User Story: Conversation Management", () => {
  it("should delete conversation and select next", () => {
    const store = useAppStore.getState();

    let conv1Id: string, conv2Id: string, conv3Id: string;
    act(() => {
      conv1Id = store.createConversation();
      conv2Id = store.createConversation();
      conv3Id = store.createConversation();
    });

    // Delete active (conv3)
    act(() => {
      store.deleteConversation(conv3Id!);
    });

    expect(useAppStore.getState().conversations.size).toBe(2);
    expect(useAppStore.getState().conversations.has(conv3Id!)).toBe(false);
    // Should select one of remaining
    expect(useAppStore.getState().activeConversationId).not.toBeNull();
  });

  it("should get sorted conversations list", () => {
    const store = useAppStore.getState();

    let conv1Id: string, conv2Id: string;
    act(() => {
      conv1Id = store.createConversation();
      conv2Id = store.createConversation();
      // Update first conversation to make it most recent
      store.addMessage(conv1Id, createMessage("user", "Updated"));
    });

    const list = useAppStore.getState().getConversationsList();
    expect(list[0].id).toBe(conv1Id!); // Most recently updated
    expect(list[1].id).toBe(conv2Id!);
  });

  it("should clear messages in conversation", () => {
    const store = useAppStore.getState();

    let convId: string;
    act(() => {
      convId = store.createConversation();
      store.addMessage(convId, createMessage("user", "Message 1"));
      store.addMessage(convId, createMessage("assistant", "Response 1"));
      store.addMessage(convId, createMessage("user", "Message 2"));
    });

    expect(useAppStore.getState().conversations.get(convId!)?.messages.length).toBe(3);

    act(() => {
      store.clearMessages(convId!);
    });

    expect(useAppStore.getState().conversations.get(convId!)?.messages.length).toBe(0);
  });
});

describe("User Story: Full Chat Flow", () => {
  it("should complete a full chat interaction", async () => {
    const handler = new WebLLMHandler();
    const store = useAppStore.getState();

    // 1. Initialize
    act(() => {
      store.setEngineStatus("loading");
      store.setLoadingProgress({ text: "Loading model...", progress: 0 });
    });

    await handler.initialize({
      modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    });

    act(() => {
      store.setEngineStatus("ready");
      store.setCurrentModel("Llama-3.2-3B-Instruct-q4f32_1-MLC");
      store.setLoadingProgress(null);
    });

    // 2. Create conversation
    let convId: string;
    act(() => {
      convId = store.createConversation();
    });

    // 3. Send message
    const userMsg = createMessage("user", "What is TypeScript?");
    act(() => {
      store.addMessage(convId!, userMsg);
      store.setIsGenerating(true);
    });

    // 4. Generate response
    const conv = useAppStore.getState().conversations.get(convId!);
    const result = await handler.generate(conv!.messages);

    // 5. Add response
    const assistantMsg = createMessage("assistant", result.content);
    act(() => {
      store.addMessage(convId!, assistantMsg);
      store.setIsGenerating(false);
    });

    // 6. Verify final state
    const finalState = useAppStore.getState();
    expect(finalState.engineStatus).toBe("ready");
    expect(finalState.currentModel).toBe("Llama-3.2-3B-Instruct-q4f32_1-MLC");
    expect(finalState.isGenerating).toBe(false);
    expect(finalState.conversations.get(convId!)?.messages.length).toBe(2);
    expect(finalState.conversations.get(convId!)?.title).toBe("What is TypeScript?");
  });
});

describe("User Story: Reset Application", () => {
  it("should reset entire application state", async () => {
    const handler = new WebLLMHandler();
    const store = useAppStore.getState();

    // Setup some state
    await handler.initialize({ modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC" });

    let convId: string;
    act(() => {
      store.setEngineStatus("ready");
      store.setCurrentModel("Llama-3.2-3B-Instruct-q4f32_1-MLC");
      convId = store.createConversation();
      store.addMessage(convId, createMessage("user", "Hello"));
      store.updateSettings({ temperature: 0.1 });
    });

    // Reset everything
    await handler.unload();
    act(() => {
      store.resetStore();
    });

    // Verify clean state
    const state = useAppStore.getState();
    expect(state.engineStatus).toBe("idle");
    expect(state.currentModel).toBeNull();
    expect(state.conversations.size).toBe(0);
    expect(state.activeConversationId).toBeNull();
    expect(state.settings.temperature).toBe(0.7); // Default
  });
});
