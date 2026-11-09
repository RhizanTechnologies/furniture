import Dexie, { type Table } from 'dexie';

export type OutboxStatus = 'PENDING' | 'SYNCING' | 'COMPLETED' | 'FAILED' | 'CONFLICT';
export type OutboxEntityType =
  | 'CUSTOMER'
  | 'ORDER'
  | 'ORDER_STAGE_ADVANCE'
  | 'PAYMENT'
  | 'EXPENSE'
  | 'MATERIAL_CONSUMPTION'
  | 'PRODUCT_IMAGE';
export type OutboxAction = 'CREATE' | 'UPDATE' | 'CONSUME';

export interface OutboxMutation {
  id: string; // Unique UUID
  clientMutationId: string; // Stable UUID v4
  entityType: OutboxEntityType;
  action: OutboxAction;
  payload: any;
  createdAt: string;
  status: OutboxStatus;
  retryCount: number;
  lastError?: string;
  conflictDetails?: any;
  tempEntityId?: string;
}

export interface OfflineImageRecord {
  id: string;
  clientMutationId: string;
  productId?: string;
  blob: Blob;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  createdAt: string;
  status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  lastError?: string;
}

export interface LocalCustomer {
  id: string;
  fullName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  branchId: string;
  isPendingSync?: boolean;
  clientMutationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalOrderItem {
  id?: string;
  productId?: string | null;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface LocalOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  branchId: string;
  currentStageId: string;
  totalAgreedPrice: number;
  totalPaid: number;
  outstandingBalance: number;
  deadlineDate: string;
  notes?: string | null;
  items: LocalOrderItem[];
  isPendingSync?: boolean;
  clientMutationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  basePrice: number;
  description?: string | null;
  isActive: boolean;
  images?: any[];
  createdAt: string;
}

export interface LocalRawMaterial {
  id: string;
  code: string;
  name: string;
  category: string;
  unitOfMeasurement: string;
  currentStockQuantity: number;
  currentUnitCost: number;
  isActive: boolean;
}

export interface LocalOrderStage {
  id: string;
  name: string;
  colorHex: string;
  sequenceOrder: number;
  isActive: boolean;
}

export interface LocalPayment {
  id: string;
  orderId: string;
  amount: number;
  paymentType: string;
  paymentMethod: string;
  referenceNumber?: string | null;
  paymentDate: string;
  isPendingSync?: boolean;
  clientMutationId?: string;
}

export interface LocalExpense {
  id: string;
  branchId?: string | null;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  receiptRef?: string | null;
  isPendingSync?: boolean;
  clientMutationId?: string;
}

export interface SyncMetadata {
  key: string;
  value: any;
  updatedAt: string;
}

export class FurnitureERPDatabase extends Dexie {
  customers!: Table<LocalCustomer, string>;
  orders!: Table<LocalOrder, string>;
  products!: Table<LocalProduct, string>;
  rawMaterials!: Table<LocalRawMaterial, string>;
  orderStages!: Table<LocalOrderStage, string>;
  payments!: Table<LocalPayment, string>;
  expenses!: Table<LocalExpense, string>;
  outbox!: Table<OutboxMutation, string>;
  offlineImages!: Table<OfflineImageRecord, string>;
  syncMetadata!: Table<SyncMetadata, string>;

  constructor() {
    super('FurnitureERP_OfflineDB');
    this.version(1).stores({
      customers: 'id, phone, branchId',
      orders: 'id, orderNumber, customerId, branchId, currentStageId, createdAt',
      products: 'id, name, sku, category',
      rawMaterials: 'id, code, name, category',
      orderStages: 'id, sequenceOrder',
      payments: 'id, orderId, paymentDate',
      expenses: 'id, branchId, expenseDate',
      outbox: 'id, clientMutationId, entityType, status, createdAt',
      offlineImages: 'id, clientMutationId, productId, status, createdAt',
      syncMetadata: 'key, updatedAt',
    });
  }
}

export const db = new FurnitureERPDatabase();
