import { db, OutboxMutation, OfflineImageRecord, OutboxEntityType, OutboxAction } from './db';
import { apiClient } from './api-client';

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  imageCount: number;
  conflictCount: number;
  failedCount: number;
  lastSyncedAt: string | null;
}

type SyncStatusListener = (status: SyncEngineStatus) => void;

class SyncEngine {
  private isSyncing = false;
  private activeSyncPromise: Promise<{
    success: boolean;
    synced: number;
    conflicts: number;
    failed: number;
  }> | null = null;
  private listeners: Set<SyncStatusListener> = new Set();
  private timer: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notify();
        this.syncAll();
      });

      window.addEventListener('offline', () => {
        this.notify();
      });

      // Foreground periodic sync check every 30 seconds
      this.timer = setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncAll();
        }
      }, 30000);
    }
  }

  public subscribe(listener: SyncStatusListener): () => void {
    this.listeners.add(listener);
    this.getStatus().then(listener);
    return () => this.listeners.delete(listener);
  }

  private async notify() {
    const status = await this.getStatus();
    this.listeners.forEach((listener) => {
      try {
        listener(status);
      } catch (e) {
        console.error('Error in sync listener', e);
      }
    });
  }

  public async getStatus(): Promise<SyncEngineStatus> {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const pendingCount = await db.outbox.where('status').equals('PENDING').count();
    const conflictCount = await db.outbox.where('status').equals('CONFLICT').count();
    const failedCount = await db.outbox.where('status').equals('FAILED').count();
    const imageCount = await db.offlineImages.where('status').equals('PENDING').count();
    const meta = await db.syncMetadata.get('lastSyncedAt');

    return {
      isOnline,
      isSyncing: this.isSyncing,
      pendingCount,
      imageCount,
      conflictCount,
      failedCount,
      lastSyncedAt: meta?.value || null,
    };
  }

  /**
   * Enqueue a client mutation to be executed offline and synced later.
   */
  public async enqueueMutation(params: {
    entityType: OutboxEntityType;
    action: OutboxAction;
    payload: any;
    tempEntityId?: string;
  }): Promise<{ clientMutationId: string }> {
    const clientMutationId = crypto.randomUUID();
    const mutation: OutboxMutation = {
      id: crypto.randomUUID(),
      clientMutationId,
      entityType: params.entityType,
      action: params.action,
      payload: params.payload,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
      retryCount: 0,
      tempEntityId: params.tempEntityId,
    };

    await db.outbox.add(mutation);

    // Optimistically update local indexedDB storage if applicable
    await this.applyOptimisticLocalUpdate(params.entityType, params.payload, clientMutationId, params.tempEntityId);

    await this.notify();

    // Trigger immediate sync attempt if currently online
    if (typeof navigator !== 'undefined' && navigator.onLine && !this.isSyncing) {
      this.syncAll();
    }

    return { clientMutationId };
  }

  /**
   * Enqueue an image blob while offline for later upload.
   */
  public async enqueueImage(
    file: File | Blob,
    fileName: string,
    productId?: string,
  ): Promise<{ clientMutationId: string; previewUrl: string }> {
    const clientMutationId = crypto.randomUUID();
    const record: OfflineImageRecord = {
      id: crypto.randomUUID(),
      clientMutationId,
      productId,
      blob: file,
      fileName,
      mimeType: file.type || 'image/jpeg',
      fileSizeBytes: file.size,
      createdAt: new Date().toISOString(),
      status: 'PENDING',
    };

    await db.offlineImages.add(record);
    const previewUrl = URL.createObjectURL(file);

    await this.notify();

    if (typeof navigator !== 'undefined' && navigator.onLine && !this.isSyncing) {
      this.syncAll();
    }

    return { clientMutationId, previewUrl };
  }

  /**
   * Execute full synchronization against backend
   */
  public async syncAll(): Promise<{
    success: boolean;
    synced: number;
    conflicts: number;
    failed: number;
  }> {
    if (this.activeSyncPromise) {
      return this.activeSyncPromise;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, synced: 0, conflicts: 0, failed: 0 };
    }

    this.activeSyncPromise = this.executeSyncAll();
    try {
      return await this.activeSyncPromise;
    } finally {
      this.activeSyncPromise = null;
    }
  }

  private async executeSyncAll(): Promise<{
    success: boolean;
    synced: number;
    conflicts: number;
    failed: number;
  }> {
    this.isSyncing = true;
    await this.notify();

    let synced = 0;
    let conflicts = 0;
    let failed = 0;

    try {
      // 1. Fetch pending and retryable outbox items ordered chronologically
      const outboxItems = await db.outbox
        .filter((item) => item.status === 'PENDING' || (item.status === 'FAILED' && item.retryCount < 5))
        .sortBy('createdAt');

      if (outboxItems.length > 0) {
        // Mark all picked items as SYNCING
        await db.transaction('rw', db.outbox, async () => {
          for (const item of outboxItems) {
            await db.outbox.update(item.id, { status: 'SYNCING' });
          }
        });

        try {
          const response = await apiClient<{
            results: Array<{
              clientMutationId: string;
              entityType: OutboxEntityType;
              status: 'SUCCESS' | 'CONFLICT' | 'VALIDATION_ERROR' | 'RETRYABLE_ERROR';
              result?: any;
              error?: string;
              conflictType?: string;
              conflictDetails?: any;
            }>;
            processedAt: string;
          }>('/sync/batch', {
            method: 'POST',
            body: JSON.stringify({
              operations: outboxItems.map((item) => ({
                clientMutationId: item.clientMutationId,
                entityType: item.entityType,
                action: item.action,
                payload: item.payload,
                timestamp: item.createdAt,
                tempEntityId: item.tempEntityId,
              })),
            }),
          });

          // Reconcile each result
          for (const res of response.results) {
            const outboxItem = outboxItems.find((o) => o.clientMutationId === res.clientMutationId);
            if (!outboxItem) continue;

            if (res.status === 'SUCCESS') {
              synced++;
              await db.outbox.update(outboxItem.id, {
                status: 'COMPLETED',
                lastError: undefined,
              });
              // Update local state to confirmed
              await this.reconcileLocalRecord(outboxItem.entityType, res.result, outboxItem.tempEntityId);
            } else if (res.status === 'CONFLICT') {
              conflicts++;
              await db.outbox.update(outboxItem.id, {
                status: 'CONFLICT',
                conflictDetails: res.conflictDetails,
                lastError: res.error,
              });
            } else {
              failed++;
              await db.outbox.update(outboxItem.id, {
                status: 'FAILED',
                retryCount: outboxItem.retryCount + 1,
                lastError: res.error || 'Server validation failed',
              });
            }
          }
        } catch (networkOrServerError: any) {
          // In case of full network interruption during sync, reset status to PENDING
          // so next cycle will retry idempotently with the same clientMutationIds
          await db.transaction('rw', db.outbox, async () => {
            for (const item of outboxItems) {
              await db.outbox.update(item.id, {
                status: 'PENDING',
                retryCount: item.retryCount + 1,
                lastError: networkOrServerError.message,
              });
            }
          });
        }
      }

      // 2. Upload pending offline image blobs
      const pendingImages = await db.offlineImages.where('status').equals('PENDING').toArray();
      for (const img of pendingImages) {
        try {
          await db.offlineImages.update(img.id, { status: 'UPLOADING' });
          const formData = new FormData();
          formData.append('file', img.blob, img.fileName);

          const uploadResult = await apiClient<{ url: string; key: string }>('/storage/upload', {
            method: 'POST',
            body: formData,
          });

          // If linked to a product, attach image
          if (img.productId && uploadResult.url) {
            try {
              await apiClient(`/products/${img.productId}/images`, {
                method: 'POST',
                body: JSON.stringify({
                  imageUrl: uploadResult.url,
                  isPrimary: false,
                }),
              });
            } catch (err) {
              // Product image link endpoint might be handled directly or optional
            }
          }

          await db.offlineImages.update(img.id, { status: 'UPLOADED' });
        } catch (imgErr: any) {
          await db.offlineImages.update(img.id, {
            status: 'FAILED',
            lastError: imgErr.message || 'Image upload failed',
          });
        }
      }

      // 3. Update sync timestamp metadata
      await db.syncMetadata.put({
        key: 'lastSyncedAt',
        value: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } finally {
      this.isSyncing = false;
      await this.notify();
    }

    return { success: true, synced, conflicts, failed };
  }

  /**
   * Retry a failed or conflicted outbox mutation
   */
  public async retryMutation(mutationId: string) {
    await db.outbox.update(mutationId, {
      status: 'PENDING',
      retryCount: 0,
      lastError: undefined,
    });
    await this.notify();
    if (navigator.onLine) {
      await this.syncAll();
    }
  }

  /**
   * Discard a conflicted or failed mutation explicitly chosen by the user
   */
  public async discardMutation(mutationId: string) {
    await db.outbox.delete(mutationId);
    await this.notify();
  }

  /**
   * Clear completed outbox records
   */
  public async clearCompleted(): Promise<number> {
    const completed = await db.outbox.where('status').equals('COMPLETED').toArray();
    for (const item of completed) {
      await db.outbox.delete(item.id);
    }
    await this.notify();
    return completed.length;
  }

  private async applyOptimisticLocalUpdate(
    entityType: OutboxEntityType,
    payload: any,
    clientMutationId: string,
    tempEntityId?: string,
  ) {
    const localId = tempEntityId || clientMutationId;
    const now = new Date().toISOString();

    if (entityType === 'CUSTOMER') {
      await db.customers.put({
        id: localId,
        fullName: payload.fullName,
        phone: payload.phone,
        email: payload.email,
        address: payload.address,
        notes: payload.notes,
        branchId: payload.branchId || 'local-branch',
        isPendingSync: true,
        clientMutationId,
        createdAt: now,
        updatedAt: now,
      });
    } else if (entityType === 'ORDER') {
      await db.orders.put({
        id: localId,
        orderNumber: `ORD-LOCAL-${clientMutationId.slice(0, 6).toUpperCase()}`,
        customerId: payload.customerId,
        branchId: payload.branchId || 'local-branch',
        currentStageId: payload.currentStageId || 'stage-initial',
        totalAgreedPrice: Number(payload.totalAgreedPrice),
        totalPaid: Number(payload.prepaymentAmount || 0),
        outstandingBalance: Number(payload.totalAgreedPrice) - Number(payload.prepaymentAmount || 0),
        deadlineDate: payload.deadlineDate,
        notes: payload.notes,
        items: payload.items || [],
        isPendingSync: true,
        clientMutationId,
        createdAt: now,
        updatedAt: now,
      });
    } else if (entityType === 'PAYMENT') {
      await db.payments.put({
        id: localId,
        orderId: payload.orderId,
        amount: Number(payload.amount),
        paymentType: payload.paymentType || 'PROGRESS_PAYMENT',
        paymentMethod: payload.paymentMethod || 'Cash',
        referenceNumber: payload.referenceNumber,
        paymentDate: now,
        isPendingSync: true,
        clientMutationId,
      });
    } else if (entityType === 'EXPENSE') {
      await db.expenses.put({
        id: localId,
        branchId: payload.branchId,
        category: payload.category,
        amount: Number(payload.amount),
        expenseDate: now,
        description: payload.description,
        receiptRef: payload.receiptRef,
        isPendingSync: true,
        clientMutationId,
      });
    }
  }

  private async reconcileLocalRecord(
    entityType: OutboxEntityType,
    serverResult: any,
    tempEntityId?: string,
  ) {
    if (!serverResult || !serverResult.id) return;

    if (entityType === 'CUSTOMER') {
      if (tempEntityId && tempEntityId !== serverResult.id) {
        await db.customers.delete(tempEntityId);
      }
      await db.customers.put({
        ...serverResult,
        isPendingSync: false,
      });
    } else if (entityType === 'ORDER') {
      if (tempEntityId && tempEntityId !== serverResult.id) {
        await db.orders.delete(tempEntityId);
      }
      await db.orders.put({
        ...serverResult,
        isPendingSync: false,
      });
    } else if (entityType === 'PAYMENT') {
      if (tempEntityId && tempEntityId !== serverResult.id) {
        await db.payments.delete(tempEntityId);
      }
      await db.payments.put({
        ...serverResult,
        isPendingSync: false,
      });
    } else if (entityType === 'EXPENSE') {
      if (tempEntityId && tempEntityId !== serverResult.id) {
        await db.expenses.delete(tempEntityId);
      }
      await db.expenses.put({
        ...serverResult,
        isPendingSync: false,
      });
    }
  }
}

export const syncEngine = new SyncEngine();
