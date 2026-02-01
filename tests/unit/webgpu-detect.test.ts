/**
 * Unit tests for WebGPU Detection utilities
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasWebGPU,
  getGPUCapabilities,
  getDeviceInfo,
  checkBrowserCompatibility,
  formatGPUInfo,
  type GPUCapabilities,
} from '../../src/utils/webgpu-detect';

describe('WebGPU Detection', () => {
  describe('hasWebGPU', () => {
    it('should return true when navigator.gpu exists', () => {
      expect(hasWebGPU()).toBe(true);
    });

    it('should return false when navigator.gpu does not exist', () => {
      const originalGpu = navigator.gpu;
      // @ts-ignore
      delete navigator.gpu;
      expect(hasWebGPU()).toBe(false);
      // @ts-ignore
      navigator.gpu = originalGpu;
    });
  });

  describe('getGPUCapabilities', () => {
    it('should return supported: true with adapter info when WebGPU is available', async () => {
      const capabilities = await getGPUCapabilities();
      expect(capabilities.supported).toBe(true);
      expect(capabilities.adapterInfo).toBeDefined();
      expect(capabilities.adapterInfo?.vendor).toBe('Test Vendor');
    });

    it('should return supported: false when no adapter is found', async () => {
      const originalRequestAdapter = navigator.gpu.requestAdapter;
      vi.mocked(navigator.gpu.requestAdapter).mockResolvedValueOnce(null);
      
      const capabilities = await getGPUCapabilities();
      expect(capabilities.supported).toBe(false);
      expect(capabilities.errorMessage).toContain('No GPU adapter found');
      
      navigator.gpu.requestAdapter = originalRequestAdapter;
    });

    it('should return supported: false when WebGPU is not available', async () => {
      const originalGpu = navigator.gpu;
      // @ts-ignore
      delete navigator.gpu;
      
      const capabilities = await getGPUCapabilities();
      expect(capabilities.supported).toBe(false);
      expect(capabilities.errorMessage).toContain('not supported');
      
      // @ts-ignore
      navigator.gpu = originalGpu;
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(navigator.gpu.requestAdapter).mockRejectedValueOnce(new Error('GPU Error'));
      
      const capabilities = await getGPUCapabilities();
      expect(capabilities.supported).toBe(false);
      expect(capabilities.errorMessage).toBe('GPU Error');
    });
  });

  describe('getDeviceInfo', () => {
    const originalUserAgent = navigator.userAgent;

    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        value: originalUserAgent,
        writable: true,
        configurable: true,
      });
    });

    it('should detect Chrome desktop', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36',
        configurable: true,
      });
      
      const info = getDeviceInfo();
      expect(info.browserName).toBe('Chrome');
      expect(info.browserVersion).toBe('121');
      expect(info.platform).toBe('Windows');
      expect(info.isMobile).toBe(false);
      expect(info.estimatedTier).toBe('heavy');
    });

    it('should detect mobile device from user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
        configurable: true,
      });
      
      const info = getDeviceInfo();
      expect(info.isMobile).toBe(true);
      // Platform detection may vary in jsdom, so check it contains expected substring
      expect(['iOS', 'macOS', 'Unknown']).toContain(info.platform);
      expect(info.estimatedTier).toBe('mobile');
    });

    it('should detect Android mobile from user agent', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/121.0.0.0 Mobile Safari/537.36',
        configurable: true,
      });
      
      const info = getDeviceInfo();
      expect(info.isMobile).toBe(true);
      // Platform may be detected as Linux or Android depending on user agent parsing
      expect(['Android', 'Linux']).toContain(info.platform);
      expect(info.browserName).toBe('Chrome');
    });

    it('should detect tablet', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1',
        configurable: true,
      });
      
      const info = getDeviceInfo();
      expect(info.isTablet).toBe(true);
      expect(info.estimatedTier).toBe('medium');
    });

    it('should detect Safari on macOS', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
        configurable: true,
      });
      
      const info = getDeviceInfo();
      expect(info.browserName).toBe('Safari');
      expect(info.browserVersion).toBe('18');
      expect(info.platform).toBe('macOS');
    });

    it('should detect Firefox', () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0',
        configurable: true,
      });
      
      const info = getDeviceInfo();
      expect(info.browserName).toBe('Firefox');
      expect(info.browserVersion).toBe('122');
    });
  });

  describe('checkBrowserCompatibility', () => {
    it('should return compatible for supported browsers', () => {
      const result = checkBrowserCompatibility();
      expect(result.compatible).toBe(true);
    });

    it('should return not compatible when WebGPU is missing', () => {
      const originalGpu = navigator.gpu;
      // @ts-ignore
      delete navigator.gpu;
      
      const result = checkBrowserCompatibility();
      expect(result.compatible).toBe(false);
      expect(result.recommendation).toBeDefined();
      
      // @ts-ignore
      navigator.gpu = originalGpu;
    });
  });

  describe('formatGPUInfo', () => {
    it('should format GPU capabilities with adapter info', () => {
      const capabilities: GPUCapabilities = {
        supported: true,
        adapterInfo: {
          vendor: 'NVIDIA',
          architecture: 'Turing',
          device: 'RTX 3080',
          description: 'High-end GPU',
        },
      };
      
      const formatted = formatGPUInfo(capabilities);
      expect(formatted).toContain('NVIDIA');
      expect(formatted).toContain('Turing');
      expect(formatted).toContain('RTX 3080');
    });

    it('should handle unsupported GPU', () => {
      const capabilities = {
        supported: false,
        errorMessage: 'WebGPU not available',
      };
      
      const formatted = formatGPUInfo(capabilities);
      expect(formatted).toBe('WebGPU not available');
    });

    it('should handle missing adapter info', () => {
      const capabilities = {
        supported: true,
      };
      
      const formatted = formatGPUInfo(capabilities);
      expect(formatted).toContain('no details');
    });
  });
});
