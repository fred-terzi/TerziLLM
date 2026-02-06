import { useChat as useVercelChat, type UIMessage } from '@ai-sdk/react';
import type { ChatTransport } from 'ai';
import { useCallback, useMemo, useState } from 'react';
import { useWorkerBridge } from './useWorkerBridge';
import type { Message, ChatConfig } from '../lib/worker-bridge';

export type InferenceMode = 'local' | 'remote';

export interface UseChatOptions {
  // Inference mode
  inferenceMode?: InferenceMode;
  
  // Initial messages
  initialMessages?: UIMessage[];
  
  // Conversation ID for persistence
  conversationId?: string;
  
  // Model configuration
  chatConfig?: ChatConfig;
  
  // Callbacks
  onFinish?: (message: UIMessage) => void | Promise<void>;
  onError?: (error: Error) => void;
  
  // Remote mode options (for future implementation)
  remoteUrl?: string;
}

export interface UseChatReturn {
  // Messages
  messages: UIMessage[];
  
  // Input state (we manage this ourselves now)
  input: string;
  setInput: (input: string) => void;
  
  // Actions
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  sendMessage: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
  stop: () => void;
  
  // Status
  isLoading: boolean;
  error: Error | undefined;
  
  // Worker bridge status (for local mode)
  workerStatus?: {
    status: string;
    isInitializing: boolean;
    isReady: boolean;
    isGenerating: boolean;
    hasError: boolean;
    initProgress: { progress: number; text: string } | null;
  };
}

/**
 * Custom chat hook that integrates with local WebLLM inference and Vercel AI SDK
 * Supports both local and remote inference modes
 */
export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    inferenceMode = 'local',
    initialMessages = [],
    chatConfig,
    onFinish,
    onError,
  } = options;

  // Get worker bridge for local inference
  const workerBridge = useWorkerBridge();
  
  // Manage input state ourselves (AI SDK 5.0+ doesn't do this)
  const [input, setInput] = useState('');

  // Create custom transport for local inference
  const customTransport: ChatTransport<UIMessage> = useMemo(
    () => ({
      async sendMessages(options: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]) {
        if (inferenceMode === 'remote') {
          // TODO: Implement remote inference via WebSocket
          throw new Error('Remote inference not yet implemented');
        }

        // Local inference mode
        const messages = options.messages.map((m) => {
          // Extract text content from parts
          const content = m.parts
            .filter((part) => part.type === 'text')
            .map((part) => (part as { type: 'text'; text: string }).text)
            .join('');
          
          return {
            role: m.role as 'user' | 'assistant' | 'system',
            content,
          };
        }) as Message[];

        // Get the bridge instance
        const bridge = workerBridge.getBridge();
        if (!bridge) {
          throw new Error('Worker bridge not initialized');
        }

        // Check if worker is ready
        if (!workerBridge.isReady) {
          throw new Error(
            'Worker not ready. Please initialize a model first.'
          );
        }

        try {
          // Start chat with worker bridge
          const stream = await bridge.chat(messages, chatConfig);

          // Return the stream (already a ReadableStream)
          // The worker bridge returns a ReadableStream<Uint8Array> with SSE format
          // We need to return it directly as the AI SDK will parse it
          return stream as unknown as ReadableStream<never>;
        } catch (error) {
          console.error('Chat transport error:', error);
          throw error;
        }
      },
      
      async reconnectToStream() {
        // Not implemented for local inference
        return null;
      },
    }),
    [inferenceMode, chatConfig, workerBridge]
  );

  // Use Vercel AI SDK's useChat with custom transport
  const {
    messages,
    sendMessage: originalSendMessage,
    regenerate,
    stop,
    status,
    error,
  } = useVercelChat({
    transport: customTransport,
    messages: initialMessages,
    onFinish: (options) => {
      // Call user's onFinish callback
      if (onFinish) {
        void onFinish(options.message);
      }
    },
    onError: (err) => {
      console.error('Chat error:', err);
      if (onError) {
        onError(err);
      }
    },
  });

  // Wrap sendMessage with input clearing
  const sendMessage = useCallback(
    async (text: string) => {
      // Check if worker is ready for local mode
      if (inferenceMode === 'local' && !workerBridge.isReady) {
        const error = new Error('Model not loaded. Please load a model first.');
        if (onError) {
          onError(error);
        }
        return;
      }

      // Check if already generating
      if (status === 'streaming') {
        console.warn('Already generating response');
        return;
      }

      await originalSendMessage({ text });
    },
    [inferenceMode, workerBridge.isReady, status, originalSendMessage, onError]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      if (!input.trim()) {
        return;
      }

      void sendMessage(input);
      setInput(''); // Clear input after sending
    },
    [input, sendMessage]
  );

  // Expose worker status for UI
  const workerStatus = useMemo(
    () =>
      inferenceMode === 'local'
        ? {
            status: workerBridge.status,
            isInitializing: workerBridge.isInitializing,
            isReady: workerBridge.isReady,
            isGenerating: workerBridge.isGenerating,
            hasError: workerBridge.hasError,
            initProgress: workerBridge.initProgress,
          }
        : undefined,
    [
      inferenceMode,
      workerBridge.status,
      workerBridge.isInitializing,
      workerBridge.isReady,
      workerBridge.isGenerating,
      workerBridge.hasError,
      workerBridge.initProgress,
    ]
  );

  return {
    messages,
    input,
    setInput,
    handleSubmit,
    sendMessage,
    regenerate,
    stop,
    isLoading: status === 'streaming' || status === 'submitted',
    error,
    workerStatus,
  };
}
