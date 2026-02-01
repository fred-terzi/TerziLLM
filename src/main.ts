/**
 * Main Application Entry Point
 * Orchestrates the model vetter UI and WebLLM integration
 */
import { SimpleLLMClient } from './core/webllm-client';
import type { ChatMessage, CompletionStats, LoadProgress } from './core/api-types';
import {
  getDeviceInfo,
  getGPUCapabilities,
  checkBrowserCompatibility,
  formatGPUInfo,
} from './utils/webgpu-detect';
import {
  VETTING_MODELS,
  getModelById,
  getModelsByTier,
  ModelTier,
  type ModelDefinition,
} from './models/model-config';
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
  type UIElements,
} from './ui/ui-controller';

// Application state
interface AppState {
  client: SimpleLLMClient | null;
  currentModel: ModelDefinition | null;
  isLoading: boolean;
  isGenerating: boolean;
  chatHistory: ChatMessage[];
  loadTimeMs: number;
}

const state: AppState = {
  client: null,
  currentModel: null,
  isLoading: false,
  isGenerating: false,
  chatHistory: [],
  loadTimeMs: 0,
};

let ui: UIElements;

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  console.log('[App] Initializing...');
  
  // Get UI elements
  ui = getUIElements();
  
  // Check WebGPU support
  await checkEnvironment();
  
  // Setup event listeners
  setupEventListeners();
  
  // Populate model dropdown
  populateModelSelect(ui, VETTING_MODELS);
  
  console.log('[App] Initialized');
}

/**
 * Check WebGPU environment and update UI
 */
