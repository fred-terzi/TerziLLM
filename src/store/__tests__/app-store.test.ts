import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../app-store'
import { resetDB, getSetting, getConversation, getMessages, addMessage } from '../../lib/database'
import type { Message } from '../../types'

// Reset store and DB before each test
beforeEach(() => {
  resetDB()
  useAppStore.setState({
    inferenceMode: 'local',
    modelId: null,
    modelStatus: 'idle',
    loadProgress: 0,
    loadProgressText: '',
    errorMessage: null,
    errorCode: null,
    currentConversationId: null,
    conversations: [],
    sidebarOpen: true,
    settingsOpen: false,
  })
})

describe('AppStore', () => {
  describe('Model lifecycle', () => {
    it('sets model ID and persists to IndexedDB', async () => {
      const store = useAppStore.getState()
      store.setModelId('test-model')

      // Wait for async persist
      await new Promise((r) => setTimeout(r, 50))

      expect(useAppStore.getState().modelId).toBe('test-model')
      const persisted = await getSetting<string>('modelId')
      expect(persisted).toBe('test-model')
    })

    it('tracks model status', () => {
      const store = useAppStore.getState()
      store.setModelStatus('loading')
      expect(useAppStore.getState().modelStatus).toBe('loading')

      store.setModelStatus('ready')
      expect(useAppStore.getState().modelStatus).toBe('ready')
    })

    it('tracks load progress', () => {
      const store = useAppStore.getState()
      store.setLoadProgress(0.5, 'Downloading 50%...')

      const state = useAppStore.getState()
      expect(state.loadProgress).toBe(0.5)
      expect(state.loadProgressText).toBe('Downloading 50%...')
    })

    it('sets and clears errors', () => {
      const store = useAppStore.getState()
      store.setError('Something went wrong', 'GENERATION_ERROR')

      let state = useAppStore.getState()
      expect(state.errorMessage).toBe('Something went wrong')
      expect(state.errorCode).toBe('GENERATION_ERROR')
      expect(state.modelStatus).toBe('error')

      store.clearError()
      state = useAppStore.getState()
      expect(state.errorMessage).toBeNull()
      expect(state.errorCode).toBeNull()
    })
  })

  describe('Conversations', () => {
    it('creates a conversation and sets it as current', async () => {
      const store = useAppStore.getState()
      const conv = await store.createConversation('c1', 'Test Chat')

      expect(conv.id).toBe('c1')
      expect(conv.title).toBe('Test Chat')

      const state = useAppStore.getState()
      expect(state.conversations).toHaveLength(1)
      expect(state.currentConversationId).toBe('c1')

      // Verify persisted to IndexedDB
      const dbConv = await getConversation('c1')
      expect(dbConv).toBeDefined()
      expect(dbConv!.title).toBe('Test Chat')
    })

    it('loads conversations from IndexedDB', async () => {
      const store = useAppStore.getState()
      // Create conversations directly in DB
      await store.createConversation('c1', 'First')
      await store.createConversation('c2', 'Second')

      // Reset store state (simulate app restart)
      useAppStore.setState({ conversations: [], currentConversationId: null })

      // Hydrate from DB
      await useAppStore.getState().loadConversations()

      const state = useAppStore.getState()
      expect(state.conversations).toHaveLength(2)
    })

    it('updates conversation title', async () => {
      const store = useAppStore.getState()
      await store.createConversation('c1', 'Old Title')

      await useAppStore.getState().updateConversationTitle('c1', 'New Title')

      const state = useAppStore.getState()
      expect(state.conversations[0].title).toBe('New Title')
    })

    it('deletes a conversation and its messages', async () => {
      const store = useAppStore.getState()
      await store.createConversation('c1', 'To Delete')

      const msg: Message = {
        id: 'm1',
        conversationId: 'c1',
        role: 'user',
        content: 'Hello',
        createdAt: new Date(),
      }
      await addMessage(msg)

      await useAppStore.getState().deleteConversation('c1')

      const state = useAppStore.getState()
      expect(state.conversations).toHaveLength(0)
      expect(state.currentConversationId).toBeNull()

      const msgs = await getMessages('c1')
      expect(msgs).toHaveLength(0)
    })

    it('switches current conversation when active one is deleted', async () => {
      const store = useAppStore.getState()
      await store.createConversation('c1', 'First')
      await store.createConversation('c2', 'Second')

      // c2 should be current
      expect(useAppStore.getState().currentConversationId).toBe('c2')

      await useAppStore.getState().deleteConversation('c2')

      expect(useAppStore.getState().currentConversationId).toBe('c1')
    })
  })

  describe('UI state', () => {
    it('toggles sidebar', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(false)
      useAppStore.getState().toggleSidebar()
      expect(useAppStore.getState().sidebarOpen).toBe(true)
    })

    it('sets settings modal open/closed', () => {
      useAppStore.getState().setSettingsOpen(true)
      expect(useAppStore.getState().settingsOpen).toBe(true)
      useAppStore.getState().setSettingsOpen(false)
      expect(useAppStore.getState().settingsOpen).toBe(false)
    })
  })

  describe('Hydration', () => {
    it('hydrates state from IndexedDB', async () => {
      // Create data first
      const store = useAppStore.getState()
      await store.createConversation('c1', 'Saved Chat')
      store.setModelId('test-model')
      store.setCurrentConversation('c1')

      // Wait for persist
      await new Promise((r) => setTimeout(r, 50))

      // Reset store state
      useAppStore.setState({
        modelId: null,
        currentConversationId: null,
        conversations: [],
      })

      // Hydrate
      await useAppStore.getState().hydrate()

      const state = useAppStore.getState()
      expect(state.modelId).toBe('test-model')
      expect(state.currentConversationId).toBe('c1')
      expect(state.conversations).toHaveLength(1)
      expect(state.conversations[0].title).toBe('Saved Chat')
    })
  })
})
