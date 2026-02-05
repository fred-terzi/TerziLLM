/**
 * WelcomeScreen - Displayed when no conversation is selected
 */

import { MessageSquare, Zap, Shield, Smartphone } from 'lucide-react';
import { useAppStore } from '../../store';
import { AVAILABLE_MODELS } from '../../types';

export function WelcomeScreen() {
  const { selectedModel, setSettingsOpen, modelStatus } = useAppStore();

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  const features = [
    {
      icon: Zap,
      title: 'Local Inference',
      description: 'Run AI models entirely in your browser using WebGPU',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your conversations never leave your device',
    },
    {
      icon: Smartphone,
      title: 'Works Everywhere',
      description: 'Install as a PWA on desktop or mobile',
    },
  ];

  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center">
        {/* Logo and title */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl shadow-lg mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome to TerziLLM
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Your private, local AI assistant
          </p>
        </div>

        {/* Current model info */}
        <div className="mb-8 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="text-left">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Selected Model
              </p>
              <p className="font-medium text-gray-900 dark:text-white">
                {currentModel?.name || 'No model selected'}
              </p>
              {currentModel && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {currentModel.size} • {currentModel.description}
                </p>
              )}
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {modelStatus === 'ready' ? 'Change Model' : 'Load Model'}
            </button>
          </div>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <feature.icon className="w-8 h-8 text-blue-500 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Getting started hint */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {modelStatus === 'ready' 
            ? 'Start typing below to begin a conversation'
            : 'Load a model from settings to get started'}
        </p>
      </div>
    </div>
  );
}
