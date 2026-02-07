import { useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatContainer } from './components/chat/ChatContainer'
import { SettingsModal } from './components/settings/SettingsModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { WebGPUCheck } from './components/WebGPUCheck'
import { useAppStore } from './store/app-store'

function App() {
  const hydrate = useAppStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <ErrorBoundary>
      <WebGPUCheck>
        <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
          <Sidebar />
          <ChatContainer />
          <SettingsModal />
        </div>
      </WebGPUCheck>
    </ErrorBoundary>
  )
}

export default App
