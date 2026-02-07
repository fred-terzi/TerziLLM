// ============================================================
// Sidebar — conversation list & navigation
// ============================================================

import { useAppStore } from '../../store/app-store'
import { ConversationItem } from './ConversationItem'
import { generateId } from '../../lib/utils'

export function Sidebar() {
  const conversations = useAppStore((s) => s.conversations)
  const currentConversationId = useAppStore((s) => s.currentConversationId)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const createConversation = useAppStore((s) => s.createConversation)
  const setCurrentConversation = useAppStore((s) => s.setCurrentConversation)
  const deleteConversation = useAppStore((s) => s.deleteConversation)
  const updateConversationTitle = useAppStore((s) => s.updateConversationTitle)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)

  const handleNewChat = async () => {
    const id = generateId()
    await createConversation(id)
  }

  if (!sidebarOpen) return null

  return (
    <aside
      className="w-72 h-full bg-slate-800/80 border-r border-slate-700/50 flex flex-col"
      data-testid="sidebar"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          🧠 TerziLLM
        </h1>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
          title="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          data-testid="new-chat-button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {conversations.length === 0 ? (
          <div className="text-center text-slate-500 text-sm pt-8">
            No conversations yet
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === currentConversationId}
              onSelect={() => setCurrentConversation(conv.id)}
              onDelete={() => deleteConversation(conv.id)}
              onRename={(title) => updateConversationTitle(conv.id, title)}
            />
          ))
        )}
      </div>

      {/* Footer — Settings */}
      <div className="border-t border-slate-700/50 p-3">
        <button
          onClick={() => setSettingsOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50 hover:text-white text-sm transition-colors"
          data-testid="settings-button"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Settings
        </button>
      </div>
    </aside>
  )
}
