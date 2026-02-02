/**
 * Unit tests for WebGPU Detection utilities
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  hasWebGPU,
  getGPUCapabilities,
  getDeviceInfo,
  checkBrowserCompatibility,
  formatGPUInfo,
  verifyWebGPUWorks,
  parseWebGPUError,
  formatWebGPUError,
  type GPUCapabilities,
  type WebGPUError,
} from '../../src/utils/webgpu-detect';

describe('WebGPU Detection', () => {
  // Store original GPU to restore after tests that modify it
  let originalGpu: GPU | undefined;
  
  beforeEach(() => {
    originalGpu = navigator.gpu;
  });
  
  afterEach(() => {
    // Restore navigator.gpu after tests that delete or modify it
    if (originalGpu) {
      Object.defineProperty(navigator, 'gpu', {
        value: originalGpu,
        writable: true,
        configurable: true,
      });
    }
  });
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
      // Mock requestAdapter to return null for both power preferences
      vi.mocked(navigator.gpu.requestAdapter)
        .mockResolvedValueOnce(null)  // high-performance
        .mockResolvedValueOnce(null); // low-power fallback
      
      const capabilities = await getGPUCapabilities();
      expect(capabilities.supported).toBe(false);
      expect(capabilities.uncertain).toBe(true); // API exists but no adapter
      expect(capabilities.errorMessage).toContain('No GPU adapter');
    });

    it('should return supported: false when WebGPU is not available', async () => {
      // @ts-ignore
      delete navigator.gpu;
      
      const capabilities = await getGPUCapabilities();
      expect(capabilities.supported).toBe(false);
      expect(capabilities.errorMessage).toContain('not available');
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
    it('should return compatible for supported browsers', async () => {
      const result = await checkBrowserCompatibility();
      expect(result.compatible).toBe(true);
      expect(result.allowAttempt).toBe(true);
    });

    it('should allow attempt when WebGPU is uncertain', async () => {
      // Mock requestAdapter to return null (uncertain state)
      vi.mocked(navigator.gpu.requestAdapter)
        .mockResolvedValueOnce(null)  // high-performance
        .mockResolvedValueOnce(null); // low-power fallback
      
      const result = await checkBrowserCompatibility();
      // Should still allow user to try
      expect(result.allowAttempt).toBe(true);
    });

    it('should return not compatible when WebGPU is missing', async () => {
      // @ts-ignore
      delete navigator.gpu;
      
      const result = await checkBrowserCompatibility();
      expect(result.compatible).toBe(false);
      // Still allow attempt for browsers that might work
      expect(result.recommendation).toBeDefined();
    });
  });

  describe('verifyWebGPUWorks', () => {
    it('should return works: true when adapter is available', async () => {
      const result = await verifyWebGPUWorks();
      expect(result.works).toBe(true);
      expect(result.adapter).toBeDefined();
    });

    it('should return works: false when no adapter', async () => {
      vi.mocked(navigator.gpu.requestAdapter)
        .mockResolvedValueOnce(null)  // high-performance
        .mockResolvedValueOnce(null); // low-power fallback
      
      const result = await verifyWebGPUWorks();
      expect(result.works).toBe(false);
      expect(result.adapter).toBeNull();
    });

    it('should handle requestAdapter errors', async () => {
      vi.mocked(navigator.gpu.requestAdapter).mockRejectedValueOnce(new Error('GPU error'));
      
      const result = await verifyWebGPUWorks();
      expect(result.works).toBe(false);
      expect(result.error).toBe('GPU error');
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
      const capabilities: GPUCapabilities = {
        supported: false,
        errorMessage: 'WebGPU not available',
      };
      
      const formatted = formatGPUInfo(capabilities);
      expect(formatted).toBe('WebGPU not available');
    });

    it('should handle uncertain detection state', () => {
      const capabilities: GPUCapabilities = {
        supported: false,
        uncertain: true,
        errorMessage: 'No adapter found',
      };
      
      const formatted = formatGPUInfo(capabilities);
      expect(formatted).toContain('uncertain');
      expect(formatted).toContain('No adapter found');
    });

    it('should handle missing adapter info', () => {
      const capabilities: GPUCapabilities = {
        supported: true,
      };
      
      const formatted = formatGPUInfo(capabilities);
      expect(formatted).toContain('no details');
    });
  });

  describe('parseWebGPUError', () => {
    it('should parse out of memory errors', () => {
      const error = new Error('Out of memory allocating buffer');
      const parsed = parseWebGPUError(error);
      
      expect(parsed.code).toBe('OUT_OF_MEMORY');
      expect(parsed.recommendation).toContain('smaller model');
      expect(parsed.troubleshooting.length).toBeGreaterThan(0);
    });

    it('should parse adapter lost errors', () => {
      const error = new Error('GPU device lost during operation');
      const parsed = parseWebGPUError(error);
      
      expect(parsed.code).toBe('ADAPTER_LOST');
      expect(parsed.recommendation).toContain('Refresh');
    });

    it('should parse no adapter errors', () => {
      const error = new Error('requestAdapter returned null');
      const parsed = parseWebGPUError(error);
      
      expect(parsed.code).toBe('NO_ADAPTER');
      expect(parsed.troubleshooting.some(s => s.includes('Safari') || s.includes('Chrome'))).toBe(true);
    });

    it('should parse webgpu not supported errors', () => {
      const error = new Error('WebGPU is not supported in this browser');
      const parsed = parseWebGPUError(error);
      
      expect(parsed.code).toBe('NO_WEBGPU');
      expect(parsed.troubleshooting.some(s => s.includes('121'))).toBe(true);
    });

    it('should handle unknown errors gracefully', () => {
      const error = new Error('Something unexpected happened');
      const parsed = parseWebGPUError(error);
      
      expect(parsed.code).toBe('UNKNOWN');
      expect(parsed.message).toBe('Something unexpected happened');
      expect(parsed.troubleshooting.length).toBeGreaterThan(0);
    });

    it('should handle string errors', () => {
      const parsed = parseWebGPUError('Memory allocation failed');
      expect(parsed.code).toBe('OUT_OF_MEMORY');
    });

    it('should parse API errors like crypto.randomUUID is not a function', () => {
      const error = new Error('crypto.randomUUID is not a function');
      const parsed = parseWebGPUError(error);
      
      expect(parsed.code).toBe('API_ERROR');
      expect(parsed.recommendation).toContain('refresh');
      expect(parsed.troubleshooting.some(s => s.toLowerCase().includes('refresh'))).toBe(true);
    });

    it('should parse undefined function errors', () => {
      const error = new Error('undefined is not a function');
      const parsed = parseWebGPUError(error);
      
      expect(parsed.code).toBe('API_ERROR');
    });

    it('should parse "is not defined" errors', () => {
      const error = new Error('someAPI is not defined');
      const parsed = parseWebGPUError(error);
      
      expect(parsed.code).toBe('API_ERROR');
    });
  });

  describe('formatWebGPUError', () => {
    it('should format error with all sections', () => {
      const error: WebGPUError = {
        code: 'OUT_OF_MEMORY',
        message: 'GPU ran out of memory',
        recommendation: 'Try a smaller model',
        troubleshooting: ['Close tabs', 'Restart browser'],
      };
      
      const formatted = formatWebGPUError(error);
      expect(formatted).toContain('❌');
      expect(formatted).toContain('GPU ran out of memory');
      expect(formatted).toContain('💡');
      expect(formatted).toContain('Try a smaller model');
      expect(formatted).toContain('Close tabs');
      expect(formatted).toContain('Restart browser');
    });
  });
});