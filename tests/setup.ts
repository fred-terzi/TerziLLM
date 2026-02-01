/**
 * Test setup file
 * Configures the test environment with necessary mocks and utilities
 */
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock WebGPU API - adapter.info is a property (not a method) in modern WebGPU API
const mockGPU = {
  requestAdapter: vi.fn().mockResolvedValue({
    info: {
      vendor: 'Test Vendor',
      architecture: 'Test Arch',
      device: 'Test Device',
      description: 'Test GPU',
    },
    limits: {
      maxBufferSize: 1024 * 1024 * 256,
    },
    features: new Set(['shader-f16']),
  }),
};

// @ts-ignore - Mocking navigator.gpu
Object.defineProperty(navigator, 'gpu', {
  value: mockGPU,
  writable: true,
  configurable: true,
});

// Mock Worker
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  
  constructor(_url: string | URL) {
    // Mock worker initialization
  }
  
  postMessage(_data: unknown): void {
    // Mock message posting
  }
  
  terminate(): void {
    // Mock termination
  }
  
  addEventListener(_type: string, _listener: EventListener): void {
    // Mock event listener
  }
  
  removeEventListener(_type: string, _listener: EventListener): void {
    // Mock event listener removal
  }
}

vi.stubGlobal('Worker', MockWorker);

// Mock performance.now for consistent timing tests
let mockTime = 0;
vi.spyOn(performance, 'now').mockImplementation(() => mockTime);

export function advanceTime(ms: number): void {
  mockTime += ms;
}

export function resetMockTime(): void {
  mockTime = 0;
}

// Mock DOM elements for UI tests
export function createMockDOM(): void {
  document.body.innerHTML = `
    <div id="status-banner" class="success">
      <span class="status-icon">⏳</span>
      <span id="status-text">Testing...</span>
    </div>
    
    <div id="info-browser">-</div>
    <div id="info-platform">-</div>
    <div id="info-device-type">-</div>
    <div id="info-webgpu">-</div>
    <div id="info-gpu">-</div>
    <div id="info-tier">-</div>
    
    <select id="tier-filter">
      <option value="all">All</option>
      <option value="mobile">Mobile</option>
      <option value="medium">Medium</option>
      <option value="heavy">Heavy</option>
    </select>
    
    <select id="model-select">
      <option value="">Choose...</option>
    </select>
    
    <button id="load-btn">Load Model</button>
    
    <div id="model-info" style="display: none;">
      <span id="model-name">-</span>
      <span id="model-tier-badge" class="tier-badge">-</span>
      <span id="model-provider">-</span>
      <span id="model-size">-</span>
      <span id="model-vram">-</span>
      <span id="model-notes">-</span>
    </div>
    
    <div id="progress-container" class="progress-container">
      <div id="progress-fill" class="progress-fill"></div>
      <p id="progress-text">Preparing...</p>
    </div>
    
    <div id="messages"></div>
    <textarea id="user-input"></textarea>
    <button id="send-btn">Send</button>
    <button id="abort-btn" style="display: none;">Stop</button>
    
    <div id="metrics" style="display: none;">
      <div id="metric-load-time">-</div>
      <div id="metric-tokens">-</div>
      <div id="metric-speed">-</div>
      <div id="metric-time">-</div>
    </div>
  `;
}

// Reset DOM before each test
beforeEach(() => {
  createMockDOM();
  resetMockTime();
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
