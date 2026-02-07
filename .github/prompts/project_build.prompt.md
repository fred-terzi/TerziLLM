---
agent: agent
---
# Plan: Implement TerziLLM Phase 1 & Phase 2

Build the entire TerziLLM application from scratch — a PWA for local LLM inference via WebLLM with streaming chat, IndexedDB persistence, model management UI, and error recovery — delivering a polished, testable product across 8 incremental steps with automated tests at each stage.

## Steps

### Step 1: Scaffold the project & tooling

Run `npm create vite@latest . -- --template react-ts`, install all dependencies (`@mlc-ai/web-llm`, `ai`, `zustand`, `idb`, `tailwindcss`, `vite-plugin-pwa`, `vitest`, `@vitest/coverage-v8`, `playwright`, `fake-indexeddb`), configure `tsconfig.json`, `vite.config.ts` (with PWA plugin & worker support), `tailwind.config.js`, and add npm scripts for `dev`, `build`, `test`, `test:coverage`, `test:e2e`. Create `.gitignore`. Commit as `chore: project scaffold`.

### Step 2: Build the shared types & IndexedDB persistence layer

Create `src/types/index.ts` with `Conversation`, `Message`, `AppStore`, worker protocol types. Implement `src/lib/database.ts` using `idb` with the schema from the README (`conversations`, `messages`, `settings` stores). Write unit tests in `src/lib/__tests__/database.test.ts` using `fake-indexeddb` covering CRUD for conversations, messages, and settings. Run `npm test` to validate. Commit as `feat: types & IndexedDB layer`.

### Step 3: Implement the Web Worker & WorkerBridge

Create `src/worker/llm-worker.ts` handling the full message protocol (`init`, `chat`, `abort`, `chunk`, `done`, `error`, `init-progress`, `init-complete`). Implement `src/lib/worker-bridge.ts` with the `WorkerBridge` class that returns a `ReadableStream` compatible with Vercel AI SDK's `fetch` override. Write integration tests in `src/lib/__tests__/worker-bridge.test.ts` using a mock worker (inline `MessageChannel` or `vitest-webworker`) that simulates token streaming and error conditions. Commit as `feat: worker bridge & LLM worker`.

### Step 4: Build the Zustand store with IndexedDB persistence

Create `src/store/app-store.ts` implementing the `AppStore` interface (inferenceMode, modelStatus, loadProgress, currentConversationId, conversations, sidebarOpen, settingsOpen). Add a custom `persist` middleware that hydrates from and debounce-writes to IndexedDB via the database layer. Write tests in `src/store/__tests__/app-store.test.ts` validating hydration, state transitions, and persistence round-trips. Commit as `feat: Zustand store with persistence`.

### Step 5: Build the core chat UI components

Implement the component tree: `src/App.tsx`, `src/components/chat/ChatContainer.tsx`, `src/components/chat/MessageList.tsx`, `src/components/chat/MessageBubble.tsx`, `src/components/chat/ChatInput.tsx`, `src/components/chat/StreamingMarkdown.tsx` (use `react-markdown`), `src/components/sidebar/Sidebar.tsx`, `src/components/sidebar/ConversationItem.tsx`. Wire up `useChat` from `ai/react` with the custom `fetch` handler that routes through `WorkerBridge`. Create `src/hooks/useWorkerBridge.ts` and `src/hooks/useDatabase.ts`. Style with Tailwind for a clean, mobile-responsive chat interface. Commit as `feat: chat UI with streaming`.

### Step 6: Add model selector, download progress UI, and cached model management

Implement `src/components/settings/SettingsModal.tsx` and `src/components/settings/ModelSelector.tsx` supporting the 4 tiers (Mobile/Light/Medium/Heavy). Add a progress bar component that subscribes to `init-progress` messages from the worker. Implement a "Cached Models" display showing which models are stored in IndexedDB Cache and their sizes, plus a "Remove Cached Model" button that calls `caches.delete()` / WebLLM's cache API. This covers Phase 2 features. Commit as `feat: model management & progress UI`.

### Step 7: Implement error handling & recovery flows

Add error boundaries and recovery UI for: WebGPU not supported (detect via `navigator.gpu`), model load failures (retry with smaller model suggestion), out-of-memory (clear cache & retry option), generation errors (abort & display message). Wire these into the store's `modelStatus: 'error'` state. Write tests for each error path using mock workers that simulate failures. Commit as `feat: error handling & recovery`.

### Step 8: PWA finalization, E2E tests & polish

Configure `vite.config.ts` PWA manifest (name, icons, theme color, start_url), service worker for offline caching. Write Playwright E2E tests in `e2e/chat.spec.ts` covering: app loads, model selection, send message & receive streamed response (with mocked WebLLM), conversation persistence across reload, sidebar navigation, cached model display/removal, error states. Use Playwright's `addInitScript` to mock WebGPU/WebLLM in CI. Final UI polish pass — loading skeletons, animations, empty states, mobile viewport. Commit as `feat: PWA & E2E tests`. Tag as `v0.2.0`.

---

## Considerations

### 1. WebLLM mocking in tests

The `@mlc-ai/web-llm` engine requires WebGPU which won't be available in CI/headless. The worker should be wrapped so tests inject a mock engine that emits canned token streams. Recommend: a shared `test/fixtures/mock-engine.ts` used by both unit and E2E tests.

### 2. Vercel AI SDK compatibility

`useChat` from `ai/react` expects an OpenAI-compatible streaming response format (`text/event-stream` with `data:` lines or `text/plain` streaming). The `WorkerBridge.chat()` return value must produce a `Response` whose body matches this format — specifically using AI SDK's `StreamData` / `streamText` protocol or raw SSE. This integration point needs careful validation in Step 5.

### 3. Model cache introspection

WebLLM stores weights in both IndexedDB and the Cache API. Listing cached models and their sizes requires querying `caches.open('webllm/model')` and iterating entries. If WebLLM's internal cache key format changes between versions, this could break — recommend pinning `@mlc-ai/web-llm` to an exact version and writing a resilient cache scanner with fallback.
