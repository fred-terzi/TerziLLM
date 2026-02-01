/**
 * Unit tests for UI Controller
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getUIElements,
  updateStatus,
  updateDeviceInfo,
  populateModelSelect,
  showModelInfo,
  showProgress,
  updateProgress,
  addMessage,
  updateStreamingMessage,
  clearMessages,
  addSystemMessage,
  setChatEnabled,
  setGenerating,
  updateMetrics,
  setLoadButtonState,
  formatTime,
} from '../../src/ui/ui-controller';
import { ModelTier, ModelFamily, type ModelDefinition } from '../../src/models/model-config';

describe('UI Controller', () => {
  describe('getUIElements', () => {
    it('should return all required UI elements', () => {
      const elements = getUIElements();
      
      expect(elements.statusBanner).toBeDefined();
      expect(elements.statusText).toBeDefined();
      expect(elements.tierFilter).toBeDefined();
      expect(elements.modelSelect).toBeDefined();
      expect(elements.loadBtn).toBeDefined();
      expect(elements.messages).toBeDefined();
      expect(elements.userInput).toBeDefined();
      expect(elements.sendBtn).toBeDefined();
      expect(elements.abortBtn).toBeDefined();
    });
  });

  describe('updateStatus', () => {
    it('should update status banner for success', () => {
      const elements = getUIElements();
      updateStatus(elements, 'success', 'Test success message', '✅');
      
      expect(elements.statusBanner.className).toBe('success');
      expect(elements.statusText.textContent).toBe('Test success message');
    });

    it('should update status banner for error', () => {
      const elements = getUIElements();
      updateStatus(elements, 'error', 'Test error message');
      
      expect(elements.statusBanner.className).toBe('error');
      expect(elements.statusText.textContent).toBe('Test error message');
    });

    it('should update status banner for warning', () => {
      const elements = getUIElements();
      updateStatus(elements, 'warning', 'Test warning message');
      
      expect(elements.statusBanner.className).toBe('warning');
    });
  });

  describe('updateDeviceInfo', () => {
    it('should update all device info fields', () => {
      const elements = getUIElements();
      updateDeviceInfo(elements, {
        browser: 'Chrome 121',
        platform: 'Windows',
        deviceType: 'Desktop',
        webgpu: '✅ Supported',
        gpu: 'NVIDIA RTX 3080',
        tier: 'Heavy',
      });
      
      expect(elements.infoBrowser.textContent).toBe('Chrome 121');
      expect(elements.infoPlatform.textContent).toBe('Windows');
      expect(elements.infoDeviceType.textContent).toBe('Desktop');
      expect(elements.infoWebgpu.textContent).toBe('✅ Supported');
      expect(elements.infoGpu.textContent).toBe('NVIDIA RTX 3080');
      expect(elements.infoTier.textContent).toBe('Heavy');
    });
  });

  describe('populateModelSelect', () => {
    const mockModels: ModelDefinition[] = [
      {
        id: 'test-model-1',
        displayName: 'Test Model 1',
        provider: 'Test',
        family: ModelFamily.LLAMA,
        tier: ModelTier.MOBILE,
        parameterCount: '1B',
        quantization: 'q4f16',
        contextWindow: 2048,
        estimatedVRAM: '~1GB',
        recommendedConfig: { temperature: 0.7, top_p: 0.9 },
      },
      {
        id: 'test-model-2',
        displayName: 'Test Model 2',
        provider: 'Test',
        family: ModelFamily.PHI,
        tier: ModelTier.MEDIUM,
        parameterCount: '3B',
        quantization: 'q4f32',
        contextWindow: 4096,
        estimatedVRAM: '~2GB',
        recommendedConfig: { temperature: 0.6, top_p: 0.95 },
      },
    ];

    it('should populate select with all models', () => {
      const elements = getUIElements();
      populateModelSelect(elements, mockModels);
      
      // +1 for the default "Choose..." option
      expect(elements.modelSelect.options.length).toBe(3);
      expect(elements.modelSelect.options[1].value).toBe('test-model-1');
      expect(elements.modelSelect.options[2].value).toBe('test-model-2');
    });

    it('should filter models by tier', () => {
      const elements = getUIElements();
      populateModelSelect(elements, mockModels, ModelTier.MOBILE);
      
      expect(elements.modelSelect.options.length).toBe(2);
      expect(elements.modelSelect.options[1].value).toBe('test-model-1');
    });
  });

  describe('showModelInfo', () => {
    const mockModel: ModelDefinition = {
      id: 'test-model',
      displayName: 'Test Model',
      provider: 'Test Provider',
      family: ModelFamily.LLAMA,
      tier: ModelTier.MOBILE,
      parameterCount: '1B',
      quantization: 'q4f16',
      contextWindow: 2048,
      estimatedVRAM: '~1GB',
      recommendedConfig: { temperature: 0.7, top_p: 0.9 },
      notes: 'Test notes',
    };

    it('should show model info', () => {
      const elements = getUIElements();
      showModelInfo(elements, mockModel);
      
      expect(elements.modelInfo.style.display).toBe('block');
      expect(elements.modelName.textContent).toBe('Test Model');
      expect(elements.modelProvider.textContent).toBe('Test Provider');
      expect(elements.modelSize.textContent).toBe('1B');
      expect(elements.modelVram.textContent).toBe('~1GB');
      expect(elements.modelNotes.textContent).toBe('Test notes');
    });

    it('should hide model info when null', () => {
      const elements = getUIElements();
      showModelInfo(elements, null);
      
      expect(elements.modelInfo.style.display).toBe('none');
    });
  });

  describe('Progress Bar', () => {
    it('should show progress container', () => {
      const elements = getUIElements();
      showProgress(elements, true);
      
      expect(elements.progressContainer.classList.contains('visible')).toBe(true);
    });

    it('should hide progress container', () => {
      const elements = getUIElements();
      showProgress(elements, false);
      
      expect(elements.progressContainer.classList.contains('visible')).toBe(false);
    });

    it('should update progress bar', () => {
      const elements = getUIElements();
      updateProgress(elements, { progress: 0.5, text: 'Loading 50%' });
      
      expect(elements.progressFill.style.width).toBe('50%');
      expect(elements.progressText.textContent).toBe('Loading 50%');
    });
  });

  describe('Chat Messages', () => {
    it('should add user message', () => {
      const elements = getUIElements();
      const messageDiv = addMessage(elements, 'user', 'Hello world');
      
      expect(messageDiv.classList.contains('user')).toBe(true);
      expect(messageDiv.textContent).toContain('Hello world');
    });

    it('should add assistant message', () => {
      const elements = getUIElements();
      const messageDiv = addMessage(elements, 'assistant', 'Hi there');
      
      expect(messageDiv.classList.contains('assistant')).toBe(true);
      expect(messageDiv.textContent).toContain('Hi there');
    });

    it('should add streaming message with spinner', () => {
      const elements = getUIElements();
      const messageDiv = addMessage(elements, 'assistant', '', true);
      
      expect(messageDiv.querySelector('.spinner')).toBeDefined();
    });

    it('should update streaming message', () => {
      const elements = getUIElements();
      const messageDiv = addMessage(elements, 'assistant', 'Initial', true);
      
      updateStreamingMessage(messageDiv, 'Updated content', false);
      expect(messageDiv.textContent).toContain('Updated content');
      expect(messageDiv.querySelector('.spinner')).toBeDefined();
      
      updateStreamingMessage(messageDiv, 'Final content', true);
      expect(messageDiv.textContent).toContain('Final content');
      expect(messageDiv.querySelector('.spinner')).toBeNull();
    });

    it('should clear all messages', () => {
      const elements = getUIElements();
      addMessage(elements, 'user', 'Test 1');
      addMessage(elements, 'assistant', 'Test 2');
      
      clearMessages(elements);
      
      expect(elements.messages.children.length).toBe(0);
    });

    it('should add system message', () => {
      const elements = getUIElements();
      addSystemMessage(elements, 'System notification');
      
      const systemMsg = elements.messages.querySelector('.message.system');
      expect(systemMsg).toBeDefined();
      expect(systemMsg?.textContent).toContain('System notification');
    });

    it('should sanitize dangerous HTML in messages', () => {
      const elements = getUIElements();
      const messageDiv = addMessage(elements, 'user', '<script>alert("xss")</script>');
      
      // DOMPurify removes dangerous script tags completely
      expect(messageDiv.innerHTML).not.toContain('<script>');
      // Script tag should be stripped, not just escaped
      expect(messageDiv.textContent).not.toContain('alert');
    });

    it('should render safe markdown elements', () => {
      const elements = getUIElements();
      
      // Test bold text
      const boldDiv = addMessage(elements, 'user', '**bold text**');
      expect(boldDiv.innerHTML).toContain('<strong>bold text</strong>');
      
      // Test code blocks
      const codeDiv = addMessage(elements, 'assistant', '`inline code`');
      expect(codeDiv.innerHTML).toContain('<code>');
      
      // Test lists
      const listDiv = addMessage(elements, 'assistant', '- item 1\n- item 2');
      expect(listDiv.innerHTML).toContain('<ul>');
      expect(listDiv.innerHTML).toContain('<li>');
    });
  });

  describe('Chat Controls', () => {
    it('should enable chat controls', () => {
      const elements = getUIElements();
      setChatEnabled(elements, true);
      
      expect(elements.userInput.disabled).toBe(false);
      expect(elements.sendBtn.disabled).toBe(false);
    });

    it('should disable chat controls', () => {
      const elements = getUIElements();
      setChatEnabled(elements, false);
      
      expect(elements.userInput.disabled).toBe(true);
      expect(elements.sendBtn.disabled).toBe(true);
    });

    it('should show generating state', () => {
      const elements = getUIElements();
      setGenerating(elements, true);
      
      expect(elements.sendBtn.style.display).toBe('none');
      expect(elements.abortBtn.style.display).toBe('block');
      expect(elements.userInput.disabled).toBe(true);
    });

    it('should hide generating state', () => {
      const elements = getUIElements();
      setGenerating(elements, false);
      
      expect(elements.sendBtn.style.display).toBe('block');
      expect(elements.abortBtn.style.display).toBe('none');
    });
  });

  describe('Metrics', () => {
    it('should update all metrics', () => {
      const elements = getUIElements();
      updateMetrics(elements, {
        loadTimeMs: 5000,
        totalTokens: 150,
        tokensPerSecond: 25.5,
        totalTimeMs: 2500,
      });
      
      expect(elements.metricsContainer.style.display).toBe('grid');
      expect(elements.metricLoadTime.textContent).toBe('5.0s');
      expect(elements.metricTokens.textContent).toBe('150');
      expect(elements.metricSpeed.textContent).toBe('25.5');
      expect(elements.metricTime.textContent).toBe('2.50s');
    });
  });

  describe('Load Button States', () => {
    it('should set ready state', () => {
      const elements = getUIElements();
      setLoadButtonState(elements, 'ready');
      
      expect(elements.loadBtn.disabled).toBe(false);
      expect(elements.loadBtn.textContent).toBe('Load Model');
    });

    it('should set loading state', () => {
      const elements = getUIElements();
      setLoadButtonState(elements, 'loading');
      
      expect(elements.loadBtn.disabled).toBe(true);
      expect(elements.loadBtn.textContent).toBe('Loading...');
    });

    it('should set loaded state', () => {
      const elements = getUIElements();
      setLoadButtonState(elements, 'loaded');
      
      expect(elements.loadBtn.disabled).toBe(false);
      expect(elements.loadBtn.textContent).toBe('Reload Model');
    });

    it('should set disabled state', () => {
      const elements = getUIElements();
      setLoadButtonState(elements, 'disabled');
      
      expect(elements.loadBtn.disabled).toBe(true);
    });
  });

  describe('formatTime', () => {
    it('should format milliseconds', () => {
      expect(formatTime(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatTime(5500)).toBe('5.5s');
    });

    it('should format minutes', () => {
      expect(formatTime(90000)).toBe('1.5m');
    });
  });
});
