// ============================================================
// ConversationItem — single conversation in the sidebar
// ============================================================

import { useState } from 'react'
import type { Conversation } from '../../types'
import { truncate } from '../../lib/utils'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onRename: (newTitle: string) => void
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onRename,
}: ConversationItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title)
  const [showMenu, setShowMenu] = useState(false)

  const handleRename = () => {
    if (editTitle.trim()) {
      onRename(editTitle.trim())
    }
    setIsEditing(false)
  }

  return (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-slate-700/70 text-white'
          : 'text-slate-300 hover:bg-slate-700/40 hover:text-white'
      }`}
      onClick={!isEditing ? onSelect : undefined}
      data-testid="conversation-item"
    >
      {/* Chat icon */}
      <svg
        className="w-4 h-4 flex-shrink-0 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>

      {/* Title */}
      {isEditing ? (
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename()
            if (e.key === 'Escape') setIsEditing(false)
          }}
          className="flex-1 bg-slate-600 text-white text-sm px-2 py-0.5 rounded outline-none"
          autoFocus
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm truncate">
          {truncate(conversation.title, 30)}
        </span>
      )}

      {/* Action menu */}
      {!isEditing && (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-600 transition-opacity"
          >
            <svg
              className="w-4 h-4 text-slate-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 10a2 2 0 114 0 2 2 0 01-4 0z" />
            </svg>
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-8 w-36 bg-slate-700 rounded-lg shadow-xl border border-slate-600 py-1 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setIsEditing(true)
                  setShowMenu(false)
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-600 transition-colors"
              >
                ✏️ Rename
              </button>
              <button
                onClick={() => {
                  onDelete()
                  setShowMenu(false)
                }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-600 transition-colors"
              >
                🗑️ Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
