// ============================================================
// ChatInput — message input with submit button
// ============================================================

import { useRef, useEffect } from 'react'

interface ChatInputProps {
  input: string
  setInput: (value: string) => void
  onSubmit: (e?: React.FormEvent) => void
  isLoading: boolean
  onStop: () => void
  disabled?: boolean
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading,
  onStop,
  disabled,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [input])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading && input.trim()) {
        onSubmit()
      }
    }
  }

  return (
    <div className="border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-sm p-4">
      <form onSubmit={onSubmit} className="flex items-end gap-3 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? 'Load a model to start chatting...' : 'Type a message...'}
            disabled={disabled || isLoading}
            rows={1}
            className="w-full resize-none rounded-xl bg-slate-700/50 border border-slate-600/50 px-4 py-3 text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="chat-input"
          />
        </div>

        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
            title="Stop generation"
            data-testid="stop-button"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <rect x="5" y="5" width="10" height="10" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            title="Send message"
            data-testid="send-button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19V5m-7 7l7-7 7 7"
              />
            </svg>
          </button>
        )}
      </form>
    </div>
  )
}
