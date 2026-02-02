/**
 * WebGPU Detection and Capability Checking
 * Provides utilities to detect browser support and device capabilities
 * 
 * Note: Detection is intentionally "soft" - we allow users to attempt model loading
 * even if detection is uncertain, since some browsers (e.g., Safari on iOS) may
 * support WebGPU but not be detected correctly.
 */

export interface SimpleAdapterInfo {
  vendor?: string;
  architecture?: string;
  device?: string;
  description?: string;
}

export interface GPUCapabilities {
  supported: boolean;
  adapterInfo?: SimpleAdapterInfo;
  limits?: GPUSupportedLimits;
  features?: string[];
  errorMessage?: string;
  /** Whether detection was uncertain (adapter may still work) */
  uncertain?: boolean;
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  browserName: string;
  browserVersion: string;
  platform: string;
  hasWebGPU: boolean;
  estimatedTier: 'mobile' | 'medium' | 'heavy' | 'unknown';
}

/** Result of compatibility check with actionable recommendations */
export interface CompatibilityResult {
  compatible: boolean;
  /** Allow user to try anyway (soft failure) */
  allowAttempt: boolean;
  message: string;
  recommendation?: string;
  /** Detailed troubleshooting steps */
  troubleshooting?: string[];
}

/** WebGPU error with context and recommendations */
export interface WebGPUError {
  code: 'NO_WEBGPU' | 'NO_ADAPTER' | 'ADAPTER_LOST' | 'OUT_OF_MEMORY' | 'API_ERROR' | 'UNKNOWN';
  message: string;
  recommendation: string;
  troubleshooting: string[];
}

/**
 * Check if WebGPU API is available in the current browser
 * Note: This checks API presence, not actual GPU availability
 */
export function hasWebGPU(): boolean {
  return 'gpu' in navigator && navigator.gpu !== undefined;
}

/**
 * Attempt to verify WebGPU actually works by requesting an adapter
 * This is more reliable than just checking API presence
 */
export async function verifyWebGPUWorks(): Promise<{
  works: boolean;
  adapter: GPUAdapter | null;
  error?: string;
}> {
  if (!hasWebGPU()) {
    return { works: false, adapter: null, error: 'WebGPU API not available' };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance',
    });
    
    if (!adapter) {
      // Try again with low-power preference (common on mobile)
      const lowPowerAdapter = await navigator.gpu.requestAdapter({
        powerPreference: 'low-power',
      });
      
      if (!lowPowerAdapter) {
        return { works: false, adapter: null, error: 'No GPU adapter available' };
      }
      return { works: true, adapter: lowPowerAdapter };
    }
    
    return { works: true, adapter };
  } catch (error) {
    return {
      works: false,
      adapter: null,
      error: error instanceof Error ? error.message : 'Unknown error requesting adapter',
    };
  }
}

/**
 * Get detailed GPU capabilities
 * Uses actual adapter request to verify WebGPU support
 */
export async function getGPUCapabilities(): Promise<GPUCapabilities> {
  // First, verify WebGPU actually works
  const verification = await verifyWebGPUWorks();
  
  if (!verification.works || !verification.adapter) {
    return {
      supported: false,
      // Mark as uncertain if the API exists but adapter failed
      // This allows users to still try (some browsers behave oddly)
      uncertain: hasWebGPU(),
      errorMessage: verification.error || 'WebGPU is not supported in this browser',
    };
  }

  try {
    const adapter = verification.adapter;
    
    // Get adapter info - the API varies across browser versions
    let info: SimpleAdapterInfo = {};
    try {
      // Modern API uses adapter.info property
      if ('info' in adapter) {
        const adapterInfo = (adapter as any).info;
        info = {
          vendor: adapterInfo.vendor,
          architecture: adapterInfo.architecture,
          device: adapterInfo.device,
          description: adapterInfo.description,
        };
      }
    } catch {
      // Fallback - some browsers may not provide adapter info
    }
    
    const features = Array.from(adapter.features) as string[];

    return {
      supported: true,
      adapterInfo: info,
      limits: adapter.limits,
      features,
    };
  } catch (error) {
    return {
      supported: false,
      uncertain: true,
      errorMessage: error instanceof Error ? error.message : 'Unknown error checking GPU',
    };
  }
}

/**
 * Detect device type and browser information
 */
