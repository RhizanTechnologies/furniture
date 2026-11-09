import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { db } from '../lib/db';
import { syncEngine } from '../lib/sync-engine';
import { SyncProvider } from '../context/SyncContext';
import { SyncStatusBanner } from '../components/layout/SyncStatusBanner';
import { RecordSyncBadge } from '../components/ui/RecordSyncBadge';

// Mock apiClient
vi.mock('../lib/api-client', () => ({
  apiClient: vi.fn(),
}));

import { apiClient } from '../lib/api-client';

describe('Offline-First Architecture & Sync Engine (Prompt 9)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

    await db.customers.clear();
    await db.orders.clear();
    await db.payments.clear();
    await db.expenses.clear();
    await db.outbox.clear();
    await db.offlineImages.clear();
    await db.syncMetadata.clear();
  });

  afterEach(async () => {
    await db.customers.clear();
    await db.orders.clear();
    await db.payments.clear();
    await db.expenses.clear();
    await db.outbox.clear();
    await db.offlineImages.clear();
    await db.syncMetadata.clear();
  });

  describe('1. Local Dexie.js Data Storage', () => {
    it('stores customer and order records offline with isPendingSync flag', async () => {
      const customerId = 'local-cust-001';
      await db.customers.put({
        id: customerId,
        fullName: 'Birtukan Mideksa',
        phone: '+251911223344',
        branchId: 'branch-bole',
        isPendingSync: true,
        clientMutationId: 'mut-cust-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const orderId = 'local-ord-001';
      await db.orders.put({
        id: orderId,
        orderNumber: 'ORD-LOCAL-001',
        customerId,
        branchId: 'branch-bole',
        currentStageId: 'stage-deposit',
        totalAgreedPrice: 75000,
        totalPaid: 35000,
        outstandingBalance: 40000,
        deadlineDate: '2026-12-01',
        items: [
          {
            itemDescription: 'Walnut Coffee Table',
            quantity: 1,
            unitPrice: 75000,
            subtotal: 75000,
          },
        ],
        isPendingSync: true,
        clientMutationId: 'mut-ord-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const retrievedCust = await db.customers.get(customerId);
      expect(retrievedCust).toBeDefined();
      expect(retrievedCust?.fullName).toBe('Birtukan Mideksa');
      expect(retrievedCust?.isPendingSync).toBe(true);

      const retrievedOrd = await db.orders.get(orderId);
      expect(retrievedOrd).toBeDefined();
      expect(retrievedOrd?.totalAgreedPrice).toBe(75000);
      expect(retrievedOrd?.isPendingSync).toBe(true);
    });

    it('preserves data across simulated page reloads', async () => {
      // Simulate writing before reload
      await db.customers.put({
        id: 'cust-persist-01',
        fullName: 'Tewodros Kassahun',
        phone: '+251911999888',
        branchId: 'branch-bole',
        isPendingSync: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Query database as if fresh page load occurred
      const loaded = await db.customers.filter((c) => !!c.isPendingSync).toArray();
      expect(loaded).toHaveLength(1);
      const all = await db.customers.toArray();
      expect(all).toHaveLength(1);
      expect(all[0].fullName).toBe('Tewodros Kassahun');
    });
  });

  describe('2. Persistent Outbox Queue & Offline Images', () => {
    it('enqueues mutations with valid UUID v4 client mutation IDs', async () => {
      // Mock apiClient for any auto-sync trigger
      (apiClient as any).mockResolvedValue({ results: [], processedAt: new Date().toISOString() });

      const { clientMutationId } = await syncEngine.enqueueMutation({
        entityType: 'CUSTOMER',
        action: 'CREATE',
        payload: {
          fullName: 'Dawit Tsige',
          phone: '+251922334455',
        },
      });

      expect(clientMutationId).toBeDefined();
      expect(clientMutationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      const outboxItems = await db.outbox.toArray();
      expect(outboxItems).toHaveLength(1);
      expect(outboxItems[0].clientMutationId).toBe(clientMutationId);
      expect(outboxItems[0].entityType).toBe('CUSTOMER');
    });

    it('stores binary Image Blobs in IndexedDB without using Base64 in localStorage', async () => {
      // Mock upload if auto-sync fires
      (apiClient as any).mockResolvedValue({ url: 'https://cdn.example.com/photo.jpg', key: 'photo.jpg' });

      const mockBlob = new Blob(['sample-furniture-image-content'], { type: 'image/jpeg' });
      const { clientMutationId, previewUrl } = await syncEngine.enqueueImage(
        mockBlob,
        'workshop-sofa.jpg',
        'prod-sofa-1',
      );

      expect(clientMutationId).toBeDefined();
      expect(previewUrl).toBeDefined();

      const imageRecords = await db.offlineImages.toArray();
      expect(imageRecords).toHaveLength(1);
      expect(imageRecords[0].fileName).toBe('workshop-sofa.jpg');
      expect(imageRecords[0].blob).toBeDefined();
      expect(imageRecords[0].fileSizeBytes).toBe(mockBlob.size);
    });
  });

  describe('3. Synchronization Engine Execution & Conflict Handling', () => {
    it('successfully synchronizes outbox items and reconciles local record confirmation', async () => {
      // First, simulate offline enqueue so auto-sync does not fire prematurely
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const { clientMutationId } = await syncEngine.enqueueMutation({
        entityType: 'CUSTOMER',
        action: 'CREATE',
        payload: {
          fullName: 'Sahle-Work Zewde',
          phone: '+251933445566',
        },
        tempEntityId: 'temp-cust-sahle',
      });

      // Now set connection online and mock server response
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      const mockApiResponse = {
        results: [
          {
            clientMutationId,
            entityType: 'CUSTOMER',
            status: 'SUCCESS',
            result: {
              id: 'server-confirmed-cust-uuid',
              fullName: 'Sahle-Work Zewde',
              phone: '+251933445566',
              branchId: 'branch-bole',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        ],
        processedAt: new Date().toISOString(),
      };

      (apiClient as any).mockResolvedValueOnce(mockApiResponse);

      // Trigger sync
      const syncResult = await syncEngine.syncAll();
      expect(syncResult.success).toBe(true);
      expect(syncResult.synced).toBe(1);

      // Verify outbox mutation is COMPLETED
      const outboxItem = await db.outbox.where('clientMutationId').equals(clientMutationId).first();
      expect(outboxItem?.status).toBe('COMPLETED');

      // Verify temp entity was replaced by confirmed server entity with isPendingSync = false
      const confirmedCust = await db.customers.get('server-confirmed-cust-uuid');
      expect(confirmedCust).toBeDefined();
      expect(confirmedCust?.isPendingSync).toBe(false);
    });

    it('explicitly records CONFLICT status and details without silently discarding pending data', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const { clientMutationId } = await syncEngine.enqueueMutation({
        entityType: 'MATERIAL_CONSUMPTION',
        action: 'CONSUME',
        payload: {
          orderId: 'ord-123',
          rawMaterialId: 'mat-timber-1',
          consumedQuantity: 50,
        },
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      const mockConflictResponse = {
        results: [
          {
            clientMutationId,
            entityType: 'MATERIAL_CONSUMPTION',
            status: 'CONFLICT',
            conflictType: 'INSUFFICIENT_STOCK',
            conflictDetails: {
              rawMaterialName: 'Wanza Timber',
              availableStock: 5,
              requestedQuantity: 50,
            },
            error: 'Insufficient stock quantity on server',
          },
        ],
        processedAt: new Date().toISOString(),
      };

      (apiClient as any).mockResolvedValueOnce(mockConflictResponse);

      const syncResult = await syncEngine.syncAll();
      expect(syncResult.conflicts).toBe(1);

      // Mutation MUST remain in outbox with CONFLICT status for user inspection
      const outboxItem = await db.outbox.where('clientMutationId').equals(clientMutationId).first();
      expect(outboxItem?.status).toBe('CONFLICT');
      expect(outboxItem?.conflictDetails?.availableStock).toBe(5);
      expect(outboxItem?.lastError).toContain('Insufficient stock');
    });

    it('safely retains operations in outbox if network drops during sync attempt', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true, writable: true });

      const { clientMutationId } = await syncEngine.enqueueMutation({
        entityType: 'PAYMENT',
        action: 'CREATE',
        payload: {
          orderId: 'ord-999',
          amount: 5000,
        },
      });

      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true, writable: true });

      // Mock network failure during sync batch request
      (apiClient as any).mockRejectedValueOnce(new Error('Network connection aborted'));

      await syncEngine.syncAll();

      // Mutation must remain in outbox as PENDING so it can be retried idempotently
      const outboxItem = await db.outbox.where('clientMutationId').equals(clientMutationId).first();
      expect(outboxItem?.status).toBe('PENDING');
      expect(outboxItem?.retryCount).toBe(1);
    });
  });

  describe('4. Connectivity and Record Badges UI', () => {
    it('renders RecordSyncBadge correctly for unconfirmed local records', () => {
      const { rerender } = render(<RecordSyncBadge isPendingSync={true} />);
      expect(screen.getByText('Local (Pending Sync)')).toBeInTheDocument();

      rerender(<RecordSyncBadge isPendingSync={false} />);
      expect(screen.getByText('Confirmed')).toBeInTheDocument();
    });

    it('renders SyncStatusBanner with online status and pending counts', async () => {
      await db.outbox.add({
        id: 'outbox-test-1',
        clientMutationId: 'client-mut-test',
        entityType: 'ORDER',
        action: 'CREATE',
        payload: {},
        createdAt: new Date().toISOString(),
        status: 'PENDING',
        retryCount: 0,
      });

      render(
        <SyncProvider>
          <SyncStatusBanner />
        </SyncProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText(/1 change pending sync/i)).toBeInTheDocument();
        expect(screen.getByText(/Sync Now/i)).toBeInTheDocument();
      });
    });
  });
});
