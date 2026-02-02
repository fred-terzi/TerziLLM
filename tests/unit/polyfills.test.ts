/**
 * Unit tests for Browser Polyfills
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  polyfillCryptoRandomUUID,
  isSecureContext,
  checkBrowserFeatures,
  getBrowserCompatibilitySummary,
  applyPolyfills,
} from '../../src/utils/polyfills';

describe('Polyfills', () => {
  describe('polyfillCryptoRandomUUID', () => {
    let originalRandomUUID: typeof crypto.randomUUID | undefined;
    
    beforeEach(() => {
      // Store original
      originalRandomUUID = crypto.randomUUID;
    });
    
    afterEach(() => {
      // Restore original
      if (originalRandomUUID) {
        (crypto as any).randomUUID = originalRandomUUID;
      }
    });
    
    it('should not polyfill if randomUUID already exists', () => {
      // randomUUID exists in test environment
      const original = crypto.randomUUID;
      polyfillCryptoRandomUUID();
      expect(crypto.randomUUID).toBe(original);
    });
    
    it('should polyfill using getRandomValues if randomUUID is missing', () => {
      // Simulate missing randomUUID
      const originalFn = crypto.randomUUID;
      (crypto as any).randomUUID = undefined;
      
      polyfillCryptoRandomUUID();
      
      expect(typeof crypto.randomUUID).toBe('function');
      
      // Generate a UUID and validate format
      const uuid = crypto.randomUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      
      // Restore
      (crypto as any).randomUUID = originalFn;
    });
    
    it('should generate unique UUIDs', () => {
      const originalFn = crypto.randomUUID;
      (crypto as any).randomUUID = undefined;
      
      polyfillCryptoRandomUUID();
      
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(crypto.randomUUID());
      }
      
      // All 100 UUIDs should be unique
      expect(uuids.size).toBe(100);
      
      // Restore
      (crypto as any).randomUUID = originalFn;
    });
    
    it('polyfilled UUID should have correct version (4)', () => {
      const originalFn = crypto.randomUUID;
      (crypto as any).randomUUID = undefined;
      
      polyfillCryptoRandomUUID();
      
      for (let i = 0; i < 10; i++) {
        const uuid = crypto.randomUUID();
        // Version 4 UUID has '4' as the 13th character
        expect(uuid.charAt(14)).toBe('4');
        // Variant should be 8, 9, a, or b
        expect(['8', '9', 'a', 'b']).toContain(uuid.charAt(19).toLowerCase());
      }
      
      // Restore
      (crypto as any).randomUUID = originalFn;
    });
  });
  
  describe('isSecureContext', () => {
    it('should return the value of window.isSecureContext', () => {
      // In test environment, this may vary
      const result = isSecureContext();
      expect(typeof result).toBe('boolean');
    });
  });
  
  describe('checkBrowserFeatures', () => {
    it('should return an array of feature checks', () => {
      const features = checkBrowserFeatures();
      
      expect(Array.isArray(features)).toBe(true);
      expect(features.length).toBeGreaterThan(0);
    });
    
    it('should check for required features', () => {
      const features = checkBrowserFeatures();
      const featureNames = features.map(f => f.feature);
      
      expect(featureNames).toContain('Web Crypto API');
      expect(featureNames).toContain('crypto.getRandomValues');
      expect(featureNames).toContain('crypto.randomUUID');
      expect(featureNames).toContain('WebGPU API');
      expect(featureNames).toContain('Web Workers');
      expect(featureNames).toContain('IndexedDB');
      expect(featureNames).toContain('Fetch API');
    });
    
    it('should include critical flag for each feature', () => {
      const features = checkBrowserFeatures();
      
      features.forEach(feature => {
        expect(typeof feature.critical).toBe('boolean');
        expect(typeof feature.available).toBe('boolean');
      });
    });
    
    it('should mark WebGPU as critical', () => {
      const features = checkBrowserFeatures();
      const webgpu = features.find(f => f.feature === 'WebGPU API');
      
      expect(webgpu).toBeDefined();
      expect(webgpu?.critical).toBe(true);
    });
    
    it('should mark crypto.randomUUID as non-critical (we polyfill it)', () => {
      const features = checkBrowserFeatures();
      const randomUUID = features.find(f => f.feature === 'crypto.randomUUID');
      
      expect(randomUUID).toBeDefined();
      expect(randomUUID?.critical).toBe(false);
    });
  });
  
  describe('getBrowserCompatibilitySummary', () => {
    it('should return a summary object', () => {
      const summary = getBrowserCompatibilitySummary();
      
      expect(typeof summary.allCriticalFeaturesAvailable).toBe('boolean');
      expect(Array.isArray(summary.missingCritical)).toBe(true);
      expect(Array.isArray(summary.missingNonCritical)).toBe(true);
      expect(Array.isArray(summary.recommendations)).toBe(true);
    });
    
    it('should identify missing critical features', () => {
      // In test environment with mocked WebGPU, all should be available
      const summary = getBrowserCompatibilitySummary();
      
      // crypto.randomUUID might be missing in some environments but it's non-critical
      expect(summary.missingCritical).not.toContain('crypto.randomUUID');
    });
  });
  
  describe('applyPolyfills', () => {
    it('should apply polyfills without errors', () => {
      expect(() => applyPolyfills()).not.toThrow();
    });
    
    it('should ensure crypto.randomUUID is available after applying', () => {
      applyPolyfills();
      
      expect(typeof crypto.randomUUID).toBe('function');
      
      const uuid = crypto.randomUUID();
      expect(typeof uuid).toBe('string');
      expect(uuid.length).toBe(36);
    });
  });
});

describe('Worker Environment Simulation', () => {
  it('should handle crypto.randomUUID in worker-like environment', () => {
    // Simulate the worker polyfill logic
    const originalFn = crypto.randomUUID;
    (crypto as any).randomUUID = undefined;
    
    // Apply the same logic as in worker.ts
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
      if (typeof crypto.getRandomValues === 'function') {
        (crypto as any).randomUUID = function randomUUID(): string {
          const bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);
          bytes[6] = (bytes[6] & 0x0f) | 0x40;
          bytes[8] = (bytes[8] & 0x3f) | 0x80;
          const hex = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
          return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        };
      }
    }
    
    expect(typeof crypto.randomUUID).toBe('function');
    const uuid = crypto.randomUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    
    // Restore
    (crypto as any).randomUUID = originalFn;
  });
});
