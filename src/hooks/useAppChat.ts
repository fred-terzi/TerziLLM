// ============================================================
// useAppChat — custom chat hook integrating WorkerBridge
//
// Instead of using Vercel AI SDK's useChat (which expects a
// server endpoint), we build our own streaming chat hook that
// works directly with the WorkerBridge's ReadableStream API
// and persists messages to IndexedDB.
// ============================================================

import { useState, useCallback, useRef } from 'react'
import { getWorkerBridge } from './useWorkerBridge'
import { useDatabase } from './useDatabase'
import { useAppStore } from '../store/app-store'
import type { Message, ChatMessage } from '../types'
import { generateId } from '../lib/utils'

export interface ChatState {
  messages: Message[]
  input: string
  isLoading: boolean
}

export function useAppChat(conversationId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const abortRef = useRef(false)
  const { addMessage, getMessages } = useDatabase()
  const modelId = useAppStore((s) => s.modelId)

  // Load messages for a conversation from IndexedDB
  const loadMessages = useCallback(
    async (convId: string) => {
      const msgs = await getMessages(convId)
      setMessages(msgs)
    },
    [getMessages],
  )

  // Send a message and stream the response
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !conversationId || isLoading) return

      const bridge = getWorkerBridge()
      const modelStatus = useAppStore.getState().modelStatus

      if (modelStatus !== 'ready') {
        return
      }

      abortRef.current = false
      setIsLoading(true)
      setInput('')

      // Create user message
      const userMessage: Message = {
        id: generateId(),
        conversationId,
        role: 'user',
        content: content.trim(),
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      await addMessage(userMessage)

      // Update conversation title if it's the first message
      const store = useAppStore.getState()
      const conv = store.conversations.find((c) => c.id === conversationId)
      if (conv && conv.title === 'New conversation') {
        const title = content.trim().slice(0, 50) || 'New conversation'
        store.updateConversationTitle(conversationId, title)
      }

      // Build chat messages for the worker
      const allMessages = [...messages, userMessage]
      const chatMessages: ChatMessage[] = allMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))

      // Stream the response
      let fullContent = ''
      setStreamingContent('')

      try {
        const stream = bridge.chat(chatMessages)
        const reader = stream.getReader()

        while (true) {
          if (abortRef.current) {
            reader.cancel()
            break
          }

          const { done, value } = await reader.read()
          if (done) break

          fullContent += value
          setStreamingContent(fullContent)
        }

        // Create assistant message
        if (fullContent) {
          const assistantMessage: Message = {
            id: generateId(),
            conversationId,
            role: 'assistant',
            content: fullContent,
            createdAt: new Date(),
            metadata: {
              model: modelId ?? undefined,
            },
          }
          setMessages((prev) => [...prev, assistantMessage])
          await addMessage(assistantMessage)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Generation failed'
        useAppStore.getState().setError(errorMessage, 'GENERATION_ERROR')
      } finally {
        setIsLoading(false)
        setStreamingContent('')
      }
    },
    [conversationId, isLoading, messages, addMessage, modelId],
  )

  const stopGeneration = useCallback(() => {
    abortRef.current = true
    const bridge = getWorkerBridge()
    bridge.abort()
  }, [])

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      sendMessage(input)
    },
    [input, sendMessage],
  )

  return {
    messages,
    input,
    setInput,
    isLoading,
    streamingContent,
    sendMessage,
    handleSubmit,
    stopGeneration,
    loadMessages,
  }
}
