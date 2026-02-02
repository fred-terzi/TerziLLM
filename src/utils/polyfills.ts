/**
 * Polyfills for browser compatibility
 * 
 * This file provides polyfills for APIs that may not be available
 * in all browsers, especially older Safari versions or non-secure contexts.
 */

/**
 * Polyfill for crypto.randomUUID()
 * 
 * crypto.randomUUID() requires:
 * - A secure context (HTTPS) on Safari
 * - Safari 15.4+ / iOS 15.4+
 * - Chrome 92+ / Edge 92+ / Firefox 95+
 * 
 * This polyfill uses crypto.getRandomValues() which has broader support.
 */
export function polyfillCryptoRandomUUID(): void {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
    // Use crypto.getRandomValues if available (much broader support)
    if (typeof crypto.getRandomValues === 'function') {
      (crypto as any).randomUUID = function randomUUID(): string {
        // Generate 16 random bytes
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        
        // Set version (4) and variant (RFC 4122)
        bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10xx
        
        // Convert to hex string with proper UUID format
        const hex = Array.from(bytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      };
      
      console.log('[Polyfill] crypto.randomUUID polyfilled using crypto.getRandomValues');
    } else {
      // Fallback to Math.random (less secure but works everywhere)
      (crypto as any).randomUUID = function randomUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };
      
      console.warn('[Polyfill] crypto.randomUUID polyfilled using Math.random (less secure)');
    }
  }
}

/**
 * Check if we're in a secure context
 * crypto.randomUUID and some other APIs require HTTPS
 */
export function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

/**
 * Get list of missing or problematic browser features
 */
export interface BrowserFeatureCheck {
  feature: string;
  available: boolean;
  critical: boolean;
  recommendation?: string;
}

export function checkBrowserFeatures(): BrowserFeatureCheck[] {
  const features: BrowserFeatureCheck[] = [];
  
  // Check secure context
  features.push({
    feature: 'Secure Context (HTTPS)',
    available: isSecureContext(),
    critical: false,
    recommendation: 'Some features work better over HTTPS. If on localhost, this is usually fine.',
  });
  
  // Check crypto API
  features.push({
    feature: 'Web Crypto API',
    available: typeof crypto !== 'undefined',
    critical: true,
    recommendation: 'The crypto API is required. Use a modern browser.',
  });
  
  // Check crypto.getRandomValues
  features.push({
    feature: 'crypto.getRandomValues',
    available: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
    critical: true,
    recommendation: 'Required for secure random number generation.',
  });
  
  // Check crypto.randomUUID (before polyfill)
  features.push({
    feature: 'crypto.randomUUID',
    available: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function',
    critical: false, // We polyfill this
    recommendation: 'Will be polyfilled if missing.',
  });
  
  // Check WebGPU
  features.push({
    feature: 'WebGPU API',
    available: 'gpu' in navigator,
    critical: true,
    recommendation: 'WebGPU is required. Use Chrome 121+, Edge 121+, or Safari 18+.',
  });
  
  // Check Web Workers
  features.push({
    feature: 'Web Workers',
    available: typeof Worker !== 'undefined',
    critical: true,
    recommendation: 'Web Workers are required for running the LLM.',
  });
  
  // Check IndexedDB (for caching models)
  features.push({
    feature: 'IndexedDB',
    available: typeof indexedDB !== 'undefined',
    critical: false,
    recommendation: 'IndexedDB is used for caching models. Without it, models will be re-downloaded.',
  });
  
  // Check fetch API
  features.push({
    feature: 'Fetch API',
    available: typeof fetch !== 'undefined',
    critical: true,
    recommendation: 'The Fetch API is required for downloading models.',
  });
  
  // Check TextDecoder/TextEncoder
  features.push({
    feature: 'TextEncoder/TextDecoder',
    available: typeof TextEncoder !== 'undefined' && typeof TextDecoder !== 'undefined',
    critical: true,
    recommendation: 'Required for text processing.',
  });
  
  return features;
}

/**
 * Apply all necessary polyfills
 */
export function applyPolyfills(): void {
  polyfillCryptoRandomUUID();
}

/**
 * Get a summary of browser compatibility issues
 */
export function getBrowserCompatibilitySummary(): {
  allCriticalFeaturesAvailable: boolean;
  missingCritical: string[];
  missingNonCritical: string[];
  recommendations: string[];
} {
  const features = checkBrowserFeatures();
  
  const missingCritical = features
    .filter(f => f.critical && !f.available)
    .map(f => f.feature);
    
  const missingNonCritical = features
    .filter(f => !f.critical && !f.available)
    .map(f => f.feature);
    
  const recommendations = features
    .filter(f => !f.available && f.recommendation)
    .map(f => `${f.feature}: ${f.recommendation}`);
  
  return {
    allCriticalFeaturesAvailable: missingCritical.length === 0,
    missingCritical,
    missingNonCritical,
    recommendations,
  };
}
