/**
 * ChatContainer - Main chat layout component
 * Contains the header, message list, and input area
 */

import { useEffect, useRef } from 'react';
import { Menu, Settings, Loader2 } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { ModelLoadingOverlay } from './ModelLoadingOverlay';
import { useAppStore } from '../../store';
import { useChat } from '../../hooks/useChat';
import { cn } from '../../lib/utils';
import type { Message as StoreMessage } from '../../types';
import type { UIMessage } from '@ai-sdk/react';

export function ChatContainer() {
  const {
    currentConversationId,
    messages: storedMessages,
    modelStatus,
    loadProgress,
    loadProgressText,
    isMobile,
    inferenceMode,
    toggleSidebar,
    setSettingsOpen,
    addMessage,
  } = useAppStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Convert stored messages to UI messages for the chat hook
  const initialMessages: UIMessage[] = storedMessages.map((msg) => ({
    id: msg.id,
    role: msg.role,
    parts: [{ type: 'text' as const, text: msg.content }],
  }));

  // Use the integrated chat hook with worker bridge
  const {
    messages: chatMessages,
    input,
    setInput,
    handleSubmit,
    isLoading,
    error,
    workerStatus,
  } = useChat({
    inferenceMode,
    initialMessages,
    conversationId: currentConversationId || undefined,
    onFinish: async (message) => {
      // Persist assistant message to store
      // Extract text content from parts
      const content = message.parts
        .filter((part) => part.type === 'text')
        .map((part) => (part as { type: 'text'; text: string }).text)
        .join('');
      
      await addMessage({
        conversationId: currentConversationId || '',
        role: message.role as 'assistant',
        content,
      });
    },
    onError: (err) => {
      console.error('Chat error:', err);
    },
  });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Sync chat messages to store (for user messages)
  useEffect(() => {
    const lastMessage = chatMessages[chatMessages.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      const isAlreadyInStore = storedMessages.some((msg) => msg.id === lastMessage.id);
      if (!isAlreadyInStore) {
        // Extract text content from parts
        const content = lastMessage.parts
          .filter((part) => part.type === 'text')
          .map((part) => (part as { type: 'text'; text: string }).text)
          .join('');
        
        void addMessage({
          conversationId: currentConversationId || '',
          role: 'user',
          content,
        });
      }
    }
  }, [chatMessages, storedMessages, currentConversationId, addMessage]);

  // Convert UI messages back to store format for display
  const displayMessages: StoreMessage[] = chatMessages.map((msg) => {
    // Extract text content from parts
    const content = msg.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { type: 'text'; text: string }).text)
      .join('');
    
    return {
      id: msg.id || `msg-${Date.now()}`,
      conversationId: currentConversationId || '',
      role: msg.role as 'user' | 'assistant' | 'system',
      content,
      createdAt: new Date(),
    };
  });

  const showWelcome = !currentConversationId && displayMessages.length === 0;
  const isModelLoading = modelStatus === 'loading';

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          
          <h1 className="font-semibold text-gray-900 dark:text-white">
            {currentConversationId ? 'Chat' : 'New Chat'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Model status indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
            {isModelLoading ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            ) : modelStatus === 'ready' ? (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-gray-400" />
            )}
            <span className="text-xs text-gray-600 dark:text-gray-400 hidden sm:inline">
              {isModelLoading 
                ? 'Loading...' 
                : modelStatus === 'ready' 
                  ? 'Ready' 
                  : 'Not loaded'}
            </span>
          </div>

          {/* Settings button */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden relative">
        {/* Model loading overlay */}
        {isModelLoading && (
          <ModelLoadingOverlay
            progress={loadProgress}
            text={loadProgressText || 'Initializing...'}
          />
        )}

        {/* Welcome screen or messages */}
        {showWelcome ? (
          <WelcomeScreen />
        ) : (
          <div className="h-full overflow-y-auto">
            <div className={cn(
              "max-w-3xl mx-auto px-4 py-6",
              isMobile && "px-3"
            )}>
              <MessageList messages={displayMessages} isLoading={isLoading} />
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
        </div>
      )}

      {/* Worker error display */}
      {workerStatus?.hasError && (
        <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Worker status: {workerStatus.status}. Please try reloading the model.
          </p>
        </div>
      )}

      {/* Input area */}
      <div className={cn(
        "border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4",
        isMobile && "p-3"
      )}>
        <div className="max-w-3xl mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            disabled={inferenceMode === 'local' && modelStatus !== 'ready'}
            placeholder={
              modelStatus === 'ready'
                ? 'Send a message...'
                : modelStatus === 'loading'
                  ? 'Loading model...'
                  : 'Load a model from Settings to start chatting'
            }
          />
        </div>
      </div>
    </div>
  );
}
