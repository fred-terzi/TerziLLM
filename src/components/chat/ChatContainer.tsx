/**
 * ChatContainer - Main chat layout component
 * Contains the header, message list, and input area
 */

import { useEffect, useRef, useState } from 'react';
import { Menu, Settings, Loader2 } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { WelcomeScreen } from './WelcomeScreen';
import { ModelLoadingOverlay } from './ModelLoadingOverlay';
import { useAppStore } from '../../store';
import { cn } from '../../lib/utils';
import type { Message } from '../../types';

export function ChatContainer() {
  const {
    currentConversationId,
    messages: storedMessages,
    modelStatus,
    loadProgress,
    loadProgressText,
    isMobile,
    toggleSidebar,
    setSettingsOpen,
    addMessage,
  } = useAppStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [storedMessages]);

  // Display messages from store
  const displayMessages: Message[] = storedMessages;

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setError(null);
    
    try {
      // Add user message to store
      await addMessage({
        conversationId: currentConversationId || '',
        role: 'user',
        content: userMessage,
      });
      
      setIsLoading(true);
      
      // Placeholder response - in production this would use the LLM worker
      setTimeout(async () => {
        await addMessage({
          conversationId: currentConversationId || '',
          role: 'assistant',
          content: 'I am TerziLLM, your local AI assistant. To enable AI responses, please load a model from the Settings panel (gear icon in the top right).',
        });
        setIsLoading(false);
      }, 500);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to send message'));
      setIsLoading(false);
    }
  };

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

      {/* Input area */}
      <div className={cn(
        "border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4",
        isMobile && "p-3"
      )}>
        <div className="max-w-3xl mx-auto">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSendMessage}
            isLoading={isLoading}
            disabled={false}
            placeholder={
              modelStatus === 'ready'
                ? 'Send a message...'
                : modelStatus === 'loading'
                  ? 'Loading model...'
                  : 'Send a message (load a model for AI responses)'
            }
          />
        </div>
      </div>
    </div>
  );
}
