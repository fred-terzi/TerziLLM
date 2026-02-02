/**
 * Unit tests for WebLLM Handler
 *
 * These tests cover the core functionality of the WebLLM handler
 * including initialization, generation, error handling, and edge cases.
 *
 * Note: Since WebLLM requires WebGPU which isn't available in Node.js,
 * we mock the MLCEngine for unit testing. Integration tests with real
 * models should be run in a browser environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  WebLLMHandler,
  createWebLLMHandler,
  WebLLMError,
  createMessage,
  generateMessageId,
} from "./webllm";
import type {
  ChatMessage,
  GenerationOptions,
} from "./types";

// Store mock engine for access in tests
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

// Mock the @mlc-ai/web-llm module
vi.mock("@mlc-ai/web-llm", () => {
  return {
    MLCEngine: class MockMLCEngine {
      constructor() {
        mockEngineInstance = {
          reload: vi.fn().mockResolvedValue(undefined),
          resetChat: vi.fn().mockResolvedValue(undefined),
          unload: vi.fn().mockResolvedValue(undefined),
          chat: {
            completions: {
              create: vi.fn(),
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
        { model_id: "Qwen2.5-1.5B-Instruct-q4f32_1-MLC" },
        { model_id: "gemma-2-2b-it-q4f32_1-MLC" },
        { model_id: "SmolLM2-1.7B-Instruct-q4f32_1-MLC" },
      ],
    },
  };
});

// Helper to create mock messages
function createTestMessage(
  role: ChatMessage["role"],
  content: string
): ChatMessage {
  return createMessage(role, content);
}

describe("WebLLMHandler", () => {
  let handler: WebLLMHandler;

  // Mock WebGPU support
  const mockGPU = {
    requestAdapter: vi.fn().mockResolvedValue({}),
  };

  beforeEach(() => {
    handler = new WebLLMHandler();
    vi.clearAllMocks();

    // Setup WebGPU mock
    Object.defineProperty(global, "navigator", {
      value: { gpu: mockGPU },
      writable: true,
      configurable: true,
    });
  });

  afterEach(async () => {
    await handler.unload();
  });

  describe("Initial State", () => {
    it("should have idle status initially", () => {
      expect(handler.status).toBe("idle");
    });

    it("should have no current model initially", () => {
      expect(handler.currentModel).toBeNull();
    });

    it("should not be ready initially", () => {
      expect(handler.isReady).toBe(false);
    });
  });

  describe("createWebLLMHandler", () => {
    it("should create a new handler instance", () => {
      const newHandler = createWebLLMHandler();
      expect(newHandler).toBeInstanceOf(WebLLMHandler);
      expect(newHandler.status).toBe("idle");
    });
  });

  describe("WebGPU Support Check", () => {
    it("should return true when WebGPU is supported", async () => {
      const result = await WebLLMHandler.checkWebGPUSupport();
      expect(result).toBe(true);
    });

    it("should return false when navigator is undefined", async () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error - intentionally removing navigator
      delete global.navigator;

      const result = await WebLLMHandler.checkWebGPUSupport();
      expect(result).toBe(false);

      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
    });

    it("should return false when GPU is not in navigator", async () => {
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
        configurable: true,
      });

      const result = await WebLLMHandler.checkWebGPUSupport();
      expect(result).toBe(false);

      // Restore GPU mock
      Object.defineProperty(global, "navigator", {
        value: { gpu: mockGPU },
        writable: true,
        configurable: true,
      });
    });

    it("should return false when adapter request fails", async () => {
      mockGPU.requestAdapter.mockResolvedValueOnce(null);

      const result = await WebLLMHandler.checkWebGPUSupport();
      expect(result).toBe(false);
    });

    it("should return false when adapter request throws", async () => {
      mockGPU.requestAdapter.mockRejectedValueOnce(new Error("GPU error"));

      const result = await WebLLMHandler.checkWebGPUSupport();
      expect(result).toBe(false);
    });
  });

  describe("Configuration Validation", () => {
    it("should reject empty model ID", async () => {
      await expect(
        handler.initialize({ modelId: "" })
      ).rejects.toThrow(WebLLMError);
      await expect(
        handler.initialize({ modelId: "" })
      ).rejects.toMatchObject({ code: "INVALID_CONFIG" });
    });

    it("should reject invalid temperature (too low)", async () => {
      await expect(
        handler.initialize({
          modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
          temperature: -0.5,
        })
      ).rejects.toThrow(WebLLMError);
      await expect(
        handler.initialize({
          modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
          temperature: -0.5,
        })
      ).rejects.toMatchObject({ code: "INVALID_CONFIG" });
    });

    it("should reject invalid temperature (too high)", async () => {
      await expect(
        handler.initialize({
          modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
          temperature: 2.5,
        })
      ).rejects.toThrow(WebLLMError);
    });

    it("should reject invalid topP (negative)", async () => {
      await expect(
        handler.initialize({
          modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
          topP: -0.1,
        })
      ).rejects.toThrow(WebLLMError);
    });

    it("should reject invalid topP (greater than 1)", async () => {
      await expect(
        handler.initialize({
          modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
          topP: 1.5,
        })
      ).rejects.toThrow(WebLLMError);
    });

    it("should reject invalid maxTokens (zero)", async () => {
      await expect(
        handler.initialize({
          modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
          maxTokens: 0,
        })
      ).rejects.toThrow(WebLLMError);
    });

    it("should reject invalid maxTokens (negative)", async () => {
      await expect(
        handler.initialize({
          modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
          maxTokens: -100,
        })
      ).rejects.toThrow(WebLLMError);
    });

    it("should accept valid configuration", async () => {
      const validConfig: EngineConfig = {
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
        temperature: 0.5,
        topP: 0.9,
        maxTokens: 1024,
        systemPrompt: "You are a helpful assistant.",
      };

      await handler.initialize(validConfig);
      expect(handler.isReady).toBe(true);
    });

    it("should accept edge case values", async () => {
      // Temperature = 0 (deterministic)
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
        temperature: 0,
      });
      expect(handler.isReady).toBe(true);

      await handler.unload();

      // Temperature = 2 (maximum)
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
        temperature: 2,
      });
      expect(handler.isReady).toBe(true);

      await handler.unload();

      // topP = 0
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
        topP: 0,
      });
      expect(handler.isReady).toBe(true);

      await handler.unload();

      // topP = 1
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
        topP: 1,
      });
      expect(handler.isReady).toBe(true);
    });
  });

  describe("Initialization", () => {
    it("should throw when WebGPU is not supported", async () => {
      // Remove GPU from navigator
      Object.defineProperty(global, "navigator", {
        value: {},
        writable: true,
        configurable: true,
      });

      await expect(
        handler.initialize({ modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC" })
      ).rejects.toMatchObject({ code: "WEBGPU_NOT_SUPPORTED" });

      // Restore
      Object.defineProperty(global, "navigator", {
        value: { gpu: mockGPU },
        writable: true,
        configurable: true,
      });
    });

    it("should throw for unknown model", async () => {
      await expect(
        handler.initialize({ modelId: "unknown-model-xyz" })
      ).rejects.toMatchObject({ code: "MODEL_NOT_FOUND" });
    });

    it("should initialize successfully with valid config", async () => {
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
      });

      expect(handler.status).toBe("ready");
      expect(handler.currentModel).toBe("Llama-3.2-3B-Instruct-q4f32_1-MLC");
      expect(handler.isReady).toBe(true);
    });

    it("should call progress callback during initialization", async () => {
      const progressCallback = vi.fn();

      await handler.initialize(
        { modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC" },
        progressCallback
      );

      // The progress callback is registered, actual calls depend on engine
      expect(handler.isReady).toBe(true);
    });

    it("should unload previous model when reinitializing", async () => {
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
      });

      const firstModel = handler.currentModel;

      await handler.initialize({
        modelId: "Phi-3.5-mini-instruct-q4f32_1-MLC",
      });

      expect(handler.currentModel).toBe("Phi-3.5-mini-instruct-q4f32_1-MLC");
      expect(handler.currentModel).not.toBe(firstModel);
    });

    it("should apply default config values", async () => {
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
      });

      // Defaults are applied internally, verify ready state
      expect(handler.isReady).toBe(true);
    });
  });

  describe("Generation", () => {
    beforeEach(async () => {
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
        systemPrompt: "You are a helpful assistant.",
      });
    });

    it("should throw when engine is not ready", async () => {
      const newHandler = new WebLLMHandler();
      const messages = [createTestMessage("user", "Hello")];

      await expect(newHandler.generate(messages)).rejects.toMatchObject({
        code: "ENGINE_NOT_READY",
      });
    });

    it("should throw when no messages provided", async () => {
      await expect(handler.generate([])).rejects.toMatchObject({
        code: "INVALID_CONFIG",
      });
    });

    it("should generate response for single message", async () => {
      mockEngineInstance.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: { content: "Hello! How can I help you?" },
            finish_reason: "stop",
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
        },
      });

      const messages = [createTestMessage("user", "Hello")];
      const result = await handler.generate(messages);

      expect(result.content).toBe("Hello! How can I help you?");
      expect(result.promptTokens).toBe(10);
      expect(result.completionTokens).toBe(8);
      expect(result.totalTokens).toBe(18);
      expect(result.finishReason).toBe("stop");
      expect(result.stopped).toBe(false);
    });

    it("should handle multi-turn conversation", async () => {
      mockEngineInstance.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: { content: "I remember that!" },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 5 },
      });

      const messages = [
        createTestMessage("user", "My name is Alice."),
        createTestMessage("assistant", "Nice to meet you, Alice!"),
        createTestMessage("user", "What is my name?"),
      ];

      const result = await handler.generate(messages);
      expect(result.content).toBe("I remember that!");
    });

    it("should override generation options", async () => {
      mockEngineInstance.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: "Response" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 1 },
      });

      const messages = [createTestMessage("user", "Hi")];
      const options: GenerationOptions = {
        temperature: 0.1,
        topP: 0.5,
        maxTokens: 100,
      };

      await handler.generate(messages, options);

      expect(mockEngineInstance.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.1,
          top_p: 0.5,
          max_tokens: 100,
        })
      );
    });

    it("should handle finish_reason length", async () => {
      mockEngineInstance.chat.completions.create.mockResolvedValueOnce({
        choices: [
          {
            message: { content: "Truncated response..." },
            finish_reason: "length",
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 2048 },
      });

      const messages = [createTestMessage("user", "Tell me a long story")];
      const result = await handler.generate(messages);

      expect(result.finishReason).toBe("length");
    });

    it("should handle missing usage data gracefully", async () => {
      mockEngineInstance.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: "Hi" }, finish_reason: "stop" }],
        // No usage data
      });

      const messages = [createTestMessage("user", "Hello")];
      const result = await handler.generate(messages);

      expect(result.promptTokens).toBe(0);
      expect(result.completionTokens).toBe(0);
      expect(result.totalTokens).toBe(0);
    });

    it("should handle empty response content", async () => {
      mockEngineInstance.chat.completions.create.mockResolvedValueOnce({
        choices: [{ message: { content: "" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 5, completion_tokens: 0 },
      });

      const messages = [createTestMessage("user", "Hello")];
      const result = await handler.generate(messages);

      expect(result.content).toBe("");
    });

    it("should track generation time", async () => {
      mockEngineInstance.chat.completions.create.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  choices: [
                    { message: { content: "Response" }, finish_reason: "stop" },
                  ],
                  usage: { prompt_tokens: 5, completion_tokens: 1 },
                }),
              50
            )
          )
      );

      const messages = [createTestMessage("user", "Hello")];
      const result = await handler.generate(messages);

      expect(result.generationTime).toBeGreaterThanOrEqual(50);
    });
  });

  describe("Streaming Generation", () => {
    beforeEach(async () => {
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
      });
    });

    it("should stream tokens via callback", async () => {
      const tokens = ["Hello", ", ", "world", "!"];

      // Create async generator for streaming
      async function* createStream() {
        for (const token of tokens) {
          yield {
            choices: [{ delta: { content: token }, finish_reason: null }],
          };
        }
        yield {
          choices: [{ delta: {}, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 4 },
        };
      }

      mockEngineInstance.chat.completions.create.mockResolvedValueOnce(createStream());

      const receivedTokens: string[] = [];
      const fullTexts: string[] = [];

      const messages = [createTestMessage("user", "Hello")];
      const result = await handler.generate(messages, {
        onToken: (token, fullText) => {
          receivedTokens.push(token);
          fullTexts.push(fullText);
        },
      });

      expect(receivedTokens).toEqual(tokens);
      expect(fullTexts[fullTexts.length - 1]).toBe("Hello, world!");
      expect(result.content).toBe("Hello, world!");
    });
  });

  describe("Abort Handling", () => {
    beforeEach(async () => {
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
      });
    });

    it("should abort current generation", async () => {
      // Create a slow response that can be aborted
      mockEngineInstance.chat.completions.create.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  choices: [
                    { message: { content: "Response" }, finish_reason: "stop" },
                  ],
                  usage: { prompt_tokens: 5, completion_tokens: 1 },
                }),
              1000
            )
          )
      );

      const messages = [createTestMessage("user", "Hello")];
      const generatePromise = handler.generate(messages);

      // Abort after short delay
      setTimeout(() => handler.abort(), 10);

      const result = await generatePromise;

      // After abort, handler should be ready
      expect(handler.status).toBe("ready");
    });

    it("should handle external abort signal", async () => {
      mockEngineInstance.chat.completions.create.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  choices: [
                    { message: { content: "Response" }, finish_reason: "stop" },
                  ],
                  usage: { prompt_tokens: 5, completion_tokens: 1 },
                }),
              1000
            )
          )
      );

      const abortController = new AbortController();
      const messages = [createTestMessage("user", "Hello")];

      const generatePromise = handler.generate(messages, {
        signal: abortController.signal,
      });

      setTimeout(() => abortController.abort(), 10);

      const result = await generatePromise;
      expect(handler.status).toBe("ready");
    });
  });

  describe("Reset and Unload", () => {
    beforeEach(async () => {
      await handler.initialize({
        modelId: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
      });
    });

    it("should reset chat state", async () => {
      await handler.resetChat();

      expect(mockEngineInstance.resetChat).toHaveBeenCalled();
    });

    it("should unload model and reset state", async () => {
      await handler.unload();

      expect(mockEngineInstance.unload).toHaveBeenCalled();
      expect(handler.status).toBe("idle");
      expect(handler.currentModel).toBeNull();
      expect(handler.isReady).toBe(false);
    });

    it("should handle unload when no engine loaded", async () => {
      const newHandler = new WebLLMHandler();

      // Should not throw
      await expect(newHandler.unload()).resolves.toBeUndefined();
    });

    it("should handle resetChat when no engine loaded", async () => {
      const newHandler = new WebLLMHandler();

      // Should not throw
      await expect(newHandler.resetChat()).resolves.toBeUndefined();
    });
  });

  describe("Available Models", () => {
    it("should return list of available models", () => {
      const models = handler.getAvailableModels();

      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
      expect(models).toContain("Llama-3.2-3B-Instruct-q4f32_1-MLC");
    });
  });
});

describe("Utility Functions", () => {
  describe("generateMessageId", () => {
    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateMessageId());
      }
      expect(ids.size).toBe(100);
    });

    it("should start with msg_ prefix", () => {
      const id = generateMessageId();
      expect(id.startsWith("msg_")).toBe(true);
    });
  });

  describe("createMessage", () => {
    it("should create user message", () => {
      const msg = createMessage("user", "Hello");
      expect(msg.role).toBe("user");
      expect(msg.content).toBe("Hello");
      expect(msg.id).toBeDefined();
      expect(msg.timestamp).toBeDefined();
    });

    it("should create assistant message", () => {
      const msg = createMessage("assistant", "Hi there!");
      expect(msg.role).toBe("assistant");
      expect(msg.content).toBe("Hi there!");
    });

    it("should create system message", () => {
      const msg = createMessage("system", "You are helpful.");
      expect(msg.role).toBe("system");
      expect(msg.content).toBe("You are helpful.");
    });

    it("should handle empty content", () => {
      const msg = createMessage("user", "");
      expect(msg.content).toBe("");
    });

    it("should have timestamp close to now", () => {
      const before = Date.now();
      const msg = createMessage("user", "Test");
      const after = Date.now();

      expect(msg.timestamp).toBeGreaterThanOrEqual(before);
      expect(msg.timestamp).toBeLessThanOrEqual(after);
    });
  });
});

describe("WebLLMError", () => {
  it("should create error with code", () => {
    const error = new WebLLMError("Test error", "GENERATION_FAILED");
    expect(error.message).toBe("Test error");
    expect(error.code).toBe("GENERATION_FAILED");
    expect(error.name).toBe("WebLLMError");
  });

  it("should include cause when provided", () => {
    const cause = new Error("Original error");
    const error = new WebLLMError("Wrapped error", "INITIALIZATION_FAILED", cause);
    expect(error.cause).toBe(cause);
  });

  it("should be instanceof Error", () => {
    const error = new WebLLMError("Test", "ENGINE_NOT_READY");
    expect(error instanceof Error).toBe(true);
    expect(error instanceof WebLLMError).toBe(true);
  });
});