async function checkEnvironment(): Promise<void> {
  const deviceInfo = getDeviceInfo();
  const compatibility = checkBrowserCompatibility();
  const gpuCapabilities = await getGPUCapabilities();
  
  // Update device info display
  updateDeviceInfo(ui, {
    browser: `${deviceInfo.browserName} ${deviceInfo.browserVersion}`,
    platform: deviceInfo.platform,
    deviceType: deviceInfo.isMobile ? 'Mobile' : deviceInfo.isTablet ? 'Tablet' : 'Desktop',
    webgpu: deviceInfo.hasWebGPU ? '✅ Supported' : '❌ Not Supported',
    gpu: formatGPUInfo(gpuCapabilities),
    tier: deviceInfo.estimatedTier.charAt(0).toUpperCase() + deviceInfo.estimatedTier.slice(1),
  });
  
  // Update status banner
  if (compatibility.compatible) {
    updateStatus(ui, 'success', compatibility.message, '✅');
    
    // Pre-select recommended tier
    ui.tierFilter.value = deviceInfo.estimatedTier === 'unknown' ? 'all' : deviceInfo.estimatedTier;
    filterModels(ui.tierFilter.value as ModelTier | 'all');
  } else {
    updateStatus(ui, 'error', `${compatibility.message} ${compatibility.recommendation || ''}`, '❌');
    setLoadButtonState(ui, 'disabled');
    setChatEnabled(ui, false);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners(): void {
  // Tier filter change
  ui.tierFilter.addEventListener('change', () => {
    filterModels(ui.tierFilter.value as ModelTier | 'all');
  });
  
  // Model selection change
  ui.modelSelect.addEventListener('change', () => {
    const modelId = ui.modelSelect.value;
    const model = modelId ? getModelById(modelId) : null;
    showModelInfo(ui, model ?? null);
    setLoadButtonState(ui, modelId ? 'ready' : 'disabled');
  });
  
  // Load button click
  ui.loadBtn.addEventListener('click', () => {
    const modelId = ui.modelSelect.value;
    if (modelId) {
      loadModel(modelId);
    }
  });
  
  // Send button click
  ui.sendBtn.addEventListener('click', () => {
    sendMessage();
  });
  
  // Abort button click
  ui.abortBtn.addEventListener('click', () => {
    abortGeneration();
  });
  
  // Enter key to send
  ui.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
}

/**
 * Filter models by tier
 */
function filterModels(tier: ModelTier | 'all'): void {
  const models = tier === 'all' ? VETTING_MODELS : getModelsByTier(tier);
  populateModelSelect(ui, models, tier);
  showModelInfo(ui, null);
  setLoadButtonState(ui, 'disabled');
}

/**
 * Load a model
 */
async function loadModel(modelId: string): Promise<void> {
  if (state.isLoading) return;
  
  const model = getModelById(modelId);
  if (!model) {
    updateStatus(ui, 'error', `Model not found: ${modelId}`, '❌');
    return;
  }
  
  state.isLoading = true;
  state.currentModel = model;
  setLoadButtonState(ui, 'loading');
  showProgress(ui, true);
  clearMessages(ui);
  addSystemMessage(ui, `Loading ${model.displayName}...`);
  
  const startTime = performance.now();
  
  try {
    // Create client if needed
    if (!state.client) {
      state.client = new SimpleLLMClient();
    }
    
    // Load the model
    await state.client.loadModel(modelId, (progress: LoadProgress) => {
      updateProgress(ui, progress);
    });
    
    state.loadTimeMs = performance.now() - startTime;
    state.chatHistory = [];
    
    // Update UI
    showProgress(ui, false);
    setLoadButtonState(ui, 'loaded');
    setChatEnabled(ui, true);
    updateStatus(ui, 'success', `${model.displayName} loaded successfully!`, '🚀');
    addSystemMessage(ui, `${model.displayName} ready! Load time: ${(state.loadTimeMs / 1000).toFixed(1)}s`);
    
    // Show initial metrics
    updateMetrics(ui, { loadTimeMs: state.loadTimeMs });
    
  } catch (error) {
    console.error('[App] Failed to load model:', error);
    showProgress(ui, false);
    setLoadButtonState(ui, 'ready');
    const errorMsg = error instanceof Error ? error.message : String(error);
    updateStatus(ui, 'error', `Failed to load model: ${errorMsg}`, '❌');
    addSystemMessage(ui, `Error: ${errorMsg}`);
  } finally {
    state.isLoading = false;
  }
}

/**
 * Send a chat message
 */
async function sendMessage(): Promise<void> {
  const input = ui.userInput.value.trim();
  if (!input || !state.client?.isReady() || state.isGenerating) return;
  
  // Clear input
  ui.userInput.value = '';
  
  // Add user message
  const userMessage: ChatMessage = { role: 'user', content: input };
  state.chatHistory.push(userMessage);
  addMessage(ui, 'user', input);
  
  // Start generation
  state.isGenerating = true;
  setGenerating(ui, true);
  
  // Create assistant message placeholder
  const assistantMessageDiv = addMessage(ui, 'assistant', '', true);
  
  try {
    const config = state.currentModel?.recommendedConfig || {};
    
    const response = await state.client.chat({
      messages: state.chatHistory,
      config: {
        model: state.currentModel?.id || '',
        stream: true,
        ...config,
      },
      onUpdate: (fullText: string) => {
        updateStreamingMessage(assistantMessageDiv, fullText, false);
      },
      onFinish: (finalText: string, stats?: CompletionStats) => {
        updateStreamingMessage(assistantMessageDiv, finalText, true);
        
        // Add to history
        state.chatHistory.push({ role: 'assistant', content: finalText });
        
        // Update metrics
        if (stats) {
          updateMetrics(ui, { ...stats, loadTimeMs: state.loadTimeMs });
        }
      },
      onError: (error: Error) => {
        updateStreamingMessage(assistantMessageDiv, `Error: ${error.message}`, true);
      },
    });
    
    console.log('[App] Response:', response.substring(0, 100) + '...');
    
  } catch (error) {
    console.error('[App] Chat error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    updateStreamingMessage(assistantMessageDiv, `Error: ${errorMsg}`, true);
  } finally {
    state.isGenerating = false;
    setGenerating(ui, false);
  }
}

/**
 * Abort current generation
 */
async function abortGeneration(): Promise<void> {
  if (state.client && state.isGenerating) {
    await state.client.abort();
    state.isGenerating = false;
    setGenerating(ui, false);
    addSystemMessage(ui, 'Generation aborted');
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Export for testing
export { init, state };
