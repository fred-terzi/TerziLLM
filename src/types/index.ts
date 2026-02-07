// ============================================================
// Shared Types for TerziLLM
// ============================================================

// --- Database entities ---

export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: Date
  metadata?: MessageMetadata
}

export interface MessageMetadata {
  model?: string
  tokensUsed?: number
  promptTokens?: number
  completionTokens?: number
  durationMs?: number
}

// --- Worker message protocol ---

export type WorkerMessageToWorker =
  | { type: 'init'; model: string }
  | { type: 'chat'; messages: ChatMessage[]; config?: GenerateConfig }
  | { type: 'abort' }

export type WorkerMessageFromWorker =
  | { type: 'init-progress'; progress: number; text: string }
  | { type: 'init-complete'; success: boolean }
  | { type: 'chunk'; content: string }
  | { type: 'done'; usage?: TokenUsage }
  | { type: 'error'; error: string; code: ErrorCode }

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface GenerateConfig {
  temperature?: number
  top_p?: number
  max_tokens?: number
  frequency_penalty?: number
  presence_penalty?: number
}

export interface TokenUsage {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export type ErrorCode =
  | 'WEBGPU_NOT_SUPPORTED'
  | 'MODEL_LOAD_FAILED'
  | 'OUT_OF_MEMORY'
  | 'GENERATION_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

// --- Model definitions ---

export type ModelTier = 'mobile' | 'light' | 'medium' | 'heavy'

export interface ModelInfo {
  id: string
  name: string
  tier: ModelTier
  sizeLabel: string
  description: string
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    tier: 'mobile',
    sizeLabel: '~700MB',
    description: 'Fast, lightweight responses',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    tier: 'light',
    sizeLabel: '~1.8GB',
    description: 'Balanced quality and speed',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    tier: 'medium',
    sizeLabel: '~2.1GB',
    description: 'Strong reasoning ability',
  },
  {
    id: 'Qwen2.5-7B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 7B',
    tier: 'heavy',
    sizeLabel: '~4.5GB',
    description: 'High quality (requires good GPU)',
  },
]

// --- App store ---

export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error'
export type InferenceMode = 'local' | 'remote'
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface AppState {
  // Inference
  inferenceMode: InferenceMode
  modelId: string | null
  modelStatus: ModelStatus
  loadProgress: number
  loadProgressText: string
  errorMessage: string | null
  errorCode: ErrorCode | null

  // Conversations
  currentConversationId: string | null
  conversations: Conversation[]

  // UI
  sidebarOpen: boolean
  settingsOpen: boolean
}

// --- Cached model info ---

export interface CachedModelInfo {
  modelId: string
  sizeBytes: number
  sizeLabel: string
}
