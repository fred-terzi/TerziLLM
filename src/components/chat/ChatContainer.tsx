// ============================================================
// ChatContainer — main chat layout
// ============================================================

import { useEffect } from 'react'
import { MessageList } from './MessageList'
import { ChatInput } from './ChatInput'
import { ErrorDisplay } from '../error/ErrorDisplay'
import { useAppChat } from '../../hooks/useAppChat'
import { useAppStore } from '../../store/app-store'

export function ChatContainer() {
  const currentConversationId = useAppStore((s) => s.currentConversationId)
  const modelStatus = useAppStore((s) => s.modelStatus)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  const {
    messages,
    input,
    setInput,
    isLoading,
    streamingContent,
    handleSubmit,
    stopGeneration,
    loadMessages,
  } = useAppChat(currentConversationId)

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId)
    }
  }, [currentConversationId, loadMessages])

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
            title="Open sidebar"
            data-testid="open-sidebar-button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex-1">
          <h2 className="text-sm font-medium text-white">
            {currentConversationId ? 'Chat' : 'TerziLLM'}
          </h2>
        </div>

        {/* Model status badge */}
        <ModelStatusBadge />
      </header>

      {/* Messages */}
      <MessageList
        messages={messages}
        streamingContent={streamingContent}
        isLoading={isLoading}
      />

      {/* Error display */}
      <ErrorDisplay />

      {/* Input */}
      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        onStop={stopGeneration}
        disabled={modelStatus !== 'ready' || !currentConversationId}
      />
    </div>
  )
}

// ============================================================
// Model status indicator badge
// ============================================================

function ModelStatusBadge() {
  const modelStatus = useAppStore((s) => s.modelStatus)
  const modelId = useAppStore((s) => s.modelId)
  const loadProgress = useAppStore((s) => s.loadProgress)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  const statusConfig = {
    idle: { color: 'bg-slate-500', text: 'No model loaded' },
    loading: { color: 'bg-yellow-500 animate-pulse', text: `Loading ${Math.round(loadProgress * 100)}%` },
    ready: { color: 'bg-emerald-500', text: modelId?.split('-').slice(0, 3).join(' ') ?? 'Ready' },
    error: { color: 'bg-red-500', text: 'Error' },
  }

  const config = statusConfig[modelStatus]

  return (
    <button
      onClick={() => setSettingsOpen(true)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors text-sm"
      data-testid="model-status-badge"
    >
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-slate-300">{config.text}</span>
    </button>
  )
}
