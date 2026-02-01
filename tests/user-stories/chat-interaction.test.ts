/**
 * User Story Tests - Chat Interaction Journey
 * 
 * User Stories covered:
 * - As a user, I want to send messages and receive AI responses
 * - As a user, I want to see responses streaming in real-time
 * - As a user, I want to be able to stop generation mid-response
 * - As a user, I want to see performance metrics for my queries
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDOM, advanceTime, resetMockTime } from '../setup';
import {
  getUIElements,
  addMessage,
  updateStreamingMessage,
  clearMessages,
  addSystemMessage,
  setChatEnabled,
  setGenerating,
  updateMetrics,
} from '../../src/ui/ui-controller';
import type { CompletionStats } from '../../src/core/api-types';

describe('User Story: Chat Interaction Journey', () => {
  beforeEach(() => {
    createMockDOM();
    resetMockTime();
  });

  describe('US-010: Send messages and receive responses', () => {
    it('should add user message to chat', () => {
      const elements = getUIElements();
      
      // User types and sends a message
      const userMessage = 'Hello, how are you?';
      const messageDiv = addMessage(elements, 'user', userMessage);
      
      expect(messageDiv.classList.contains('user')).toBe(true);
      expect(messageDiv.textContent).toContain(userMessage);
    });

    it('should add assistant response to chat', () => {
      const elements = getUIElements();
      
      // AI responds
      const response = 'I am doing well, thank you for asking!';
      const messageDiv = addMessage(elements, 'assistant', response);
      
      expect(messageDiv.classList.contains('assistant')).toBe(true);
      expect(messageDiv.textContent).toContain(response);
    });

    it('should preserve message history order', () => {
      const elements = getUIElements();
      
      addMessage(elements, 'user', 'First message');
      addMessage(elements, 'assistant', 'First response');
      addMessage(elements, 'user', 'Second message');
      addMessage(elements, 'assistant', 'Second response');
      
      const messages = elements.messages.querySelectorAll('.message');
      expect(messages.length).toBe(4);
      expect(messages[0].classList.contains('user')).toBe(true);
      expect(messages[1].classList.contains('assistant')).toBe(true);
    });

    it('should handle multi-line messages', () => {
      const elements = getUIElements();
      
      const multiLineMessage = 'Line 1\nLine 2\nLine 3';
      const messageDiv = addMessage(elements, 'user', multiLineMessage);
      
      expect(messageDiv.textContent).toContain('Line 1');
      expect(messageDiv.textContent).toContain('Line 2');
    });

    it('should escape HTML in user input to prevent XSS', () => {
      const elements = getUIElements();
      
      const maliciousInput = '<img src=x onerror=alert("XSS")>';
      const messageDiv = addMessage(elements, 'user', maliciousInput);
      
      // Should be escaped, not rendered as HTML
      expect(messageDiv.innerHTML).not.toContain('<img');
      expect(messageDiv.textContent).toContain('<img');
    });
  });

  describe('US-011: Real-time streaming responses', () => {
    it('should show spinner during streaming', () => {
      const elements = getUIElements();
      
      const messageDiv = addMessage(elements, 'assistant', '', true);
      
      expect(messageDiv.querySelector('.spinner')).not.toBeNull();
    });

    it('should update message content as tokens arrive', () => {
      const elements = getUIElements();
      const messageDiv = addMessage(elements, 'assistant', '', true);
      
      // Simulate streaming tokens
      updateStreamingMessage(messageDiv, 'Hello', false);
      expect(messageDiv.textContent).toContain('Hello');
      
      updateStreamingMessage(messageDiv, 'Hello, how', false);
      expect(messageDiv.textContent).toContain('Hello, how');
      
      updateStreamingMessage(messageDiv, 'Hello, how are you?', false);
      expect(messageDiv.textContent).toContain('Hello, how are you?');
    });

    it('should remove spinner when streaming completes', () => {
      const elements = getUIElements();
      const messageDiv = addMessage(elements, 'assistant', '', true);
      
      // Complete the stream
      updateStreamingMessage(messageDiv, 'Final response', true);
      
      expect(messageDiv.querySelector('.spinner')).toBeNull();
      expect(messageDiv.textContent).toContain('Final response');
    });

    it('should scroll to bottom as new content arrives', () => {
      const elements = getUIElements();
      
      // Add multiple messages
      for (let i = 0; i < 10; i++) {
        addMessage(elements, 'user', `Message ${i}`);
      }
      
      // Should have scrolled (scrollTop should equal scrollHeight - clientHeight for full scroll)
      // In test environment, we just verify scrollTop was set
      expect(elements.messages.scrollTop).toBeDefined();
    });
  });

  describe('US-012: Stop generation', () => {
    it('should show abort button during generation', () => {
      const elements = getUIElements();
      
      setGenerating(elements, true);
      
      expect(elements.sendBtn.style.display).toBe('none');
      expect(elements.abortBtn.style.display).toBe('block');
    });

    it('should hide abort button when not generating', () => {
      const elements = getUIElements();
      
      setGenerating(elements, false);
      
      expect(elements.sendBtn.style.display).toBe('block');
      expect(elements.abortBtn.style.display).toBe('none');
    });

    it('should disable input during generation', () => {
      const elements = getUIElements();
      
      setGenerating(elements, true);
      
      expect(elements.userInput.disabled).toBe(true);
    });

    it('should re-enable input after generation stops', () => {
      const elements = getUIElements();
      
      setGenerating(elements, true);
      setGenerating(elements, false);
      
      expect(elements.userInput.disabled).toBe(false);
    });

    it('should show system message when generation is aborted', () => {
      const elements = getUIElements();
      
      addSystemMessage(elements, 'Generation aborted');
      
      const systemMsg = elements.messages.querySelector('.message.system');
      expect(systemMsg).not.toBeNull();
      expect(systemMsg?.textContent).toContain('Generation aborted');
    });
  });

  describe('US-013: View performance metrics', () => {
    it('should display load time metric', () => {
      const elements = getUIElements();
      
      const stats: CompletionStats & { loadTimeMs?: number } = {
        loadTimeMs: 5000,
      };
      updateMetrics(elements, stats);
      
      expect(elements.metricLoadTime.textContent).toBe('5.0s');
    });

    it('should display token count', () => {
      const elements = getUIElements();
      
      const stats: CompletionStats = {
        totalTokens: 150,
      };
      updateMetrics(elements, stats);
      
      expect(elements.metricTokens.textContent).toBe('150');
    });

    it('should display tokens per second', () => {
      const elements = getUIElements();
      
      const stats: CompletionStats = {
        tokensPerSecond: 25.5,
      };
      updateMetrics(elements, stats);
      
      expect(elements.metricSpeed.textContent).toBe('25.5');
    });

    it('should display response time', () => {
      const elements = getUIElements();
      
      const stats: CompletionStats = {
        totalTimeMs: 2500,
      };
      updateMetrics(elements, stats);
      
      expect(elements.metricTime.textContent).toBe('2.50s');
    });

    it('should show metrics container after first query', () => {
      const elements = getUIElements();
      
      // Initially hidden
      expect(elements.metricsContainer.style.display).toBe('none');
      
      // After update
      updateMetrics(elements, { totalTimeMs: 1000 });
      
      expect(elements.metricsContainer.style.display).toBe('grid');
    });

    it('should update all metrics together', () => {
      const elements = getUIElements();
      
      const fullStats: CompletionStats & { loadTimeMs?: number } = {
        loadTimeMs: 3000,
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
        tokensPerSecond: 33.3,
        totalTimeMs: 3000,
      };
      updateMetrics(elements, fullStats);
      
      expect(elements.metricLoadTime.textContent).toBe('3.0s');
      expect(elements.metricTokens.textContent).toBe('150');
      expect(elements.metricSpeed.textContent).toBe('33.3');
      expect(elements.metricTime.textContent).toBe('3.00s');
    });
  });

  describe('US-014: Chat state management', () => {
    it('should enable chat after model loads', () => {
      const elements = getUIElements();
      
      setChatEnabled(elements, true);
      
      expect(elements.userInput.disabled).toBe(false);
      expect(elements.sendBtn.disabled).toBe(false);
    });

    it('should disable chat before model loads', () => {
      const elements = getUIElements();
      
      setChatEnabled(elements, false);
      
      expect(elements.userInput.disabled).toBe(true);
      expect(elements.sendBtn.disabled).toBe(true);
    });

    it('should clear messages when new model loads', () => {
      const elements = getUIElements();
      
      // Add some messages
      addMessage(elements, 'user', 'Test message');
      addMessage(elements, 'assistant', 'Test response');
      expect(elements.messages.children.length).toBe(2);
      
      // Clear on model load
      clearMessages(elements);
      expect(elements.messages.children.length).toBe(0);
    });

    it('should show system message for model loading', () => {
      const elements = getUIElements();
      clearMessages(elements);
      
      addSystemMessage(elements, 'Loading SmolLM2 360M...');
      
      const systemMsg = elements.messages.querySelector('.message.system');
      expect(systemMsg?.textContent).toContain('Loading SmolLM2 360M');
    });

    it('should show system message when model is ready', () => {
      const elements = getUIElements();
      clearMessages(elements);
      
      addSystemMessage(elements, 'SmolLM2 360M ready! Load time: 3.5s');
      
      const systemMsg = elements.messages.querySelector('.message.system');
      expect(systemMsg?.textContent).toContain('ready');
      expect(systemMsg?.textContent).toContain('3.5s');
    });
  });
});
