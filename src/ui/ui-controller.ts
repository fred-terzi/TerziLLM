/**
 * UI Controller
 * Manages all DOM interactions for the model vetter app
 */
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { LoadProgress, CompletionStats, ChatMessage } from '../core/api-types';
import type { ModelDefinition, ModelTier } from '../models/model-config';

// Configure marked for safe, fast rendering
marked.setOptions({
  gfm: true,        // GitHub Flavored Markdown
  breaks: true,     // Convert \n to <br>
});

// DOM Element references
export interface UIElements {
  // Status
  statusBanner: HTMLElement;
  statusText: HTMLElement;
  
  // Device Info
  infoBrowser: HTMLElement;
  infoPlatform: HTMLElement;
  infoDeviceType: HTMLElement;
  infoWebgpu: HTMLElement;
  infoGpu: HTMLElement;
  infoTier: HTMLElement;
  
  // Model Selection
  tierFilter: HTMLSelectElement;
  modelSelect: HTMLSelectElement;
  loadBtn: HTMLButtonElement;
  modelInfo: HTMLElement;
  modelName: HTMLElement;
  modelTierBadge: HTMLElement;
  modelProvider: HTMLElement;
  modelSize: HTMLElement;
  modelVram: HTMLElement;
  modelNotes: HTMLElement;
  
  // Progress
  progressContainer: HTMLElement;
  progressFill: HTMLElement;
  progressText: HTMLElement;
  
  // Chat
  messages: HTMLElement;
  userInput: HTMLTextAreaElement;
  sendBtn: HTMLButtonElement;
  abortBtn: HTMLButtonElement;
  
  // Metrics
  metricsContainer: HTMLElement;
  metricLoadTime: HTMLElement;
  metricTokens: HTMLElement;
  metricSpeed: HTMLElement;
  metricTime: HTMLElement;
}

/**
 * Get all DOM element references
 */
export function getUIElements(): UIElements {
  return {
    statusBanner: document.getElementById('status-banner')!,
    statusText: document.getElementById('status-text')!,
    
    infoBrowser: document.getElementById('info-browser')!,
    infoPlatform: document.getElementById('info-platform')!,
    infoDeviceType: document.getElementById('info-device-type')!,
    infoWebgpu: document.getElementById('info-webgpu')!,
    infoGpu: document.getElementById('info-gpu')!,
    infoTier: document.getElementById('info-tier')!,
    
    tierFilter: document.getElementById('tier-filter') as HTMLSelectElement,
    modelSelect: document.getElementById('model-select') as HTMLSelectElement,
    loadBtn: document.getElementById('load-btn') as HTMLButtonElement,
    modelInfo: document.getElementById('model-info')!,
    modelName: document.getElementById('model-name')!,
    modelTierBadge: document.getElementById('model-tier-badge')!,
    modelProvider: document.getElementById('model-provider')!,
    modelSize: document.getElementById('model-size')!,
    modelVram: document.getElementById('model-vram')!,
    modelNotes: document.getElementById('model-notes')!,
    
    progressContainer: document.getElementById('progress-container')!,
    progressFill: document.getElementById('progress-fill')!,
    progressText: document.getElementById('progress-text')!,
    
    messages: document.getElementById('messages')!,
    userInput: document.getElementById('user-input') as HTMLTextAreaElement,
    sendBtn: document.getElementById('send-btn') as HTMLButtonElement,
    abortBtn: document.getElementById('abort-btn') as HTMLButtonElement,
    
    metricsContainer: document.getElementById('metrics')!,
    metricLoadTime: document.getElementById('metric-load-time')!,
    metricTokens: document.getElementById('metric-tokens')!,
    metricSpeed: document.getElementById('metric-speed')!,
    metricTime: document.getElementById('metric-time')!,
  };
}

/**
 * Update status banner
 */