export function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;
  
  // Detect mobile/tablet
  const isMobile = /iPhone|iPod|Android.*Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  
  // Detect browser
  let browserName = 'Unknown';
  let browserVersion = '';
  
  if (ua.includes('Chrome')) {
    browserName = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Firefox')) {
    browserName = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    browserVersion = match ? match[1] : '';
  } else if (ua.includes('Edge')) {
    browserName = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    browserVersion = match ? match[1] : '';
  }
  
  // Detect platform
  let platform = 'Unknown';
  if (ua.includes('Win')) platform = 'Windows';
  else if (ua.includes('Mac')) platform = 'macOS';
  else if (ua.includes('Linux')) platform = 'Linux';
  else if (ua.includes('Android')) platform = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) platform = 'iOS';
  
  // Estimate tier based on device type
  let estimatedTier: DeviceInfo['estimatedTier'] = 'unknown';
  if (isMobile) {
    estimatedTier = 'mobile';
  } else if (isTablet) {
    estimatedTier = 'medium';
  } else {
    estimatedTier = 'heavy';
  }
  
  return {
    isMobile,
    isTablet,
    browserName,
    browserVersion,
    platform,
    hasWebGPU: hasWebGPU(),
    estimatedTier,
  };
}

/**
 * Check WebGPU browser compatibility with detailed recommendations
 * This is now a "soft" check - allows users to try even if detection is uncertain
 */
export async function checkBrowserCompatibility(): Promise<CompatibilityResult> {
  const info = getDeviceInfo();
  const gpuCapabilities = await getGPUCapabilities();
  
  // WebGPU is confirmed working
  if (gpuCapabilities.supported) {
    return {
      compatible: true,
      allowAttempt: true,
      message: `WebGPU is supported on ${info.browserName} ${info.browserVersion}`,
    };
  }
  
  // Detection uncertain - allow user to try anyway
  if (gpuCapabilities.uncertain) {
    return {
      compatible: false,
      allowAttempt: true, // Key change: let users try!
      message: `WebGPU detection uncertain on ${info.browserName} ${info.browserVersion}`,
      recommendation: 'Detection was inconclusive. You can still try loading a model.',
      troubleshooting: getTroubleshootingSteps(info, gpuCapabilities),
    };
  }
  
  // Specific browser recommendations
  if (info.browserName === 'Firefox') {
    return {
      compatible: false,
      allowAttempt: true, // Firefox Nightly may work
      message: 'Firefox has experimental WebGPU support.',
      recommendation: 'Try Firefox Nightly with dom.webgpu.enabled in about:config, or use Chrome/Safari.',
      troubleshooting: [
        'In Firefox, go to about:config',
        'Search for "dom.webgpu.enabled"',
        'Set it to true',
        'Restart Firefox',
        'Alternatively, use Chrome 121+ or Safari 18+',
      ],
    };
  }
  
  // Safari on iOS/macOS
  if (info.browserName === 'Safari') {
    const safariVersion = parseInt(info.browserVersion) || 0;
    
    if (info.platform === 'iOS') {
      return {
        compatible: false,
        allowAttempt: true, // Safari 18+ on iOS should work
        message: `iOS Safari ${info.browserVersion} - WebGPU may require enabling.`,
        recommendation: safariVersion >= 18 
          ? 'Safari 18+ supports WebGPU. Try enabling it in Settings > Safari > Advanced > Feature Flags.'
          : 'Update to iOS 18+ for WebGPU support, or try the model anyway.',
        troubleshooting: [
          'Go to Settings > Safari > Advanced > Feature Flags',
          'Enable "WebGPU"',
          'Restart Safari completely (swipe up to close)',
          'If still not working, restart your device',
          'Make sure you\'re on iOS 18 or later',
        ],
      };
    }
    
    // macOS Safari
    return {
      compatible: false,
      allowAttempt: true,
      message: `Safari ${info.browserVersion} on macOS - WebGPU may require enabling.`,
      recommendation: 'Enable WebGPU in Safari > Develop > Feature Flags, or use Chrome.',
      troubleshooting: [
        'Enable Developer menu: Safari > Settings > Advanced > Show Develop menu',
        'Go to Develop > Feature Flags > WebGPU',
        'Enable WebGPU',
        'Restart Safari',
        'If Develop menu is not visible, enable it in Safari > Settings > Advanced',
      ],
    };
  }
  
  // Chrome with old version
  if (info.browserName === 'Chrome') {
    const chromeVersion = parseInt(info.browserVersion) || 0;
    if (chromeVersion < 121) {
      return {
        compatible: false,
        allowAttempt: false,
        message: `Chrome ${info.browserVersion} does not support WebGPU.`,
        recommendation: 'Please update to Chrome 121 or newer.',
        troubleshooting: [
          'Go to Chrome menu > Help > About Google Chrome',
          'Chrome will check for updates automatically',
          'Click "Relaunch" after updating',
        ],
      };
    }
  }
  
  // Edge
  if (info.browserName === 'Edge') {
    const edgeVersion = parseInt(info.browserVersion) || 0;
    if (edgeVersion < 121) {
      return {
        compatible: false,
        allowAttempt: false,
        message: `Edge ${info.browserVersion} does not support WebGPU.`,
        recommendation: 'Please update to Edge 121 or newer.',
        troubleshooting: [
          'Go to Edge menu > Help and feedback > About Microsoft Edge',
          'Edge will check for updates automatically',
          'Click "Restart" after updating',
        ],
      };
    }
  }
  
  // Generic fallback - still allow attempt
  return {
    compatible: false,
    allowAttempt: true,
    message: 'WebGPU may not be available in your browser.',
    recommendation: 'Try Chrome 121+, Edge 121+, or Safari 18+. You can still attempt to load a model.',
    troubleshooting: getTroubleshootingSteps(info, gpuCapabilities),
  };
}

