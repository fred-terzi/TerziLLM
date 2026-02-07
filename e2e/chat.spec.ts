import { test, expect } from '@playwright/test'

// Mock WebGPU so the app doesn't show the unsupported screen
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Mock navigator.gpu
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: async () => ({
          requestDevice: async () => ({}),
          features: new Set(),
          limits: {},
        }),
      },
      writable: true,
      configurable: true,
    })
  })
})

test.describe('App Shell', () => {
  test('renders the main layout', async ({ page }) => {
    await page.goto('/')
    
    // Should show sidebar with TerziLLM branding
    await expect(page.getByRole('heading', { name: '🧠 TerziLLM' })).toBeVisible()
    
    // Should show the New Chat button
    await expect(page.getByTestId('new-chat-button')).toBeVisible()
    
    // Should show the chat input (disabled because no model loaded)
    await expect(page.getByTestId('chat-input')).toBeVisible()
  })

  test('shows empty state when no conversations', async ({ page }) => {
    await page.goto('/')
    
    // Should show "Start a conversation" empty state
    await expect(page.getByText('Start a conversation')).toBeVisible()
  })

  test('creates a new conversation', async ({ page }) => {
    await page.goto('/')
    
    // Click New Chat
    await page.getByTestId('new-chat-button').click()
    
    // Should create a conversation and show it in sidebar
    await expect(page.getByTestId('conversation-item')).toBeVisible()
  })
})

test.describe('Sidebar', () => {
  test('toggles sidebar visibility', async ({ page }) => {
    await page.goto('/')
    
    // Sidebar should be visible by default
    await expect(page.getByTestId('sidebar')).toBeVisible()
    
    // Close sidebar
    await page.getByTestId('sidebar').locator('button[title="Close sidebar"]').click()
    
    // Sidebar should be hidden
    await expect(page.getByTestId('sidebar')).not.toBeVisible()
    
    // Open sidebar via hamburger menu
    await page.getByTestId('open-sidebar-button').click()
    await expect(page.getByTestId('sidebar')).toBeVisible()
  })

  test('shows settings button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('settings-button')).toBeVisible()
  })
})

test.describe('Settings Modal', () => {
  test('opens and closes settings modal', async ({ page }) => {
    await page.goto('/')
    
    // Click settings button
    await page.getByTestId('settings-button').click()
    
    // Settings modal should appear
    await expect(page.getByTestId('settings-modal')).toBeVisible()
    
    // Should show model options
    await expect(page.getByTestId('model-option-mobile')).toBeVisible()
    await expect(page.getByTestId('model-option-light')).toBeVisible()
    await expect(page.getByTestId('model-option-medium')).toBeVisible()
    await expect(page.getByTestId('model-option-heavy')).toBeVisible()
    
    // Close via Escape
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('settings-modal')).not.toBeVisible()
  })

  test('opens settings via model status badge', async ({ page }) => {
    await page.goto('/')
    
    await page.getByTestId('model-status-badge').click()
    await expect(page.getByTestId('settings-modal')).toBeVisible()
  })
})

test.describe('Model Status', () => {
  test('shows no model loaded initially', async ({ page }) => {
    await page.goto('/')
    
    // Model status badge should indicate no model
    const badge = page.getByTestId('model-status-badge')
    await expect(badge).toContainText('No model loaded')
  })
})

test.describe('Multiple Conversations', () => {
  test('manages multiple conversations', async ({ page }) => {
    await page.goto('/')
    
    // Create first conversation
    await page.getByTestId('new-chat-button').click()
    await expect(page.getByTestId('conversation-item')).toHaveCount(1)
    
    // Create second conversation
    await page.getByTestId('new-chat-button').click()
    await expect(page.getByTestId('conversation-item')).toHaveCount(2)
  })
})

test.describe('Responsive Design', () => {
  test('renders properly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // App should still render
    await expect(page.getByTestId('chat-input')).toBeVisible()
  })
})
