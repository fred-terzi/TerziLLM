/**
 * useDatabase - React hook for IndexedDB operations
 * Provides methods for conversation and message persistence
 */

import { useCallback } from 'react';
import * as db from '../lib/database';
import type { Conversation, Message, AppSettings } from '../types';
import { generateId, extractTitle } from '../lib/utils';

export interface UseDatabase {
  // Conversations
  createConversation: (title?: string) => Promise<Conversation>;
  getConversation: (id: string) => Promise<Conversation | undefined>;
  listConversations: () => Promise<Conversation[]>;
  updateConversation: (id: string, updates: Partial<Omit<Conversation, 'id'>>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  
  // Messages
  addMessage: (message: Omit<Message, 'id' | 'createdAt'>) => Promise<Message>;
  getMessages: (conversationId: string) => Promise<Message[]>;
  deleteMessage: (id: string) => Promise<void>;
  
  // Settings
  getSettings: () => Promise<Partial<AppSettings>>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<void>;
  
  // Cleanup
  clearAllData: () => Promise<void>;
}

export function useDatabase(): UseDatabase {
  // Conversation operations
  const createConversation = useCallback(async (title?: string): Promise<Conversation> => {
    const conversation: Conversation = {
      id: generateId(),
      title: title || 'New Chat',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.createConversation(conversation);
    return conversation;
  }, []);

  const getConversation = useCallback(async (id: string) => {
    return db.getConversation(id);
  }, []);

  const listConversations = useCallback(async () => {
    return db.listConversations();
  }, []);

  const updateConversation = useCallback(async (
    id: string,
    updates: Partial<Omit<Conversation, 'id'>>
  ) => {
    return db.updateConversation(id, updates);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    return db.deleteConversation(id);
  }, []);

  // Message operations
  const addMessage = useCallback(async (
    messageData: Omit<Message, 'id' | 'createdAt'>
  ): Promise<Message> => {
    const message: Message = {
      ...messageData,
      id: generateId(),
      createdAt: new Date(),
    };
    
    await db.addMessage(message);
    
    // Update conversation title if this is the first user message
    if (messageData.role === 'user') {
      const messages = await db.getMessages(messageData.conversationId);
      if (messages.length === 1) {
        const title = extractTitle(messageData.content);
        await db.updateConversation(messageData.conversationId, { title });
      }
    }
    
    return message;
  }, []);

  const getMessages = useCallback(async (conversationId: string) => {
    return db.getMessages(conversationId);
  }, []);

  const deleteMessage = useCallback(async (id: string) => {
    return db.deleteMessage(id);
  }, []);

  // Settings operations
  const getSettings = useCallback(async () => {
    return db.getSettings();
  }, []);

  const saveSettings = useCallback(async (settings: Partial<AppSettings>) => {
    return db.saveSettings(settings);
  }, []);

  // Cleanup
  const clearAllData = useCallback(async () => {
    return db.clearAllData();
  }, []);

  return {
    createConversation,
    getConversation,
    listConversations,
    updateConversation,
    deleteConversation,
    addMessage,
    getMessages,
    deleteMessage,
    getSettings,
    saveSettings,
    clearAllData,
  };
}
