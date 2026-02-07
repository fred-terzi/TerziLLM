// ============================================================
// MessageList — scrollable message area
// ============================================================

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import type { Message } from '../../types'

interface MessageListProps {
  messages: Message[]
  streamingContent: string
  isLoading: boolean
}

export function MessageList({ messages, streamingContent, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or content streams
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-xl font-semibold text-slate-200 mb-2">
            Start a conversation
          </h2>
          <p className="text-slate-400 text-sm">
            Type a message below to begin chatting with your local AI model.
            All processing happens on your device.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="message-list">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}

      {/* Streaming message (not yet finalized) */}
      {isLoading && streamingContent && (
        <MessageBubble
          message={{
            id: 'streaming',
            conversationId: '',
            role: 'assistant',
            content: streamingContent,
            createdAt: new Date(),
          }}
          isStreaming
        />
      )}

      {/* Loading indicator when waiting for first token */}
      {isLoading && !streamingContent && (
        <div className="flex justify-start mb-4">
          <div className="bg-slate-700/60 rounded-2xl rounded-bl-md px-4 py-3">
            <div className="text-xs font-medium mb-1 text-slate-400">TerziLLM</div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
