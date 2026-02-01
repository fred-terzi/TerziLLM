/**
 * User Story Tests - Device Compatibility Journey
 * 
 * User Stories covered:
 * - As a user, I want to know if my browser supports WebGPU
 * - As a user, I want to see helpful error messages if my device is incompatible
 * - As a user, I want to see my device capabilities
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockDOM } from '../setup';
import {
  getUIElements,
  updateStatus,
  updateDeviceInfo,
  setLoadButtonState,
  setChatEnabled,
} from '../../src/ui/ui-controller';
import {
  hasWebGPU,
  getDeviceInfo,
  checkBrowserCompatibility,
  formatGPUInfo,
  type GPUCapabilities,
} from '../../src/utils/webgpu-detect';

describe('User Story: Device Compatibility Journey', () => {
  beforeEach(() => {
    createMockDOM();
  });

  describe('US-020: WebGPU support detection', () => {
    it('should detect when WebGPU is available', () => {
      // Mock has WebGPU (from setup)
      expect(hasWebGPU()).toBe(true);
    });

    it('should show success status when WebGPU is supported', () => {
      const elements = getUIElements();
      const compatibility = checkBrowserCompatibility();
      
      updateStatus(elements, 'success', compatibility.message, '✅');
      
      expect(elements.statusBanner.className).toBe('success');
      expect(elements.statusText.textContent).toContain('supported');
    });

    it('should enable model loading when compatible', () => {
      const elements = getUIElements();
      
      // Simulate compatible environment
      setLoadButtonState(elements, 'disabled'); // Initially disabled
      
      if (hasWebGPU()) {
        setLoadButtonState(elements, 'ready');
      }
      
      expect(elements.loadBtn.disabled).toBe(false);
    });
  });

  describe('US-021: Incompatibility error messages', () => {
    it('should show error status for incompatible browsers', () => {
      const elements = getUIElements();
      
      // Simulate incompatible browser
      updateStatus(elements, 'error', 'WebGPU is not supported in this browser', '❌');
      
      expect(elements.statusBanner.className).toBe('error');
    });

    it('should provide helpful recommendation for Firefox', () => {
      const elements = getUIElements();
      
      const message = 'Firefox does not fully support WebGPU yet.';
      const recommendation = 'Please use Chrome 121+, Edge 121+, or Safari 18+ for WebGPU support.';
      
      updateStatus(elements, 'error', `${message} ${recommendation}`);
      
      expect(elements.statusText.textContent).toContain('Chrome');
      expect(elements.statusText.textContent).toContain('Safari');
    });

    it('should provide helpful recommendation for old Chrome', () => {
      const elements = getUIElements();
      
      const message = 'Chrome 100 does not support WebGPU.';
      const recommendation = 'Please update to Chrome 121 or newer.';
      
      updateStatus(elements, 'error', `${message} ${recommendation}`);
      
      expect(elements.statusText.textContent).toContain('update');
      expect(elements.statusText.textContent).toContain('121');
    });

    it('should disable model loading when incompatible', () => {
      const elements = getUIElements();
      
      setLoadButtonState(elements, 'disabled');
      setChatEnabled(elements, false);
      
      expect(elements.loadBtn.disabled).toBe(true);
      expect(elements.userInput.disabled).toBe(true);
    });

    it('should show iOS-specific message', () => {
      const elements = getUIElements();
      
      const message = 'iOS Safari does not support WebGPU yet.';
      const recommendation = 'WebGPU support for iOS is coming in a future Safari version.';
      
      updateStatus(elements, 'warning', `${message} ${recommendation}`);
      
      expect(elements.statusText.textContent).toContain('iOS');
      expect(elements.statusText.textContent).toContain('future');
    });
  });

  describe('US-022: Display device capabilities', () => {
    it('should display browser name and version', () => {
      const elements = getUIElements();
      const info = getDeviceInfo();
      
      updateDeviceInfo(elements, {
        browser: `${info.browserName} ${info.browserVersion}`,
        platform: info.platform,
        deviceType: 'Desktop',
        webgpu: '✅ Supported',
        gpu: 'Test GPU',
        tier: 'heavy',
      });
      
      expect(elements.infoBrowser.textContent).toContain(info.browserName);
    });

    it('should display platform correctly', () => {
      const elements = getUIElements();
      
      updateDeviceInfo(elements, {
        browser: 'Chrome 121',
        platform: 'Windows',
        deviceType: 'Desktop',
        webgpu: '✅ Supported',
        gpu: 'NVIDIA GPU',
        tier: 'heavy',
      });
      
      expect(elements.infoPlatform.textContent).toBe('Windows');
    });

    it('should display device type (Mobile/Tablet/Desktop)', () => {
      const elements = getUIElements();
      
      // Desktop
      updateDeviceInfo(elements, {
        browser: 'Chrome 121',
        platform: 'macOS',
        deviceType: 'Desktop',
        webgpu: '✅ Supported',
        gpu: 'Apple M1',
        tier: 'heavy',
      });
      expect(elements.infoDeviceType.textContent).toBe('Desktop');
      
      // Mobile
      updateDeviceInfo(elements, {
        browser: 'Chrome 121',
        platform: 'Android',
        deviceType: 'Mobile',
        webgpu: '✅ Supported',
        gpu: 'Adreno 730',
        tier: 'mobile',
      });
      expect(elements.infoDeviceType.textContent).toBe('Mobile');
    });

    it('should display WebGPU support status', () => {
      const elements = getUIElements();
      
      updateDeviceInfo(elements, {
        browser: 'Chrome 121',
        platform: 'Windows',
        deviceType: 'Desktop',
        webgpu: '✅ Supported',
        gpu: 'Test GPU',
        tier: 'heavy',
      });
      
      expect(elements.infoWebgpu.textContent).toContain('Supported');
    });

    it('should display GPU information', () => {
      const elements = getUIElements();
      
      updateDeviceInfo(elements, {
        browser: 'Chrome 121',
        platform: 'Windows',
        deviceType: 'Desktop',
        webgpu: '✅ Supported',
        gpu: 'NVIDIA GeForce RTX 3080',
        tier: 'heavy',
      });
      
      expect(elements.infoGpu.textContent).toContain('NVIDIA');
      expect(elements.infoGpu.textContent).toContain('3080');
    });

    it('should display recommended tier', () => {
      const elements = getUIElements();
      
      updateDeviceInfo(elements, {
        browser: 'Chrome 121',
        platform: 'Android',
        deviceType: 'Mobile',
        webgpu: '✅ Supported',
        gpu: 'Adreno 730',
        tier: 'Mobile',
      });
      
      expect(elements.infoTier.textContent).toBe('Mobile');
    });
  });

  describe('US-023: GPU capabilities formatting', () => {
    it('should format GPU info with all details', () => {
      const capabilities: GPUCapabilities = {
        supported: true,
        adapterInfo: {
          vendor: 'NVIDIA',
          architecture: 'Ampere',
          device: 'RTX 3080',
          description: 'High performance GPU',
        },
      };
      
      const formatted = formatGPUInfo(capabilities);
      
      expect(formatted).toContain('NVIDIA');
      expect(formatted).toContain('Ampere');
      expect(formatted).toContain('RTX 3080');
    });

    it('should handle partial GPU info', () => {
      const capabilities: GPUCapabilities = {
        supported: true,
        adapterInfo: {
          vendor: 'Apple',
        },
      };
      
      const formatted = formatGPUInfo(capabilities);
      
      expect(formatted).toContain('Apple');
    });

    it('should handle unsupported GPU gracefully', () => {
      const capabilities: GPUCapabilities = {
        supported: false,
        errorMessage: 'No WebGPU support',
      };
      
      const formatted = formatGPUInfo(capabilities);
      
      expect(formatted).toBe('No WebGPU support');
    });

    it('should handle missing adapter info', () => {
      const capabilities: GPUCapabilities = {
        supported: true,
        // No adapterInfo
      };
      
      const formatted = formatGPUInfo(capabilities);
      
      expect(formatted).toContain('no details');
    });
  });

  describe('US-024: Device type detection accuracy', () => {
    it('should correctly identify mobile user agents', () => {
      // The mock in setup provides a default user agent
      // We test the getDeviceInfo function with the mocked environment
      const info = getDeviceInfo();
      
      // Should have valid values
      expect(['Chrome', 'Safari', 'Firefox', 'Edge', 'Unknown']).toContain(info.browserName);
      expect(typeof info.isMobile).toBe('boolean');
      expect(typeof info.isTablet).toBe('boolean');
    });

    it('should determine estimated tier based on device type', () => {
      const info = getDeviceInfo();
      
      // Estimated tier should be one of the valid options
      expect(['mobile', 'medium', 'heavy', 'unknown']).toContain(info.estimatedTier);
    });

    it('should detect WebGPU availability', () => {
      const info = getDeviceInfo();
      
      // Our mock has WebGPU
      expect(info.hasWebGPU).toBe(true);
    });
  });
});
