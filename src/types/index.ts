/**
 * Core type definitions for TerziLLM
 */

// ============================================
// Conversation & Message Types
// ============================================

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  model?: string;
  tokenUsage?: TokenUsage;
  generationTime?: number;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  model?: string;
}

// ============================================
// Model Types
// ============================================

export interface ModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
  vram: string;
  category: 'mobile' | 'light' | 'medium' | 'heavy';
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    size: '~700MB',
    description: 'Fast, lightweight responses',
    vram: '2GB',
    category: 'mobile',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    size: '~1.8GB',
    description: 'Balanced quality/speed',
    vram: '4GB',
    category: 'light',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    size: '~2.1GB',
    description: 'Strong reasoning',
    vram: '4GB',
    category: 'medium',
  },
  {
    id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 7B',
    size: '~4.5GB',
    description: 'High quality (requires good GPU)',
    vram: '8GB',
    category: 'heavy',
  },
];

// ============================================
// App State Types
// ============================================

export type InferenceMode = 'local' | 'remote';
export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  selectedModel: string;
  inferenceMode: InferenceMode;
  hostUrl: string | null;
}

// ============================================
// UI State Types
// ============================================

export interface UIState {
  sidebarOpen: boolean;
  settingsOpen: boolean;
  modelSelectorOpen: boolean;
}
