import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { syncEngine, SyncEngineStatus } from '../lib/sync-engine';
import { OutboxEntityType, OutboxAction } from '../lib/db';

interface SyncContextValue extends SyncEngineStatus {
  syncNow: () => Promise<void>;
  retryMutation: (id: string) => Promise<void>;
  discardMutation: (id: string) => Promise<void>;
  clearCompleted: () => Promise<number>;
  enqueueMutation: (params: {
    entityType: OutboxEntityType;
    action: OutboxAction;
    payload: any;
    tempEntityId?: string;
  }) => Promise<{ clientMutationId: string }>;
  enqueueImage: (
    file: File | Blob,
    fileName: string,
    productId?: string,
  ) => Promise<{ clientMutationId: string; previewUrl: string }>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SyncEngineStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    imageCount: 0,
    conflictCount: 0,
    failedCount: 0,
    lastSyncedAt: null,
  });

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return unsubscribe;
  }, []);

  const syncNow = useCallback(async () => {
    await syncEngine.syncAll();
  }, []);

  const retryMutation = useCallback(async (id: string) => {
    await syncEngine.retryMutation(id);
  }, []);

  const discardMutation = useCallback(async (id: string) => {
    await syncEngine.discardMutation(id);
  }, []);

  const clearCompleted = useCallback(async () => {
    return await syncEngine.clearCompleted();
  }, []);

  const enqueueMutation = useCallback(
    async (params: {
      entityType: OutboxEntityType;
      action: OutboxAction;
      payload: any;
      tempEntityId?: string;
    }) => {
      return await syncEngine.enqueueMutation(params);
    },
    [],
  );

  const enqueueImage = useCallback(
    async (file: File | Blob, fileName: string, productId?: string) => {
      return await syncEngine.enqueueImage(file, fileName, productId);
    },
    [],
  );

  return (
    <SyncContext.Provider
      value={{
        ...status,
        syncNow,
        retryMutation,
        discardMutation,
        clearCompleted,
        enqueueMutation,
        enqueueImage,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
}
