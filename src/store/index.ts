/**
 * Zustand store for TerziLLM application state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Conversation,
  Message,
  ModelStatus,
  InferenceMode,
  ConnectionStatus,
} from '../types';
import * as db from '../lib/database';
import { generateId, extractTitle } from '../lib/utils';

// ============================================
// Store Types
// ============================================

interface AppState {
  // Conversations
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];

  // Model state
  modelStatus: ModelStatus;
  loadProgress: number;
  loadProgressText: string;
  selectedModel: string;

  // Inference mode
  inferenceMode: InferenceMode;
  connectionStatus: ConnectionStatus;
  hostUrl: string | null;

  // UI state
  sidebarOpen: boolean;
  settingsOpen: boolean;
  isMobile: boolean;

  // Actions
  loadConversations: () => Promise<void>;
  createConversation: () => Promise<string>;
  selectConversation: (id: string | null) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversationTitle: (id: string, title: string) => Promise<void>;
  
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => Promise<Message>;
  loadMessages: (conversationId: string) => Promise<void>;
  
  setModelStatus: (status: ModelStatus) => void;
  setLoadProgress: (progress: number, text: string) => void;
  setSelectedModel: (model: string) => void;
  
  setInferenceMode: (mode: InferenceMode) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setHostUrl: (url: string | null) => void;
  
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  setIsMobile: (isMobile: boolean) => void;
}

// ============================================
// Default Model
// ============================================

const DEFAULT_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

// ============================================
// Store Implementation
// ============================================

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      conversations: [],
      currentConversationId: null,
      messages: [],
      
      modelStatus: 'idle',
      loadProgress: 0,
      loadProgressText: '',
      selectedModel: DEFAULT_MODEL,
      
      inferenceMode: 'local',
      connectionStatus: 'disconnected',
      hostUrl: null,
      
      sidebarOpen: true,
      settingsOpen: false,
      isMobile: false,

      // Conversation actions
      loadConversations: async () => {
        const conversations = await db.listConversations();
        set({ conversations });
      },

      createConversation: async () => {
        const id = generateId();
        const conversation: Conversation = {
          id,
          title: 'New Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
          model: get().selectedModel,
        };
        
        await db.createConversation(conversation);
        
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          currentConversationId: id,
          messages: [],
        }));
        
        return id;
      },

      selectConversation: async (id) => {
        if (id === null) {
          set({ currentConversationId: null, messages: [] });
          return;
        }
        
        const messages = await db.getMessages(id);
        set({ currentConversationId: id, messages });
        
        // Close sidebar on mobile after selection
        if (get().isMobile) {
          set({ sidebarOpen: false });
        }
      },

      deleteConversation: async (id) => {
        await db.deleteConversation(id);
        
        set((state) => {
          const conversations = state.conversations.filter((c) => c.id !== id);
          const currentId = state.currentConversationId === id 
            ? (conversations[0]?.id ?? null)
            : state.currentConversationId;
          
          return {
            conversations,
            currentConversationId: currentId,
            messages: currentId === state.currentConversationId ? state.messages : [],
          };
        });
        
        // Load messages for new current conversation
        const newCurrentId = get().currentConversationId;
        if (newCurrentId) {
          const messages = await db.getMessages(newCurrentId);
          set({ messages });
        }
      },

      updateConversationTitle: async (id, title) => {
        await db.updateConversation(id, { title });
        
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: new Date() } : c
          ),
        }));
      },

      // Message actions
      addMessage: async (messageData) => {
        const state = get();
        let conversationId = state.currentConversationId;
        
        // Create new conversation if needed
        if (!conversationId) {
          conversationId = await get().createConversation();
        }
        
        const message: Message = {
          ...messageData,
          id: generateId(),
          conversationId,
          createdAt: new Date(),
        };
        
        await db.addMessage(message);
        
        // Update conversation title if this is the first user message
        if (messageData.role === 'user' && state.messages.length === 0) {
          const title = extractTitle(messageData.content);
          await get().updateConversationTitle(conversationId, title);
        }
        
        set((state) => ({
          messages: [...state.messages, message],
        }));
        
        return message;
      },

      loadMessages: async (conversationId) => {
        const messages = await db.getMessages(conversationId);
        set({ messages });
      },

      // Model actions
      setModelStatus: (status) => set({ modelStatus: status }),
      
      setLoadProgress: (progress, text) => set({ 
        loadProgress: progress, 
        loadProgressText: text 
      }),
      
      setSelectedModel: (model) => {
        set({ selectedModel: model });
        db.setSetting('selectedModel', model);
      },

      // Inference mode actions
      setInferenceMode: (mode) => {
        set({ inferenceMode: mode });
        db.setSetting('inferenceMode', mode);
      },
      
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      
      setHostUrl: (url) => {
        set({ hostUrl: url });
        db.setSetting('hostUrl', url);
      },

      // UI actions
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      setSettingsOpen: (open) => set({ settingsOpen: open }),
      
      setIsMobile: (isMobile) => set({ 
        isMobile,
        sidebarOpen: !isMobile, // Close sidebar on mobile by default
      }),
    }),
    {
      name: 'terzillm-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        inferenceMode: state.inferenceMode,
        hostUrl: state.hostUrl,
      }),
    }
  )
);