/**
 * Legacy sync version for backward compatibility
 * @deprecated Use checkBrowserCompatibility() async version instead
 */
export function checkBrowserCompatibilitySync(): {
  compatible: boolean;
  message: string;
  recommendation?: string;
} {
  const info = getDeviceInfo();
  
  if (!info.hasWebGPU) {
    return {
      compatible: false,
      message: 'WebGPU API not detected.',
      recommendation: 'Try Chrome 121+, Edge 121+, or Safari 18+.',
    };
  }
  
  return {
    compatible: true,
    message: `WebGPU API detected on ${info.browserName} ${info.browserVersion}`,
  };
}

/**
 * Get troubleshooting steps based on device and error context
 */
function getTroubleshootingSteps(info: DeviceInfo, capabilities: GPUCapabilities): string[] {
  const steps: string[] = [];
  
  if (info.platform === 'iOS') {
    steps.push(
      'Ensure you\'re on iOS 18 or later',
      'Go to Settings > Safari > Advanced > Feature Flags',
      'Enable "WebGPU"',
      'Close Safari completely and reopen',
      'Try restarting your device',
    );
  } else if (info.browserName === 'Safari') {
    steps.push(
      'Enable Developer menu in Safari > Settings > Advanced',
      'Go to Develop > Feature Flags > WebGPU',
      'Restart Safari',
    );
  } else if (info.browserName === 'Chrome' || info.browserName === 'Edge') {
    steps.push(
      'Ensure your browser is updated to version 121+',
      'Try chrome://flags and enable "WebGPU"',
      'Check that hardware acceleration is enabled in settings',
      'Update your graphics drivers',
    );
  } else {
    steps.push(
      'Use a supported browser: Chrome 121+, Edge 121+, or Safari 18+',
      'Ensure hardware acceleration is enabled',
      'Update your graphics drivers',
    );
  }
  
  if (capabilities.errorMessage) {
    steps.push(`Error details: ${capabilities.errorMessage}`);
  }
  
  return steps;
}

/**
 * Format GPU info for display
 */
export function formatGPUInfo(capabilities: GPUCapabilities): string {
  if (!capabilities.supported) {
    if (capabilities.uncertain) {
      return capabilities.errorMessage 
        ? `Detection uncertain: ${capabilities.errorMessage}`
        : 'GPU detection uncertain (may still work)';
    }
    return capabilities.errorMessage || 'WebGPU not supported';
  }
  
  const info = capabilities.adapterInfo;
  if (!info) {
    return 'GPU adapter available (no details)';
  }
  
  const parts: string[] = [];
  if (info.vendor) parts.push(`Vendor: ${info.vendor}`);
  if (info.architecture) parts.push(`Architecture: ${info.architecture}`);
  if (info.device) parts.push(`Device: ${info.device}`);
  if (info.description) parts.push(`Description: ${info.description}`);
  
  return parts.length > 0 ? parts.join('\n') : 'GPU adapter available';
}

