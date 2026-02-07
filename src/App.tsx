import { useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { ChatContainer } from './components/chat/ChatContainer'
import { SettingsModal } from './components/settings/SettingsModal'
import { useAppStore } from './store/app-store'

function App() {
  const hydrate = useAppStore((s) => s.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <Sidebar />
      <ChatContainer />
      <SettingsModal />
    </div>
  )
}

export default App
