// ============================================================
// MessageBubble — renders a single chat message
// ============================================================

import { StreamingMarkdown } from './StreamingMarkdown'
import type { Message } from '../../types'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      data-testid={`message-${message.role}`}
    >
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-slate-700/60 text-slate-100 rounded-bl-md'
        }`}
      >
        {/* Role label */}
        <div
          className={`text-xs font-medium mb-1 ${
            isUser ? 'text-blue-200' : 'text-slate-400'
          }`}
        >
          {isUser ? 'You' : 'TerziLLM'}
        </div>

        {/* Content */}
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
        ) : (
          <StreamingMarkdown content={message.content} />
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <span className="inline-block w-2 h-4 bg-emerald-400 rounded-sm ml-1 animate-pulse" />
        )}
      </div>
    </div>
  )
}
