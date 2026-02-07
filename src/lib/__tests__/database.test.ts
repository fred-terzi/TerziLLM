import { describe, it, expect, beforeEach } from 'vitest'
import {
  resetDB,
  createConversation,
  getConversation,
  listConversations,
  updateConversation,
  deleteConversation,
  addMessage,
  getMessages,
  getSetting,
  setSetting,
  deleteSetting,
} from '../database'
import type { Message } from '../../types'

beforeEach(() => {
  resetDB()
})

// ============================================================
// Conversation CRUD
// ============================================================

describe('Conversations', () => {
  it('creates and retrieves a conversation', async () => {
    const conv = await createConversation('c1', 'Hello world')
    expect(conv.id).toBe('c1')
    expect(conv.title).toBe('Hello world')
    expect(conv.createdAt).toBeInstanceOf(Date)

    const fetched = await getConversation('c1')
    expect(fetched).toBeDefined()
    expect(fetched!.id).toBe('c1')
  })

  it('lists conversations newest-first', async () => {
    await createConversation('c1', 'First')
    // Small delay so updatedAt differs
    await new Promise((r) => setTimeout(r, 10))
    await createConversation('c2', 'Second')

    const list = await listConversations()
    expect(list).toHaveLength(2)
    expect(list[0].id).toBe('c2')
    expect(list[1].id).toBe('c1')
  })

  it('updates a conversation title', async () => {
    await createConversation('c1', 'Old title')
    await updateConversation('c1', { title: 'New title' })

    const conv = await getConversation('c1')
    expect(conv!.title).toBe('New title')
  })

  it('deletes a conversation and its messages', async () => {
    await createConversation('c1', 'To delete')
    const msg: Message = {
      id: 'm1',
      conversationId: 'c1',
      role: 'user',
      content: 'Hello',
      createdAt: new Date(),
    }
    await addMessage(msg)

    await deleteConversation('c1')

    expect(await getConversation('c1')).toBeUndefined()
    expect(await getMessages('c1')).toHaveLength(0)
  })

  it('returns undefined for non-existent conversation', async () => {
    const conv = await getConversation('nonexistent')
    expect(conv).toBeUndefined()
  })
})

// ============================================================
// Message CRUD
// ============================================================

describe('Messages', () => {
  it('adds and retrieves messages for a conversation', async () => {
    await createConversation('c1', 'Chat')

    const msg1: Message = {
      id: 'm1',
      conversationId: 'c1',
      role: 'user',
      content: 'Hi there',
      createdAt: new Date(),
    }
    const msg2: Message = {
      id: 'm2',
      conversationId: 'c1',
      role: 'assistant',
      content: 'Hello!',
      createdAt: new Date(),
    }

    await addMessage(msg1)
    await addMessage(msg2)

    const msgs = await getMessages('c1')
    expect(msgs).toHaveLength(2)
    expect(msgs.map((m) => m.role)).toEqual(['user', 'assistant'])
  })

  it('only returns messages for the requested conversation', async () => {
    await createConversation('c1', 'Chat 1')
    await createConversation('c2', 'Chat 2')

    await addMessage({
      id: 'm1',
      conversationId: 'c1',
      role: 'user',
      content: 'In c1',
      createdAt: new Date(),
    })
    await addMessage({
      id: 'm2',
      conversationId: 'c2',
      role: 'user',
      content: 'In c2',
      createdAt: new Date(),
    })

    const msgs = await getMessages('c1')
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toBe('In c1')
  })

  it('updates conversation updatedAt when adding a message', async () => {
    const conv = await createConversation('c1', 'Chat')
    const originalUpdatedAt = conv.updatedAt.getTime()

    await new Promise((r) => setTimeout(r, 10))

    await addMessage({
      id: 'm1',
      conversationId: 'c1',
      role: 'user',
      content: 'New message',
      createdAt: new Date(),
    })

    const updated = await getConversation('c1')
    expect(updated!.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt)
  })

  it('stores message metadata', async () => {
    await createConversation('c1', 'Chat')

    await addMessage({
      id: 'm1',
      conversationId: 'c1',
      role: 'assistant',
      content: 'Response',
      createdAt: new Date(),
      metadata: {
        model: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
        tokensUsed: 42,
        durationMs: 1200,
      },
    })

    const msgs = await getMessages('c1')
    expect(msgs[0].metadata?.model).toBe('Llama-3.2-1B-Instruct-q4f16_1-MLC')
    expect(msgs[0].metadata?.tokensUsed).toBe(42)
  })
})

// ============================================================
// Settings CRUD
// ============================================================

describe('Settings', () => {
  it('sets and gets a string setting', async () => {
    await setSetting('theme', 'dark')
    const val = await getSetting<string>('theme')
    expect(val).toBe('dark')
  })

  it('sets and gets a complex setting', async () => {
    const config = { temperature: 0.7, maxTokens: 2048 }
    await setSetting('genConfig', config)
    const val = await getSetting<typeof config>('genConfig')
    expect(val).toEqual(config)
  })

  it('overwrites an existing setting', async () => {
    await setSetting('model', 'old-model')
    await setSetting('model', 'new-model')
    const val = await getSetting<string>('model')
    expect(val).toBe('new-model')
  })

  it('deletes a setting', async () => {
    await setSetting('model', 'some-model')
    await deleteSetting('model')
    const val = await getSetting<string>('model')
    expect(val).toBeUndefined()
  })

  it('returns undefined for non-existent setting', async () => {
    const val = await getSetting<string>('nonexistent')
    expect(val).toBeUndefined()
  })
})
