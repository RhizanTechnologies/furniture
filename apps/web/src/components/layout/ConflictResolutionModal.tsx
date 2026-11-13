import React, { useEffect, useState } from 'react';
import { db, OutboxMutation } from '../../lib/db';
import { useSync } from '../../context/SyncContext';
import { useLanguage } from '../../context/LanguageContext';
import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react';

interface ConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictModalProps> = ({ isOpen, onClose }) => {
  const { retryMutation, discardMutation } = useSync();
  const { t } = useLanguage();
  const [conflicts, setConflicts] = useState<OutboxMutation[]>([]);
  const [loading, setLoading] = useState(false);

  const loadConflicts = async () => {
    const items = await db.outbox.where('status').equals('CONFLICT').toArray();
    setConflicts(items);
  };

  useEffect(() => {
    if (isOpen) {
      loadConflicts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-xl rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-amber-500/10">
          <div className="flex items-center gap-2 text-amber-600 font-semibold">
            <AlertTriangle className="w-5 h-5" />
            <span>{t('common.resolveConflicts', 'Synchronization Conflicts')} ({conflicts.length})</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted"
            title={t('common.close', 'Close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {conflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t('common.noConflicts', 'No active synchronization conflicts. All local records are in sync.')}
            </p>
          ) : (
            conflicts.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg border border-amber-300 dark:border-amber-900/60 bg-amber-500/5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                    {item.entityType} ({item.action})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="text-sm">
                  <p className="font-medium text-destructive mb-1">
                    {t('common.conflict', 'Conflict')}: {item.lastError || 'Server rejected due to concurrent changes'}
                  </p>
                  {item.conflictDetails && (
                    <div className="bg-background/80 rounded p-2 text-xs font-mono space-y-1 border border-border">
                      {item.conflictDetails.availableStock !== undefined && (
                        <p>{t('orderDetail.availableInventory', 'Available on Server')}: {item.conflictDetails.availableStock} {item.conflictDetails.unitOfMeasurement || t('common.items', 'units')}</p>
                      )}
                      {item.conflictDetails.requestedQuantity !== undefined && (
                        <p>{t('orderDetail.qtyConsumed', 'Offline Attempted Quantity')}: {item.conflictDetails.requestedQuantity} {item.conflictDetails.unitOfMeasurement || t('common.items', 'units')}</p>
                      )}
                      {item.conflictDetails.outstandingBalance !== undefined && (
                        <p>{t('orders.balanceDue', 'Remaining Balance')}: ETB {item.conflictDetails.outstandingBalance}</p>
                      )}
                      {item.conflictDetails.attemptedAmount !== undefined && (
                        <p>{t('paymentModal.paymentAmount', 'Attempted Payment')}: ETB {item.conflictDetails.attemptedAmount}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                  <button
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      await discardMutation(item.id);
                      await loadConflicts();
                      setLoading(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('common.delete', 'Discard Local')}</span>
                  </button>
                  <button
                    disabled={loading}
                    onClick={async () => {
                      setLoading(true);
                      await retryMutation(item.id);
                      await loadConflicts();
                      setLoading(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{t('common.tryAgain', 'Force Retry')}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
