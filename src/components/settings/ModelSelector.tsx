/**
 * ModelSelector - Model selection dropdown with info
 */

import { useState } from 'react';
import { Check, ChevronDown, Download, HardDrive, Zap } from 'lucide-react';
import { useAppStore } from '../../store';
import { AVAILABLE_MODELS, type ModelInfo } from '../../types';
import { cn } from '../../lib/utils';

interface ModelSelectorProps {
  onModelLoad: (modelId: string) => void;
}

export function ModelSelector({ onModelLoad }: ModelSelectorProps) {
  const { selectedModel, setSelectedModel, modelStatus } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);

  const handleSelectModel = (model: ModelInfo) => {
    setSelectedModel(model.id);
    setIsOpen(false);
  };

  const handleLoadModel = () => {
    onModelLoad(selectedModel);
  };

  const getCategoryColor = (category: ModelInfo['category']) => {
    switch (category) {
      case 'mobile':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'light':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'medium':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'heavy':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    }
  };

  return (
    <div className="space-y-3">
      {/* Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white">
                {currentModel?.name || 'Select a model'}
              </p>
              {currentModel && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {currentModel.size} • {currentModel.vram} VRAM
                </p>
              )}
            </div>
          </div>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-gray-400 transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-10">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model)}
                className={cn(
                  "w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors",
                  model.id === selectedModel && "bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                      getCategoryColor(model.category)
                    )}>
                      {model.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {model.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {model.size}
                    </span>
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" />
                      {model.vram} VRAM
                    </span>
                  </div>
                </div>
                {model.id === selectedModel && (
                  <Check className="w-5 h-5 text-blue-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Load button */}
      <button
        onClick={handleLoadModel}
        disabled={modelStatus === 'loading'}
        className={cn(
          "w-full py-3 px-4 rounded-xl font-medium transition-all",
          modelStatus === 'loading'
            ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
            : modelStatus === 'ready' && currentModel?.id === selectedModel
              ? "bg-green-500 hover:bg-green-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
        )}
      >
        {modelStatus === 'loading' 
          ? 'Loading...' 
          : modelStatus === 'ready' 
            ? 'Model Loaded ✓' 
            : 'Load Model'}
      </button>

      {/* Info text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Models are downloaded and cached in your browser
      </p>
    </div>
  );
}
