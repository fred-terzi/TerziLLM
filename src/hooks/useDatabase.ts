// ============================================================
// useDatabase — hook for IndexedDB operations
// ============================================================

import { useCallback } from 'react'
import * as db from '../lib/database'
import type { Message } from '../types'

export function useDatabase() {
  const addMessage = useCallback(async (message: Message) => {
    await db.addMessage(message)
  }, [])

  const getMessages = useCallback(async (conversationId: string) => {
    return db.getMessages(conversationId)
  }, [])

  return { addMessage, getMessages }
}
