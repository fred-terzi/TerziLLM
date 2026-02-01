/**
 * WebGPU Detection and Capability Checking
 * Provides utilities to detect browser support and device capabilities
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

/**
 * Check if WebGPU is available in the current browser
 */
export function hasWebGPU(): boolean {
  return 'gpu' in navigator;
}

/**
 * Get detailed GPU capabilities
 */
export async function getGPUCapabilities(): Promise<GPUCapabilities> {
  if (!hasWebGPU()) {
    return {
      supported: false,
      errorMessage: 'WebGPU is not supported in this browser',
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    
    if (!adapter) {
      return {
        supported: false,
        errorMessage: 'No GPU adapter found. Your device may not support WebGPU.',
      };
    }

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
 * Check WebGPU browser compatibility
 */
export function checkBrowserCompatibility(): {
  compatible: boolean;
  message: string;
  recommendation?: string;
} {
  const info = getDeviceInfo();
  
  if (!info.hasWebGPU) {
    if (info.browserName === 'Firefox') {
      return {
        compatible: false,
        message: 'Firefox does not fully support WebGPU yet.',
        recommendation: 'Please use Chrome 121+, Edge 121+, or Safari 18+ for WebGPU support.',
      };
    }
    
    if (info.browserName === 'Safari' && info.platform === 'iOS') {
      return {
        compatible: false,
        message: 'iOS Safari does not support WebGPU yet.',
        recommendation: 'WebGPU support for iOS is coming in a future Safari version.',
      };
    }
    
    if (info.browserName === 'Chrome' && parseInt(info.browserVersion) < 121) {
      return {
        compatible: false,
        message: `Chrome ${info.browserVersion} does not support WebGPU.`,
        recommendation: 'Please update to Chrome 121 or newer.',
      };
    }
    
    return {
      compatible: false,
      message: 'WebGPU is not available in your browser.',
      recommendation: 'Please use Chrome 121+, Edge 121+, or Safari 18+.',
    };
  }
  
  return {
    compatible: true,
    message: `WebGPU is supported on ${info.browserName} ${info.browserVersion}`,
  };
}

/**
 * Format GPU info for display
 */
export function formatGPUInfo(capabilities: GPUCapabilities): string {
  if (!capabilities.supported) {
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
