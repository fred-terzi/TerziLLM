/**
 * ChatInput - Message input component with send button
 */

import { Send, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
  placeholder = 'Send a message...',
}: ChatInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !isLoading) {
        onSubmit(e as unknown as React.FormEvent<HTMLFormElement>);
      }
    }
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    // Set height to scrollHeight, capped at 200px
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  return (
    <form onSubmit={onSubmit} className="relative">
      <div className="flex items-end gap-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
        <textarea
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            "flex-1 resize-none bg-transparent border-0 outline-none px-2 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500",
            "min-h-[40px] max-h-[200px]",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{ height: '40px' }}
        />
        
        <button
          type="submit"
          disabled={!value.trim() || disabled || isLoading}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
            value.trim() && !disabled && !isLoading
              ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg"
              : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
          )}
          aria-label={isLoading ? 'Stop generation' : 'Send message'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      
      {/* Helper text */}
      <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </form>
  );
}
