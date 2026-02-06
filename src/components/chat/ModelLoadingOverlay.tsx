/**
 * ModelLoadingOverlay - Shows progress while model is loading
 */

import { Loader2, Download } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModelLoadingOverlayProps {
  progress: number;
  text: string;
}

export function ModelLoadingOverlay({ progress, text }: ModelLoadingOverlayProps) {
  const percentage = Math.round(progress * 100);
  const isDownloading = text.toLowerCase().includes('download') || text.toLowerCase().includes('fetch');

  return (
    <div className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm flex items-center justify-center z-10">
      <div className="text-center max-w-sm px-6">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
          {isDownloading ? (
            <Download className="w-8 h-8 text-blue-500 animate-bounce" />
          ) : (
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300 ease-out",
              "bg-gradient-to-r from-blue-500 to-purple-500"
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Progress text */}
        <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {percentage}%
        </p>
        
        {/* Status text */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {text || 'Initializing...'}
        </p>

        {/* Tips */}
        {isDownloading && (
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-500">
            Model will be cached for faster loading next time
          </p>
        )}
      </div>
    </div>
  );
}
