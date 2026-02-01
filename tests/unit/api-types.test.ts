/**
 * Unit tests for API Types
 */
import { describe, it, expect } from 'vitest';
import { ROLES } from '../../src/core/api-types';
import type {
  MessageRole,
  ChatMessage,
  ModelConfig,
  ChatOptions,
  CompletionStats,
  LoadProgress,
  LLMClient,
} from '../../src/core/api-types';

describe('API Types', () => {
  describe('ROLES', () => {
    it('should define all valid roles', () => {
      expect(ROLES).toContain('system');
      expect(ROLES).toContain('user');
      expect(ROLES).toContain('assistant');
      expect(ROLES.length).toBe(3);
    });

    it('should be readonly', () => {
      // TypeScript should prevent modification, but we test runtime behavior
      expect(Object.isFrozen(ROLES)).toBe(false); // as const doesn't freeze
      expect(ROLES[0]).toBe('system');
    });
  });

  describe('ChatMessage', () => {
    it('should accept valid user message', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello',
      };
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
    });

    it('should accept valid assistant message', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: 'Hi there!',
      };
      expect(message.role).toBe('assistant');
    });

    it('should accept multimodal content', () => {
      const message: ChatMessage = {
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,...' } },
        ],
      };
      expect(Array.isArray(message.content)).toBe(true);
    });
  });

  describe('ModelConfig', () => {
    it('should accept minimal config', () => {
      const config: ModelConfig = {
        model: 'test-model',
      };
      expect(config.model).toBe('test-model');
    });

    it('should accept full config', () => {
      const config: ModelConfig = {
        model: 'test-model',
        temperature: 0.7,
        top_p: 0.9,
        stream: true,
        context_window_size: 4096,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      };
      expect(config.temperature).toBe(0.7);
      expect(config.stream).toBe(true);
    });
  });

  describe('CompletionStats', () => {
    it('should track all statistics', () => {
      const stats: CompletionStats = {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
        tokensPerSecond: 25.5,
        totalTimeMs: 3920,
      };
      expect(stats.totalTokens).toBe(150);
      expect(stats.tokensPerSecond).toBe(25.5);
    });

    it('should allow partial statistics', () => {
      const stats: CompletionStats = {
        totalTimeMs: 1000,
      };
      expect(stats.promptTokens).toBeUndefined();
      expect(stats.totalTimeMs).toBe(1000);
    });
  });

  describe('LoadProgress', () => {
    it('should track loading progress', () => {
      const progress: LoadProgress = {
        progress: 0.5,
        text: 'Loading model... 50%',
        timeElapsedMs: 5000,
      };
      expect(progress.progress).toBe(0.5);
      expect(progress.text).toContain('50%');
    });

    it('should work without optional timeElapsedMs', () => {
      const progress: LoadProgress = {
        progress: 1.0,
        text: 'Complete',
      };
      expect(progress.timeElapsedMs).toBeUndefined();
    });
  });

  describe('LLMClient interface', () => {
    it('should define required methods', () => {
      // Create a mock implementation to verify interface
      const mockClient: LLMClient = {
        loadModel: async () => {},
        chat: async () => 'response',
        abort: async () => {},
        isReady: () => true,
        getCurrentModel: () => 'test-model',
      };

      expect(typeof mockClient.loadModel).toBe('function');
      expect(typeof mockClient.chat).toBe('function');
      expect(typeof mockClient.abort).toBe('function');
      expect(typeof mockClient.isReady).toBe('function');
      expect(typeof mockClient.getCurrentModel).toBe('function');
    });
  });
});
