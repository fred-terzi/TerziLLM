/**
 * MessageBubble - Individual message display component
 * Supports markdown rendering and different message roles
 */

import { User } from 'lucide-react';
import { StreamingMarkdown } from './StreamingMarkdown';
import { cn } from '../../lib/utils';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isLast?: boolean;
}

export function MessageBubble({ message, isLast }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          isUser
            ? "bg-gray-200 dark:bg-gray-700"
            : "bg-gradient-to-br from-purple-500 to-blue-500"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <span className="text-white text-xs font-medium">AI</span>
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          "flex-1 max-w-[85%] rounded-2xl px-4 py-3 shadow-sm",
          isUser
            ? "bg-blue-500 text-white rounded-tr-sm"
            : "bg-white dark:bg-gray-800 rounded-tl-sm"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <StreamingMarkdown content={message.content} isStreaming={isLast} />
        )}
      </div>
    </div>
  );
}
