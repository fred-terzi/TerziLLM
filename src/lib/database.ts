import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Conversation, Message } from '../types'

// ============================================================
// IndexedDB Schema
// ============================================================

interface TerziDBSchema extends DBSchema {
  conversations: {
    key: string
    value: Conversation
    indexes: { 'by-updatedAt': Date }
  }
  messages: {
    key: string
    value: Message
    indexes: { 'by-conversationId': string }
  }
  settings: {
    key: string
    value: { key: string; value: unknown }
  }
}

const DB_NAME = 'terzillm'
const DB_VERSION = 1

// ============================================================
// Database singleton
// ============================================================

let dbPromise: Promise<IDBPDatabase<TerziDBSchema>> | null = null

export function getDB(): Promise<IDBPDatabase<TerziDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<TerziDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Conversations store
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' })
        convStore.createIndex('by-updatedAt', 'updatedAt')

        // Messages store
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
        msgStore.createIndex('by-conversationId', 'conversationId')

        // Settings store
        db.createObjectStore('settings', { keyPath: 'key' })
      },
    })
  }
  return dbPromise
}

/** Reset the singleton — used in tests to get a fresh DB */
export function resetDB(): void {
  dbPromise = null
}

// ============================================================
// Conversation operations
// ============================================================

export async function createConversation(
  id: string,
  title: string = 'New conversation',
): Promise<Conversation> {
  const db = await getDB()
  const now = new Date()
  const conversation: Conversation = {
    id,
    title,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('conversations', conversation)
  return conversation
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB()
  return db.get('conversations', id)
}

export async function listConversations(): Promise<Conversation[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('conversations', 'by-updatedAt')
  return all.reverse() // newest first
}

export async function updateConversation(
  id: string,
  updates: Partial<Pick<Conversation, 'title'>>,
): Promise<void> {
  const db = await getDB()
  const existing = await db.get('conversations', id)
  if (!existing) return
  await db.put('conversations', {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  })
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB()
  // Delete all messages in conversation
  const messages = await getMessages(id)
  const tx = db.transaction(['conversations', 'messages'], 'readwrite')
  await tx.objectStore('conversations').delete(id)
  for (const msg of messages) {
    await tx.objectStore('messages').delete(msg.id)
  }
  await tx.done
}

// ============================================================
// Message operations
// ============================================================

export async function addMessage(message: Message): Promise<void> {
  const db = await getDB()
  await db.put('messages', message)
  // Touch conversation's updatedAt
  const conv = await db.get('conversations', message.conversationId)
  if (conv) {
    await db.put('conversations', { ...conv, updatedAt: new Date() })
  }
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const db = await getDB()
  return db.getAllFromIndex('messages', 'by-conversationId', conversationId)
}

export async function deleteMessage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('messages', id)
}

// ============================================================
// Settings operations
// ============================================================

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  const row = await db.get('settings', key)
  return row?.value as T | undefined
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await getDB()
  await db.put('settings', { key, value })
}

export async function deleteSetting(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('settings', key)
}
