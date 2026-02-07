import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '../../../store/app-store'
import { resetDB } from '../../../lib/database'

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

describe('Error handling state', () => {
  it('sets error with WEBGPU_NOT_SUPPORTED code', () => {
    const store = useAppStore.getState()
    store.setError('WebGPU is not available', 'WEBGPU_NOT_SUPPORTED')

    const state = useAppStore.getState()
    expect(state.errorMessage).toBe('WebGPU is not available')
    expect(state.errorCode).toBe('WEBGPU_NOT_SUPPORTED')
    expect(state.modelStatus).toBe('error')
  })

  it('sets error with MODEL_LOAD_FAILED code', () => {
    const store = useAppStore.getState()
    store.setError('Failed to load model weights', 'MODEL_LOAD_FAILED')

    const state = useAppStore.getState()
    expect(state.errorCode).toBe('MODEL_LOAD_FAILED')
    expect(state.modelStatus).toBe('error')
  })

  it('sets error with OUT_OF_MEMORY code', () => {
    const store = useAppStore.getState()
    store.setError('Insufficient GPU memory', 'OUT_OF_MEMORY')

    const state = useAppStore.getState()
    expect(state.errorCode).toBe('OUT_OF_MEMORY')
  })

  it('sets error with GENERATION_ERROR code', () => {
    const store = useAppStore.getState()
    store.setError('Token generation failed', 'GENERATION_ERROR')

    const state = useAppStore.getState()
    expect(state.errorCode).toBe('GENERATION_ERROR')
  })

  it('sets error with NETWORK_ERROR code', () => {
    const store = useAppStore.getState()
    store.setError('Failed to fetch model', 'NETWORK_ERROR')

    const state = useAppStore.getState()
    expect(state.errorCode).toBe('NETWORK_ERROR')
  })

  it('clears error state', () => {
    const store = useAppStore.getState()
    store.setError('Something broke', 'UNKNOWN')

    expect(useAppStore.getState().errorMessage).toBeTruthy()

    store.clearError()

    const state = useAppStore.getState()
    expect(state.errorMessage).toBeNull()
    expect(state.errorCode).toBeNull()
  })

  it('transitions modelStatus to error when error is set', () => {
    const store = useAppStore.getState()
    store.setModelStatus('ready')
    expect(useAppStore.getState().modelStatus).toBe('ready')

    store.setError('Crash', 'GENERATION_ERROR')
    expect(useAppStore.getState().modelStatus).toBe('error')
  })

  it('does not change modelStatus when error message is null', () => {
    const store = useAppStore.getState()
    store.setModelStatus('ready')
    store.setError(null)
    expect(useAppStore.getState().modelStatus).toBe('ready')
  })

  it('handles error → recovery → ready flow', () => {
    const store = useAppStore.getState()
    store.setModelStatus('loading')
    store.setError('Load failed', 'MODEL_LOAD_FAILED')
    expect(useAppStore.getState().modelStatus).toBe('error')

    store.clearError()
    store.setModelStatus('loading')
    expect(useAppStore.getState().modelStatus).toBe('loading')

    store.setModelStatus('ready')
    expect(useAppStore.getState().modelStatus).toBe('ready')
    expect(useAppStore.getState().errorMessage).toBeNull()
  })
})
