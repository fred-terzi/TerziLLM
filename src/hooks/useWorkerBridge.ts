import { useEffect, useRef, useState, useCallback } from 'react';
import { WorkerBridge, createWorkerBridge } from '../lib/worker-bridge';
import type { Message, ChatConfig } from '../lib/worker-bridge';

export type WorkerStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

export interface InitProgress {
  progress: number;
  text: string;
}

export interface UseWorkerBridgeReturn {
  // Status tracking
  status: WorkerStatus;
  isInitializing: boolean;
  isReady: boolean;
  isGenerating: boolean;
  hasError: boolean;
  
  // Progress tracking
  initProgress: InitProgress | null;
  
  // Error tracking
  error: { message: string; code: string } | null;
  
  // Actions
  initialize: (modelId: string) => Promise<void>;
  chat: (messages: Message[], config?: ChatConfig) => Promise<ReadableStream<Uint8Array>>;
  abort: () => void;
  retry: () => void;
  unload: () => Promise<void>;
  clearError: () => void;
  
  // Worker access (use with caution - only access outside of render)
  getBridge: () => WorkerBridge | null;
}

/**
 * React hook for managing WebLLM worker bridge
 * Handles initialization, status tracking, and worker lifecycle
 */
export function useWorkerBridge(): UseWorkerBridgeReturn {
  const bridgeRef = useRef<WorkerBridge | null>(null);
  const [status, setStatus] = useState<WorkerStatus>('idle');
  const [initProgress, setInitProgress] = useState<InitProgress | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);

  // Initialize worker bridge on mount
  useEffect(() => {
    if (!bridgeRef.current) {
      bridgeRef.current = createWorkerBridge({
        onInitProgress: (progress, text) => {
          setInitProgress({ progress, text });
        },
        onStatusChange: (newStatus) => {
          setStatus(newStatus);
          
          // Clear init progress when ready
          if (newStatus === 'ready') {
            setInitProgress(null);
          }
        },
        onError: (message, code) => {
          setError({ message, code });
        },
      });
    }

    // Cleanup on unmount
    return () => {
      if (bridgeRef.current) {
        bridgeRef.current.terminate();
        bridgeRef.current = null;
      }
    };
  }, []);

  // Initialize the worker with a model
  const initialize = useCallback(async (modelId: string) => {
    if (!bridgeRef.current) {
      throw new Error('Worker bridge not initialized');
    }

    try {
      setError(null);
      setInitProgress({ progress: 0, text: 'Starting initialization...' });
      await bridgeRef.current.initialize(modelId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError({ message, code: 'INIT_FAILED' });
      throw err;
    }
  }, []);

  // Send chat message
  const chat = useCallback(async (messages: Message[], config?: ChatConfig) => {
    if (!bridgeRef.current) {
      throw new Error('Worker bridge not initialized');
    }

    if (status !== 'ready') {
      throw new Error(`Cannot chat in status: ${status}. Initialize the model first.`);
    }

    try {
      setError(null);
      return await bridgeRef.current.chat(messages, config);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError({ message, code: 'CHAT_FAILED' });
      throw err;
    }
  }, [status]);

  // Abort current generation
  const abort = useCallback(() => {
    if (bridgeRef.current) {
      bridgeRef.current.abort();
    }
  }, []);

  // Retry after error
  const retry = useCallback(() => {
    if (bridgeRef.current) {
      setError(null);
      bridgeRef.current.retry();
    }
  }, []);

  // Unload the model
  const unload = useCallback(async () => {
    if (!bridgeRef.current) {
      return;
    }

    try {
      setError(null);
      setInitProgress(null);
      await bridgeRef.current.unload();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError({ message, code: 'UNLOAD_FAILED' });
      throw err;
    }
  }, []);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Get bridge instance (should only be called outside of render)
  const getBridge = useCallback(() => {
    return bridgeRef.current;
  }, []);

  // Computed state flags
  const isInitializing = status === 'loading';
  const isReady = status === 'ready';
  const isGenerating = status === 'generating';
  const hasError = status === 'error' || error !== null;

  return {
    status,
    isInitializing,
    isReady,
    isGenerating,
    hasError,
    initProgress,
    error,
    initialize,
    chat,
    abort,
    retry,
    unload,
    clearError,
    getBridge,
  };
}
