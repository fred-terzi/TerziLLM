/**
 * SettingsModal - Modal dialog for app settings
 */

import { X, Cpu, Wifi, Moon, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store';
import { ModelSelector } from './ModelSelector';
import { cn } from '../../lib/utils';
import { useWorkerBridge } from '../../hooks/useWorkerBridge';
import { useEffect } from 'react';

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    inferenceMode,
    setInferenceMode,
    hostUrl,
    setHostUrl,
    setModelStatus,
    setLoadProgress,
  } = useAppStore();

  const workerBridge = useWorkerBridge();

  // Sync worker status with store
  useEffect(() => {
    if (workerBridge.status === 'idle') {
      setModelStatus('idle');
    } else if (workerBridge.status === 'loading') {
      setModelStatus('loading');
    } else if (workerBridge.status === 'ready') {
      setModelStatus('ready');
    } else if (workerBridge.status === 'error') {
      setModelStatus('error');
    }
  }, [workerBridge.status, setModelStatus]);

  // Sync init progress with store
  useEffect(() => {
    if (workerBridge.initProgress) {
      setLoadProgress(
        workerBridge.initProgress.progress,
        workerBridge.initProgress.text
      );
    }
  }, [workerBridge.initProgress, setLoadProgress]);

  if (!settingsOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-lg sm:w-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Model Selection */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              Model Selection
            </h3>
            <ModelSelector
              onModelLoad={async (modelId) => {
                try {
                  await workerBridge.initialize(modelId);
                  // Status is synced via useEffect
                } catch (error) {
                  console.error('Failed to load model:', error);
                }
              }}
            />
          </section>

          {/* Inference Mode */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Inference Mode
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInferenceMode('local')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  inferenceMode === 'local'
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <Cpu className={cn(
                  "w-6 h-6 mb-2",
                  inferenceMode === 'local' ? "text-blue-500" : "text-gray-400"
                )} />
                <p className="font-medium text-gray-900 dark:text-white">Local</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Run on this device
                </p>
              </button>

              <button
                onClick={() => setInferenceMode('remote')}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-left",
                  inferenceMode === 'remote'
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <Wifi className={cn(
                  "w-6 h-6 mb-2",
                  inferenceMode === 'remote' ? "text-blue-500" : "text-gray-400"
                )} />
                <p className="font-medium text-gray-900 dark:text-white">Remote</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Connect to host
                </p>
              </button>
            </div>

            {/* Remote host URL input */}
            {inferenceMode === 'remote' && (
              <div className="mt-4">
                <label
                  htmlFor="hostUrl"
                  className="block text-sm text-gray-600 dark:text-gray-400 mb-2"
                >
                  Host URL
                </label>
                <input
                  id="hostUrl"
                  type="url"
                  value={hostUrl || ''}
                  onChange={(e) => setHostUrl(e.target.value || null)}
                  placeholder="ws://192.168.1.100:8080"
                  className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Enter the WebSocket URL of your host machine
                </p>
              </div>
            )}
          </section>

          {/* Appearance */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Moon className="w-4 h-4" />
              Appearance
            </h3>
            <div className="flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-gray-500" />
                <span className="text-gray-900 dark:text-white">Dark Mode</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Follows system
              </p>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Data Management
            </h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                <span className="text-gray-900 dark:text-white">
                  Clear Conversation History
                </span>
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                <span className="text-gray-900 dark:text-white">
                  Clear Cached Models
                </span>
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            TerziLLM v0.1.0 • Built with WebLLM
          </p>
        </div>
      </div>
    </>
  );
}
