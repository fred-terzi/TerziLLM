/**
 * Sidebar - Navigation sidebar with conversation list
 */

import { Plus, X, MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store';
import { ConversationItem } from './ConversationItem';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const {
    conversations,
    currentConversationId,
    sidebarOpen,
    isMobile,
    createConversation,
    selectConversation,
    deleteConversation,
    setSidebarOpen,
  } = useAppStore();

  const handleNewChat = async () => {
    await createConversation();
  };

  if (!sidebarOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col bg-gray-900 text-white h-full",
          isMobile
            ? "fixed left-0 top-0 z-50 w-80 shadow-xl"
            : "w-72 border-r border-gray-800"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold">TerziLLM</span>
          </div>

          {/* Close button (mobile only) */}
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* New chat button */}
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">New Chat</span>
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No conversations yet</p>
              <p className="text-gray-500 text-xs mt-1">
                Start a new chat to begin
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  isActive={conversation.id === currentConversationId}
                  onSelect={() => selectConversation(conversation.id)}
                  onDelete={() => deleteConversation(conversation.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Local inference ready</span>
          </div>
        </div>
      </aside>
    </>
  );
}