export function updateStatus(
  elements: UIElements,
  type: 'success' | 'error' | 'warning',
  message: string,
  icon?: string
): void {
  elements.statusBanner.className = `${type}`;
  elements.statusBanner.querySelector('.status-icon')!.textContent = icon || 
    (type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️');
  elements.statusText.textContent = message;
}

/**
 * Update device info display
 */
export function updateDeviceInfo(
  elements: UIElements,
  info: {
    browser: string;
    platform: string;
    deviceType: string;
    webgpu: string;
    gpu: string;
    tier: string;
  }
): void {
  elements.infoBrowser.textContent = info.browser;
  elements.infoPlatform.textContent = info.platform;
  elements.infoDeviceType.textContent = info.deviceType;
  elements.infoWebgpu.textContent = info.webgpu;
  elements.infoGpu.textContent = info.gpu;
  elements.infoTier.textContent = info.tier;
}

/**
 * Populate model dropdown
 */
export function populateModelSelect(
  elements: UIElements,
  models: ModelDefinition[],
  tierFilter?: ModelTier | 'all'
): void {
  const select = elements.modelSelect;
  select.innerHTML = '<option value="">Choose a model...</option>';
  
  const filtered = tierFilter && tierFilter !== 'all'
    ? models.filter(m => m.tier === tierFilter)
    : models;
  
  filtered.forEach(model => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.displayName} (${model.parameterCount})`;
    select.appendChild(option);
  });
}

/**
 * Show model info
 */
export function showModelInfo(elements: UIElements, model: ModelDefinition | null): void {
  if (!model) {
    elements.modelInfo.style.display = 'none';
    return;
  }
  
  elements.modelInfo.style.display = 'block';
  elements.modelName.textContent = model.displayName;
  elements.modelTierBadge.textContent = model.tier;
  elements.modelTierBadge.className = `tier-badge ${model.tier}`;
  elements.modelProvider.textContent = model.provider;
  elements.modelSize.textContent = model.parameterCount;
  elements.modelVram.textContent = model.estimatedVRAM;
  elements.modelNotes.textContent = model.notes || '';
}

/**
 * Show/hide progress bar
 */
export function showProgress(elements: UIElements, visible: boolean): void {
  elements.progressContainer.classList.toggle('visible', visible);
}

/**
 * Update progress bar
 */
export function updateProgress(elements: UIElements, progress: LoadProgress): void {
  const percent = Math.round(progress.progress * 100);
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = progress.text;
}

/**
 * Add a message to the chat
 */
export function addMessage(
  elements: UIElements,
  role: ChatMessage['role'],
  content: string,
  isStreaming = false
): HTMLElement {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;
  messageDiv.innerHTML = `
    <div class="message-role">${role}</div>
    <div class="message-content">${renderMarkdown(content)}${isStreaming ? '<span class="spinner"></span>' : ''}</div>
  `;
  elements.messages.appendChild(messageDiv);
  elements.messages.scrollTop = elements.messages.scrollHeight;
  return messageDiv;
}

/**
 * Update a streaming message
 */
export function updateStreamingMessage(messageDiv: HTMLElement, content: string, isComplete = false): void {
  const contentDiv = messageDiv.querySelector('.message-content')!;
  contentDiv.innerHTML = renderMarkdown(content) + (isComplete ? '' : '<span class="spinner"></span>');
}

/**
 * Clear all messages
 */
export function clearMessages(elements: UIElements): void {
  elements.messages.innerHTML = '';
}

/**
 * Add system message
 */
export function addSystemMessage(elements: UIElements, text: string): void {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message system';
  messageDiv.innerHTML = `<div class="message-content">${escapeHtml(text)}</div>`;
  elements.messages.appendChild(messageDiv);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

/**
 * Update chat controls state
 */
export function setChatEnabled(elements: UIElements, enabled: boolean): void {
  elements.userInput.disabled = !enabled;
  elements.sendBtn.disabled = !enabled;
}

/**
 * Show/hide abort button
 */
export function setGenerating(elements: UIElements, isGenerating: boolean): void {
  elements.sendBtn.style.display = isGenerating ? 'none' : 'block';
  elements.abortBtn.style.display = isGenerating ? 'block' : 'none';
  elements.userInput.disabled = isGenerating;
}

/**
 * Update performance metrics
 */
export function updateMetrics(
  elements: UIElements,
  stats: CompletionStats & { loadTimeMs?: number }
): void {
  elements.metricsContainer.style.display = 'grid';
  
  if (stats.loadTimeMs !== undefined) {
    elements.metricLoadTime.textContent = `${(stats.loadTimeMs / 1000).toFixed(1)}s`;
  }
  
  if (stats.totalTokens !== undefined) {
    elements.metricTokens.textContent = String(stats.totalTokens);
  }
  
  if (stats.tokensPerSecond !== undefined) {
    elements.metricSpeed.textContent = stats.tokensPerSecond.toFixed(1);
  }
  
  if (stats.totalTimeMs !== undefined) {
    elements.metricTime.textContent = `${(stats.totalTimeMs / 1000).toFixed(2)}s`;
  }
}

/**
 * Set load button state
 */
export function setLoadButtonState(
  elements: UIElements,
  state: 'ready' | 'loading' | 'loaded' | 'disabled'
): void {
  switch (state) {
    case 'ready':
      elements.loadBtn.disabled = false;
      elements.loadBtn.textContent = 'Load Model';
      break;
    case 'loading':
      elements.loadBtn.disabled = true;
      elements.loadBtn.textContent = 'Loading...';
      break;
    case 'loaded':
      elements.loadBtn.disabled = false;
      elements.loadBtn.textContent = 'Reload Model';
      break;
    case 'disabled':
      elements.loadBtn.disabled = true;
      elements.loadBtn.textContent = 'Load Model';
      break;
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render markdown content safely
 * Uses marked for parsing with DOMPurify for sanitization
 */
function renderMarkdown(text: string): string {
  if (!text) return '';
  
  try {
    // Parse markdown to HTML
    const html = marked.parse(text, { async: false }) as string;
    // Sanitize to prevent XSS attacks
    return DOMPurify.sanitize(html);
  } catch (e) {
    // Fallback to escaped text on error
    console.warn('Markdown parsing failed:', e);
    return escapeHtml(text);
  }
}

/**
 * Format time in human readable format
 */
export function formatTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Show troubleshooting information in the chat area
 */
export function showTroubleshootingInfo(
  elements: UIElements,
  title: string,
  recommendation: string,
  steps: string[]
): void {
  const troubleshootDiv = document.createElement('div');
  troubleshootDiv.className = 'message system troubleshooting';
  
  let stepsHtml = steps.map((step, i) => `<li>${escapeHtml(step)}</li>`).join('');
  
  troubleshootDiv.innerHTML = `
    <div class="message-content">
      <strong>⚠️ ${escapeHtml(title)}</strong><br>
      <p>💡 ${escapeHtml(recommendation)}</p>
      <details>
        <summary>Troubleshooting steps</summary>
        <ol>${stepsHtml}</ol>
      </details>
    </div>
  `;
  
  elements.messages.appendChild(troubleshootDiv);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

/**
 * Show a detailed error message with troubleshooting
 */
export function showErrorWithTroubleshooting(
  elements: UIElements,
  errorMessage: string,
  recommendation: string,
  troubleshooting: string[]
): void {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'message system error-details';
  
  let stepsHtml = troubleshooting.map((step, i) => `<li>${escapeHtml(step)}</li>`).join('');
  
  errorDiv.innerHTML = `
    <div class="message-content error-content">
      <strong>❌ ${escapeHtml(errorMessage)}</strong>
      <p class="recommendation">💡 ${escapeHtml(recommendation)}</p>
      <details open>
        <summary>How to fix this</summary>
        <ol class="troubleshooting-steps">${stepsHtml}</ol>
      </details>
    </div>
  `;
  
  elements.messages.appendChild(errorDiv);
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

/**
 * Update status with optional "try anyway" button
 */
export function updateStatusWithAction(
  elements: UIElements,
  type: 'success' | 'error' | 'warning',
  message: string,
  icon?: string,
  actionText?: string,
  onAction?: () => void
): void {
  elements.statusBanner.className = `${type}`;
  elements.statusBanner.querySelector('.status-icon')!.textContent = icon || 
    (type === 'success' ? '✅' : type === 'error' ? '❌' : '⚠️');
  elements.statusText.textContent = message;
  
  // Remove any existing action button
  const existingBtn = elements.statusBanner.querySelector('.status-action-btn');
  if (existingBtn) {
    existingBtn.remove();
  }
  
  // Add action button if provided
  if (actionText && onAction) {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'status-action-btn';
    actionBtn.textContent = actionText;
    actionBtn.onclick = onAction;
    elements.statusBanner.appendChild(actionBtn);
  }
}
