/**
 * Model Configuration
 * Curated list of models for vetting across devices
 */

export enum ModelTier {
  MOBILE = 'mobile',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
}

export enum ModelFamily {
  LLAMA = 'llama',
  PHI = 'phi',
  SMOLLM = 'smollm',
  QWEN = 'qwen',
  DEEPSEEK = 'deepseek',
  TINYLLAMA = 'tinyllama',
  GEMMA = 'gemma',
}

export interface ModelDefinition {
  id: string;
  displayName: string;
  provider: string;
  family: ModelFamily;
  tier: ModelTier;
  parameterCount: string;
  quantization: string;
  contextWindow: number;
  estimatedVRAM: string;
  recommendedConfig: {
    temperature: number;
    top_p: number;
    presence_penalty?: number;
    frequency_penalty?: number;
  };
  notes?: string;
}

/**
 * Curated models for vetting
 * Selected for cross-device compatibility and varying capability levels
 */
export const VETTING_MODELS: ModelDefinition[] = [
  // ============ TIER 1: Mobile-Friendly (<1GB VRAM) ============
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    displayName: 'SmolLM2 360M',
    provider: 'HuggingFace',
    family: ModelFamily.SMOLLM,
    tier: ModelTier.MOBILE,
    parameterCount: '360M',
    quantization: 'q4f16',
    contextWindow: 2048,
    estimatedVRAM: '~400MB',
    recommendedConfig: {
      temperature: 0.7,
      top_p: 0.95,
    },
    notes: 'Smallest model, ideal for mobile testing',
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f32_1-MLC',
    displayName: 'SmolLM2 360M (f32)',
    provider: 'HuggingFace',
    family: ModelFamily.SMOLLM,
    tier: ModelTier.MOBILE,
    parameterCount: '360M',
    quantization: 'q4f32',
    contextWindow: 2048,
    estimatedVRAM: '~500MB',
    recommendedConfig: {
      temperature: 0.7,
      top_p: 0.95,
    },
    notes: 'Better compatibility than f16 variant',
  },
  {
    id: 'TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k',
    displayName: 'TinyLlama 1.1B',
    provider: 'Zhang Peiyuan',
    family: ModelFamily.TINYLLAMA,
    tier: ModelTier.MOBILE,
    parameterCount: '1.1B',
    quantization: 'q4f16',
    contextWindow: 1024,
    estimatedVRAM: '~700MB',
    recommendedConfig: {
      temperature: 0.7,
      top_p: 0.95,
    },
    notes: 'Good quality for size, short context',
  },

  // ============ TIER 2: Medium (1-3GB VRAM) ============
  {
    id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    displayName: 'Llama 3.2 1B',
    provider: 'Meta',
    family: ModelFamily.LLAMA,
    tier: ModelTier.MEDIUM,
    parameterCount: '1B',
    quantization: 'q4f32',
    contextWindow: 4096,
    estimatedVRAM: '~1.2GB',
    recommendedConfig: {
      temperature: 0.6,
      top_p: 0.9,
      presence_penalty: 0,
      frequency_penalty: 0,
    },
    notes: 'Best small Llama, good instruction following',
  },
  {
    id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',
    displayName: 'SmolLM2 1.7B',
    provider: 'HuggingFace',
    family: ModelFamily.SMOLLM,
    tier: ModelTier.MEDIUM,
    parameterCount: '1.7B',
    quantization: 'q4f16',
    contextWindow: 2048,
    estimatedVRAM: '~1.5GB',
    recommendedConfig: {
      temperature: 0.7,
      top_p: 0.95,
    },
    notes: 'Good balance of size and capability',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    displayName: 'Qwen 2.5 1.5B',
    provider: 'Alibaba',
    family: ModelFamily.QWEN,
    tier: ModelTier.MEDIUM,
    parameterCount: '1.5B',
    quantization: 'q4f16',
    contextWindow: 4096,
    estimatedVRAM: '~1.3GB',
    recommendedConfig: {
      temperature: 0.7,
      top_p: 0.8,
      presence_penalty: 0,
      frequency_penalty: 0,
    },
    notes: 'Strong multilingual support',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k',
    displayName: 'Phi 3.5 Mini',
    provider: 'Microsoft',
    family: ModelFamily.PHI,
    tier: ModelTier.MEDIUM,
    parameterCount: '3.8B',
    quantization: 'q4f16',
    contextWindow: 1024,
    estimatedVRAM: '~2.5GB',
    recommendedConfig: {
      temperature: 1.0,
      top_p: 1.0,
      presence_penalty: 0,
      frequency_penalty: 0,
    },
    notes: 'Strong reasoning, short context variant',
  },

  // ============ TIER 3: Heavy/Desktop (4-8GB VRAM) ============
  {
    id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    displayName: 'Llama 3.2 3B',
    provider: 'Meta',
    family: ModelFamily.LLAMA,
    tier: ModelTier.HEAVY,
    parameterCount: '3B',
    quantization: 'q4f32',
    contextWindow: 4096,
    estimatedVRAM: '~3.5GB',
    recommendedConfig: {
      temperature: 0.6,
      top_p: 0.9,
      presence_penalty: 0,
      frequency_penalty: 0,
    },
    notes: 'Good mid-range Llama',
  },
  {
    id: 'Gemma-2-2b-it-q4f16_1-MLC',
    displayName: 'Gemma 2 2B',
    provider: 'Google',
    family: ModelFamily.GEMMA,
    tier: ModelTier.HEAVY,
    parameterCount: '2B',
    quantization: 'q4f16',
    contextWindow: 8192,
    estimatedVRAM: '~2GB',
    recommendedConfig: {
      temperature: 0.7,
      top_p: 0.95,
    },
    notes: 'Long context, good for documents',
  },
  {
    id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    displayName: 'Llama 3.1 8B',
    provider: 'Meta',
    family: ModelFamily.LLAMA,
    tier: ModelTier.HEAVY,
    parameterCount: '8B',
    quantization: 'q4f16',
    contextWindow: 4096,
    estimatedVRAM: '~5GB',
    recommendedConfig: {
      temperature: 0.6,
      top_p: 0.9,
      presence_penalty: 0,
      frequency_penalty: 0,
    },
    notes: 'High quality, desktop only',
  },
  {
    id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
    displayName: 'DeepSeek R1 7B',
    provider: 'DeepSeek',
    family: ModelFamily.DEEPSEEK,
    tier: ModelTier.HEAVY,
    parameterCount: '7B',
    quantization: 'q4f16',
    contextWindow: 4096,
    estimatedVRAM: '~5GB',
    recommendedConfig: {
      temperature: 1.0,
      top_p: 1.0,
      presence_penalty: 0,
      frequency_penalty: 0,
    },
    notes: 'Reasoning focused, good for complex tasks',
  },
];

/**
 * Get models by tier
 */
export function getModelsByTier(tier: ModelTier): ModelDefinition[] {
  return VETTING_MODELS.filter((m) => m.tier === tier);
}

/**
 * Get models by family
 */
export function getModelsByFamily(family: ModelFamily): ModelDefinition[] {
  return VETTING_MODELS.filter((m) => m.family === family);
}

/**
 * Get a model by ID
 */
export function getModelById(id: string): ModelDefinition | undefined {
  return VETTING_MODELS.find((m) => m.id === id);
}

/**
 * Get all model IDs
 */
export function getAllModelIds(): string[] {
  return VETTING_MODELS.map((m) => m.id);
}

/**
 * Get recommended model for device type
 */
export function getRecommendedModel(isMobile: boolean): ModelDefinition {
  if (isMobile) {
    return VETTING_MODELS.find((m) => m.tier === ModelTier.MOBILE)!;
  }
  return VETTING_MODELS.find((m) => m.tier === ModelTier.MEDIUM)!;
}
