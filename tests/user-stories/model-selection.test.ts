/**
 * User Story Tests - Model Selection Journey
 * 
 * User Stories covered:
 * - As a user, I want to see which tier of models is recommended for my device
 * - As a user, I want to filter models by tier to find suitable options
 * - As a user, I want to see model details before loading
 * - As a user, I want to select a model and load it
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDOM } from '../setup';
import {
  getUIElements,
  populateModelSelect,
  showModelInfo,
  updateDeviceInfo,
  setLoadButtonState,
  updateStatus,
} from '../../src/ui/ui-controller';
import {
  VETTING_MODELS,
  getModelById,
  getModelsByTier,
  getRecommendedModel,
  ModelTier,
} from '../../src/models/model-config';
import { getDeviceInfo } from '../../src/utils/webgpu-detect';

describe('User Story: Model Selection Journey', () => {
  beforeEach(() => {
    createMockDOM();
  });

  describe('US-001: View recommended models for my device', () => {
    it('should show recommended tier based on device type', () => {
      const elements = getUIElements();
      const deviceInfo = getDeviceInfo();
      
      // User opens the app and sees device info
      updateDeviceInfo(elements, {
        browser: `${deviceInfo.browserName} ${deviceInfo.browserVersion}`,
        platform: deviceInfo.platform,
        deviceType: deviceInfo.isMobile ? 'Mobile' : 'Desktop',
        webgpu: '✅ Supported',
        gpu: 'Test GPU',
        tier: deviceInfo.estimatedTier,
      });
      
      // Verify the tier is displayed
      expect(elements.infoTier.textContent).toBe(deviceInfo.estimatedTier);
    });

    it('should recommend mobile models for mobile devices', () => {
      const recommendedModel = getRecommendedModel(true);
      
      expect(recommendedModel.tier).toBe(ModelTier.MOBILE);
      // Verify it's a small model
      expect(recommendedModel.estimatedVRAM).toMatch(/~?\d+MB|~?1GB/);
    });

    it('should recommend medium models for desktop devices', () => {
      const recommendedModel = getRecommendedModel(false);
      
      expect(recommendedModel.tier).toBe(ModelTier.MEDIUM);
    });
  });

  describe('US-002: Filter models by tier', () => {
    it('should filter to show only mobile tier models', () => {
      const elements = getUIElements();
      
      // User selects mobile tier filter
      const mobileModels = getModelsByTier(ModelTier.MOBILE);
      populateModelSelect(elements, mobileModels, ModelTier.MOBILE);
      
      // Verify only mobile models are shown
      const optionCount = elements.modelSelect.options.length - 1; // exclude placeholder
      expect(optionCount).toBe(mobileModels.length);
      expect(optionCount).toBeGreaterThan(0);
      
      // All shown models should be mobile tier
      mobileModels.forEach(model => {
        expect(model.tier).toBe(ModelTier.MOBILE);
      });
    });

    it('should filter to show only medium tier models', () => {
      const elements = getUIElements();
      
      const mediumModels = getModelsByTier(ModelTier.MEDIUM);
      populateModelSelect(elements, mediumModels, ModelTier.MEDIUM);
      
      const optionCount = elements.modelSelect.options.length - 1;
      expect(optionCount).toBe(mediumModels.length);
      expect(optionCount).toBeGreaterThan(0);
    });

    it('should filter to show only heavy tier models', () => {
      const elements = getUIElements();
      
      const heavyModels = getModelsByTier(ModelTier.HEAVY);
      populateModelSelect(elements, heavyModels, ModelTier.HEAVY);
      
      const optionCount = elements.modelSelect.options.length - 1;
      expect(optionCount).toBe(heavyModels.length);
    });

    it('should show all models when "all" filter is selected', () => {
      const elements = getUIElements();
      
      populateModelSelect(elements, VETTING_MODELS, 'all');
      
      const optionCount = elements.modelSelect.options.length - 1;
      expect(optionCount).toBe(VETTING_MODELS.length);
    });
  });

  describe('US-003: View model details before loading', () => {
    it('should display model info when selected', () => {
      const elements = getUIElements();
      const testModel = getModelById('SmolLM2-360M-Instruct-q4f16_1-MLC');
      
      // User selects a model
      showModelInfo(elements, testModel!);
      
      // Verify model details are shown
      expect(elements.modelInfo.style.display).toBe('block');
      expect(elements.modelName.textContent).toBe(testModel!.displayName);
      expect(elements.modelProvider.textContent).toBe(testModel!.provider);
      expect(elements.modelSize.textContent).toBe(testModel!.parameterCount);
      expect(elements.modelVram.textContent).toBe(testModel!.estimatedVRAM);
    });

    it('should show tier badge with correct styling', () => {
      const elements = getUIElements();
      const mobileModel = getModelById('SmolLM2-360M-Instruct-q4f16_1-MLC');
      
      showModelInfo(elements, mobileModel!);
      
      expect(elements.modelTierBadge.textContent).toBe(ModelTier.MOBILE);
      expect(elements.modelTierBadge.className).toContain('mobile');
    });

    it('should show notes if available', () => {
      const elements = getUIElements();
      const testModel = VETTING_MODELS.find(m => m.notes);
      
      showModelInfo(elements, testModel!);
      
      expect(elements.modelNotes.textContent).toBe(testModel!.notes);
    });

    it('should hide model info when deselected', () => {
      const elements = getUIElements();
      
      // First show info
      showModelInfo(elements, VETTING_MODELS[0]);
      expect(elements.modelInfo.style.display).toBe('block');
      
      // Then deselect
      showModelInfo(elements, null);
      expect(elements.modelInfo.style.display).toBe('none');
    });
  });

  describe('US-004: Load button state management', () => {
    it('should enable load button when model is selected', () => {
      const elements = getUIElements();
      
      // Initially disabled
      setLoadButtonState(elements, 'disabled');
      expect(elements.loadBtn.disabled).toBe(true);
      
      // User selects a model
      setLoadButtonState(elements, 'ready');
      expect(elements.loadBtn.disabled).toBe(false);
      expect(elements.loadBtn.textContent).toBe('Load Model');
    });

    it('should show loading state when model is loading', () => {
      const elements = getUIElements();
      
      setLoadButtonState(elements, 'loading');
      
      expect(elements.loadBtn.disabled).toBe(true);
      expect(elements.loadBtn.textContent).toBe('Loading...');
    });

    it('should show reload option after model is loaded', () => {
      const elements = getUIElements();
      
      setLoadButtonState(elements, 'loaded');
      
      expect(elements.loadBtn.disabled).toBe(false);
      expect(elements.loadBtn.textContent).toBe('Reload Model');
    });
  });

  describe('US-005: Model validation', () => {
    it('should have valid model IDs that follow naming convention', () => {
      VETTING_MODELS.forEach(model => {
        // Model IDs should contain MLC suffix
        expect(model.id).toContain('MLC');
        // Model IDs should contain quantization info
        expect(model.id).toMatch(/q\d+f\d+/);
      });
    });

    it('should have consistent provider information', () => {
      const expectedProviders = ['Meta', 'Microsoft', 'HuggingFace', 'Alibaba', 'Google', 'DeepSeek', 'Zhang Peiyuan'];
      
      VETTING_MODELS.forEach(model => {
        expect(expectedProviders).toContain(model.provider);
      });
    });

    it('should have reasonable VRAM estimates for each tier', () => {
      const mobileModels = getModelsByTier(ModelTier.MOBILE);
      const heavyModels = getModelsByTier(ModelTier.HEAVY);
      
      // Mobile models should have lower VRAM
      mobileModels.forEach(model => {
        expect(model.estimatedVRAM).toMatch(/~?\d+MB|~?[01](\.\d+)?GB/);
      });
      
      // Heavy models should have higher VRAM
      heavyModels.forEach(model => {
        expect(model.estimatedVRAM).toMatch(/~?\d+GB/);
      });
    });
  });
});
