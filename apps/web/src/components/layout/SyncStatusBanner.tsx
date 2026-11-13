import React, { useState } from 'react';
import { useSync } from '../../context/SyncContext';
import { useLanguage } from '../../context/LanguageContext';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { ConflictResolutionModal } from './ConflictResolutionModal';

export const SyncStatusBanner: React.FC = () => {
  const { t } = useLanguage();
  const {
    isOnline,
    isSyncing,
    pendingCount,
    imageCount,
    conflictCount,
    failedCount,
    syncNow,
  } = useSync();

  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);

  // If online, not syncing, and no pending or conflict items, do not render a banner to save screen space
  const hasPendingItems = pendingCount > 0 || imageCount > 0 || failedCount > 0;
  const hasConflicts = conflictCount > 0;

  if (isOnline && !hasPendingItems && !hasConflicts && !isSyncing) {
    return null;
  }

  return (
    <>
      <div
        className={`w-full text-xs font-medium transition-colors border-b px-4 py-2 ${
          !isOnline
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
            : hasConflicts
            ? 'bg-destructive/15 border-destructive/30 text-destructive'
            : hasPendingItems
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-900 dark:text-blue-200'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
        }`}
      >
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-2">
          {/* Connection & General Status */}
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <span className="flex items-center gap-1.5 font-semibold">
                <WifiOff className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>Offline Mode — Working Locally</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-medium">
                <Wifi className="w-4 h-4 text-emerald-600" />
                <span>Connected</span>
              </span>
            )}

            {/* Pending count badge */}
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-[11px] font-semibold">
                {pendingCount} change{pendingCount > 1 ? 's' : ''} pending sync
              </span>
            )}

            {/* Offline images count badge */}
            {imageCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 text-[11px] font-semibold">
                <ImageIcon className="w-3 h-3" />
                {imageCount} photo{imageCount > 1 ? 's' : ''} pending
              </span>
            )}

            {/* Syncing indicator */}
            {isSyncing && (
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Synchronizing...
              </span>
            )}
          </div>

          {/* Action buttons & Conflict trigger */}
          <div className="flex items-center gap-2">
            {hasConflicts && (
              <button
                onClick={() => setIsConflictModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-bold animate-pulse shadow-sm"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Resolve Conflicts ({conflictCount})</span>
              </button>
            )}

            {isOnline && hasPendingItems && !isSyncing && (
              <button
                onClick={() => syncNow()}
                className="flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-sm transition-transform active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Now</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <ConflictResolutionModal
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
      />
    </>
  );
};
