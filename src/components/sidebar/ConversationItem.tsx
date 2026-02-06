/**
 * ConversationItem - Single conversation in the sidebar list
 */

import { useState } from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { formatDate, cn } from '../../lib/utils';
import type { Conversation } from '../../types';

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleting(true);
    
    // Add small delay for UX
    setTimeout(() => {
      onDelete();
    }, 150);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all",
        isActive
          ? "bg-gray-700 text-white"
          : "text-gray-300 hover:bg-gray-800",
        isDeleting && "opacity-50 scale-95"
      )}
      onClick={onSelect}
    >
      {/* Icon */}
      <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-400" />

      {/* Title and date */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-sm">
          {conversation.title}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDate(new Date(conversation.updatedAt))}
        </p>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <button
          onClick={handleDelete}
          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
          aria-label="Delete conversation"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );
}