/**
 * Parse a WebGPU or model loading error into user-friendly format
 * with specific recommendations for how to fix it
 */
export function parseWebGPUError(error: Error | string): WebGPUError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();
  
  // API/Function errors (like crypto.randomUUID is not a function)
  if (lowerMessage.includes('is not a function') || 
      lowerMessage.includes('is not defined') ||
      lowerMessage.includes('undefined is not')) {
    return {
      code: 'API_ERROR',
      message: 'A required browser API is not available.',
      recommendation: 'Try refreshing the page or update your browser.',
      troubleshooting: [
        'Refresh the page - the app includes polyfills that may help',
        'Update your browser to the latest version',
        'On iOS Safari, ensure you\'re on iOS 15.4 or later',
        'Try accessing the page over HTTPS (some APIs require secure context)',
        'If on Safari, try enabling experimental features in Settings',
        `Technical details: ${errorMessage}`,
      ],
    };
  }
  
  // Out of memory errors
  if (lowerMessage.includes('out of memory') || 
      lowerMessage.includes('oom') ||
      lowerMessage.includes('allocation failed') ||
      lowerMessage.includes('memory')) {
    return {
      code: 'OUT_OF_MEMORY',
      message: 'Your device ran out of GPU memory.',
      recommendation: 'Try a smaller model from the "mobile" tier.',
      troubleshooting: [
        'Close other browser tabs and applications',
        'Select a smaller model (mobile tier recommended)',
        'On iOS, try closing other apps and restarting Safari',
        'Restart your device to free up memory',
        'Some models require more VRAM than your device has',
      ],
    };
  }
  
  // Adapter lost
  if (lowerMessage.includes('adapter lost') || 
      lowerMessage.includes('device lost') ||
      lowerMessage.includes('context lost')) {
    return {
      code: 'ADAPTER_LOST',
      message: 'GPU connection was lost during loading.',
      recommendation: 'Refresh the page and try again.',
      troubleshooting: [
        'Refresh the page',
        'Close other GPU-intensive applications',
        'Try a smaller model',
        'Restart your browser',
        'If on mobile, make sure the screen stays on during loading',
      ],
    };
  }
  
  // No adapter
  if (lowerMessage.includes('no adapter') || 
      lowerMessage.includes('adapter is null') ||
      lowerMessage.includes('requestadapter')) {
    return {
      code: 'NO_ADAPTER',
      message: 'No compatible GPU adapter found.',
      recommendation: 'Your device may not support WebGPU.',
      troubleshooting: [
        'Ensure WebGPU is enabled in your browser settings',
        'On Safari: Settings > Safari > Advanced > Feature Flags > WebGPU',
        'On Chrome: Update to version 121+',
        'Check that hardware acceleration is enabled',
        'Try restarting your browser',
      ],
    };
  }
  
  // WebGPU not supported
  if (lowerMessage.includes('webgpu') && 
      (lowerMessage.includes('not supported') || lowerMessage.includes('undefined'))) {
    return {
      code: 'NO_WEBGPU',
      message: 'WebGPU is not available.',
      recommendation: 'Use a browser that supports WebGPU.',
      troubleshooting: [
        'Chrome 121+ has WebGPU enabled by default',
        'Safari 18+ (iOS 18/macOS Sonoma) supports WebGPU',
        'On Safari, enable WebGPU in Feature Flags if needed',
        'Edge 121+ also supports WebGPU',
        'Firefox requires enabling in about:config',
      ],
    };
  }
  
  // Generic unknown error
  return {
    code: 'UNKNOWN',
    message: errorMessage,
    recommendation: 'An unexpected error occurred.',
    troubleshooting: [
      'Refresh the page and try again',
      'Try a different, smaller model',
      'Close other browser tabs',
      'Restart your browser',
      `Error details: ${errorMessage}`,
    ],
  };
}

/**
 * Format a WebGPU error for display with full troubleshooting info
 */
export function formatWebGPUError(error: WebGPUError): string {
  let output = `❌ ${error.message}\n\n`;
  output += `💡 ${error.recommendation}\n\n`;
  output += `Troubleshooting steps:\n`;
  error.troubleshooting.forEach((step, i) => {
    output += `${i + 1}. ${step}\n`;
  });
  return output;
}