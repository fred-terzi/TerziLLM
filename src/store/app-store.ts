// ============================================================
// Zustand App Store with IndexedDB persistence
// ============================================================

import { create } from 'zustand'
import type {
  AppState,
  Conversation,
  ErrorCode,
  ModelStatus,
} from '../types'
import * as db from '../lib/database'

// ============================================================
// Actions interface
// ============================================================

export interface AppActions {
  // Model lifecycle
  setModelId: (modelId: string | null) => void
  setModelStatus: (status: ModelStatus) => void
  setLoadProgress: (progress: number, text: string) => void
  setError: (message: string | null, code?: ErrorCode | null) => void
  clearError: () => void

  // Conversations
  loadConversations: () => Promise<void>
  createConversation: (id: string, title?: string) => Promise<Conversation>
  setCurrentConversation: (id: string | null) => void
  updateConversationTitle: (id: string, title: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>

  // UI
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void

  // Persistence
  hydrate: () => Promise<void>
  persistSettings: () => Promise<void>
}

// ============================================================
// Initial state
// ============================================================

const initialState: AppState = {
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
}

// ============================================================
// Store
// ============================================================

export type AppStore = AppState & AppActions

export const useAppStore = create<AppStore>((set, get) => ({
  ...initialState,

  // --- Model lifecycle ---

  setModelId: (modelId) => {
    set({ modelId })
    get().persistSettings()
  },

  setModelStatus: (modelStatus) => set({ modelStatus }),

  setLoadProgress: (loadProgress, loadProgressText) =>
    set({ loadProgress, loadProgressText }),

  setError: (errorMessage, errorCode = null) =>
    set({ errorMessage, errorCode, modelStatus: errorMessage ? 'error' : get().modelStatus }),

  clearError: () => set({ errorMessage: null, errorCode: null }),

  // --- Conversations ---

  loadConversations: async () => {
    const conversations = await db.listConversations()
    set({ conversations })
  },

  createConversation: async (id, title = 'New conversation') => {
    const conversation = await db.createConversation(id, title)
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: id,
    }))
    return conversation
  },

  setCurrentConversation: (id) => {
    set({ currentConversationId: id })
    get().persistSettings()
  },

  updateConversationTitle: async (id, title) => {
    await db.updateConversation(id, { title })
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: new Date() } : c,
      ),
    }))
  },

  deleteConversation: async (id) => {
    await db.deleteConversation(id)
    set((state) => {
      const conversations = state.conversations.filter((c) => c.id !== id)
      const currentConversationId =
        state.currentConversationId === id
          ? conversations[0]?.id ?? null
          : state.currentConversationId
      return { conversations, currentConversationId }
    })
  },

  // --- UI ---

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  // --- Persistence ---

  hydrate: async () => {
    const [modelId, currentConversationId, conversations] = await Promise.all([
      db.getSetting<string>('modelId'),
      db.getSetting<string>('currentConversationId'),
      db.listConversations(),
    ])

    set({
      modelId: modelId ?? null,
      currentConversationId: currentConversationId ?? null,
      conversations,
    })
  },

  persistSettings: async () => {
    const { modelId, currentConversationId } = get()
    await Promise.all([
      db.setSetting('modelId', modelId),
      db.setSetting('currentConversationId', currentConversationId),
    ])
  },
}))
