/**
 * TerziLLM - Main Application Component
 * A Progressive Web App for local LLM inference using WebLLM
 */

import { useEffect } from 'react';
import { Sidebar } from './components/sidebar';
import { ChatContainer } from './components/chat';
import { SettingsModal } from './components/settings';
import { useAppStore } from './store';
import { cn } from './lib/utils';

function App() {
  const {
    sidebarOpen,
    isMobile,
    setIsMobile,
    loadConversations,
  } = useAppStore();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-100 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className={cn(
        "flex-1 flex flex-col overflow-hidden",
        !sidebarOpen && !isMobile && "ml-0"
      )}>
        <ChatContainer />
      </main>

      {/* Settings modal */}
      <SettingsModal />
    </div>
  );
}

export default App;
