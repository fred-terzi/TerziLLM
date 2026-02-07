// ============================================================
// Model cache utilities — inspect and manage WebLLM model cache
// ============================================================

import type { CachedModelInfo } from '../types'
import { formatBytes } from './utils'

/**
 * Get a list of cached models with their sizes.
 *
 * WebLLM stores model weights in the Cache API. We scan all caches
 * and look for entries that match known model patterns.
 */
export async function getCachedModels(): Promise<CachedModelInfo[]> {
  if (typeof caches === 'undefined') return []

  try {
    const cacheNames = await caches.keys()
    const models: CachedModelInfo[] = []

    for (const name of cacheNames) {
      // WebLLM cache names typically contain the model ID
      // or are under a 'webllm' prefix
      const cache = await caches.open(name)
      const keys = await cache.keys()

      if (keys.length === 0) continue

      // Calculate total size of entries in this cache
      let totalSize = 0
      for (const request of keys) {
        try {
          const response = await cache.match(request)
          if (response) {
            const blob = await response.clone().blob()
            totalSize += blob.size
          }
        } catch {
          // Skip entries we can't read
        }
      }

      if (totalSize > 0) {
        // Try to extract model ID from cache name
        const modelId = extractModelId(name)
        if (modelId) {
          models.push({
            modelId,
            sizeBytes: totalSize,
            sizeLabel: formatBytes(totalSize),
          })
        }
      }
    }

    return models
  } catch {
    return []
  }
}

/**
 * Remove a cached model from the Cache API.
 */
export async function removeCachedModel(modelId: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false

  try {
    const cacheNames = await caches.keys()
    let removed = false

    for (const name of cacheNames) {
      const extracted = extractModelId(name)
      if (extracted === modelId || name.includes(modelId)) {
        await caches.delete(name)
        removed = true
      }
    }

    return removed
  } catch {
    return false
  }
}

/**
 * Clear all WebLLM model caches.
 */
export async function clearAllCachedModels(): Promise<void> {
  if (typeof caches === 'undefined') return

  try {
    const cacheNames = await caches.keys()
    for (const name of cacheNames) {
      // Only delete caches that look like model caches
      if (isModelCache(name)) {
        await caches.delete(name)
      }
    }
  } catch {
    // Ignore errors
  }
}

/** Try to extract a model ID from a cache name */
function extractModelId(cacheName: string): string | null {
  // WebLLM uses cache names like "webllm/model/Llama-3.2-1B-Instruct-q4f16_1-MLC"
  // or just the model ID directly
  const patterns = [
    /webllm\/model\/(.+)/,
    /webllm\/(.+)/,
    /(Llama-[\w.-]+MLC)/,
    /(Phi-[\w.-]+MLC)/,
    /(Qwen[\w.-]+MLC)/,
    /(Mistral[\w.-]+MLC)/,
  ]

  for (const pattern of patterns) {
    const match = cacheName.match(pattern)
    if (match) return match[1]
  }

  // If the cache name itself looks like a model ID
  if (cacheName.includes('-MLC') || cacheName.includes('q4f16') || cacheName.includes('q4f32')) {
    return cacheName
  }

  return null
}

/** Check if a cache name looks like a model cache */
function isModelCache(name: string): boolean {
  return (
    name.includes('webllm') ||
    name.includes('-MLC') ||
    name.includes('q4f16') ||
    name.includes('q4f32')
  )
}
