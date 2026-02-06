/**
 * IndexedDB persistence layer for TerziLLM
 * Stores conversations, messages, and settings
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Conversation, Message, AppSettings } from '../types';

// ============================================
// Database Schema
// ============================================

interface TerziLLMDB extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'by-updated': Date };
  };
  messages: {
    key: string;
    value: Message;
    indexes: { 'by-conversation': string };
  };
  settings: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'terzillm-db';
const DB_VERSION = 1;

// ============================================
// Database Initialization
// ============================================

let dbInstance: IDBPDatabase<TerziLLMDB> | null = null;

async function getDB(): Promise<IDBPDatabase<TerziLLMDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<TerziLLMDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        const conversationStore = db.createObjectStore('conversations', {
          keyPath: 'id',
        });
        conversationStore.createIndex('by-updated', 'updatedAt');
      }

      // Messages store
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', {
          keyPath: 'id',
        });
        messageStore.createIndex('by-conversation', 'conversationId');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

// ============================================
// Conversation Operations
// ============================================

export async function createConversation(conversation: Conversation): Promise<void> {
  const db = await getDB();
  await db.put('conversations', conversation);
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get('conversations', id);
}

export async function listConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const conversations = await db.getAllFromIndex('conversations', 'by-updated');
  // Return in reverse order (newest first)
  return conversations.reverse();
}

export async function updateConversation(
  id: string,
  updates: Partial<Omit<Conversation, 'id'>>
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('conversations', id);
  if (existing) {
    await db.put('conversations', {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    });
  }
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  
  // Delete all messages in the conversation
  const messages = await db.getAllFromIndex('messages', 'by-conversation', id);
  const tx = db.transaction(['conversations', 'messages'], 'readwrite');
  
  await Promise.all([
    tx.objectStore('conversations').delete(id),
    ...messages.map((m) => tx.objectStore('messages').delete(m.id)),
  ]);
  
  await tx.done;
}

// ============================================
// Message Operations
// ============================================

export async function addMessage(message: Message): Promise<void> {
  const db = await getDB();
  await db.put('messages', message);
  
  // Update conversation's updatedAt
  const conversation = await db.get('conversations', message.conversationId);
  if (conversation) {
    await db.put('conversations', {
      ...conversation,
      updatedAt: new Date(),
    });
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = await getDB();
  return db.getAllFromIndex('messages', 'by-conversation', conversationId);
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('messages', id);
}

// ============================================
// Settings Operations
// ============================================

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const result = await db.get('settings', key);
  return result as T | undefined;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function getSettings(): Promise<Partial<AppSettings>> {
  const db = await getDB();
  const allSettings = await db.getAll('settings');
  
  const settings: Record<string, unknown> = {};
  for (const item of allSettings) {
    const record = item as { key: string; value: unknown };
    settings[record.key] = record.value;
  }
  
  return settings as Partial<AppSettings>;
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('settings', 'readwrite');
  
  const promises = Object.entries(settings).map(([key, value]) =>
    tx.store.put({ key, value })
  );
  
  await Promise.all(promises);
  await tx.done;
}

// ============================================
// Database Cleanup
// ============================================

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['conversations', 'messages', 'settings'], 'readwrite');
  
  await Promise.all([
    tx.objectStore('conversations').clear(),
    tx.objectStore('messages').clear(),
    tx.objectStore('settings').clear(),
  ]);
  
  await tx.done;
}
