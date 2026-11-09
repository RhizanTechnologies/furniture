import { UserRole, StockMode, PaymentType } from '../enums/index.js';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    path: string;
  };
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  branchId?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface BranchDto {
  id: string;
  name: string;
  code: string;
  address: string;
  phone?: string | null;
  stockMode: StockMode;
  isActive: boolean;
  admin?: UserDto | null;
  createdAt: string;
}

export interface CustomerDto {
  id: string;
  branchId: string;
  fullName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  ordersCount?: number;
  totalSpent?: number;
  outstandingBalance?: number;
}

export interface CreateCustomerDto {
  fullName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  branchId?: string; // Optional for branch admin (defaults to their branch)
}

export interface UpdateCustomerDto {
  fullName?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface OrderStageDto {
  id: string;
  name: string;
  color: string;
  sequenceOrder: number;
  isFinalStage: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderStageDto {
  name: string;
  color?: string;
  sequenceOrder?: number;
  isFinalStage?: boolean;
}

export interface UpdateOrderStageDto {
  name?: string;
  color?: string;
  sequenceOrder?: number;
  isFinalStage?: boolean;
  isActive?: boolean;
}

export interface OrderItemDto {
  id: string;
  orderId: string;
  productId?: string | null;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderStageHistoryDto {
  id: string;
  orderId: string;
  fromStageId?: string | null;
  toStageId: string;
  changedByUserId: string;
  changedByUserName?: string;
  fromStageName?: string | null;
  toStageName: string;
  notes?: string | null;
  changedAt: string;
}

export interface OrderDto {
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
  createdAt: string;
  updatedAt: string;
  customer?: CustomerDto;
  branch?: BranchDto;
  currentStage?: OrderStageDto;
  items?: OrderItemDto[];
  stageHistories?: OrderStageHistoryDto[];
}

export interface CreateOrderItemInput {
  productId?: string | null;
  itemDescription: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderDto {
  customerId: string;
  branchId?: string; // Derived on server for branch admin
  items: CreateOrderItemInput[];
  totalAgreedPrice: number;
  prepaymentAmount: number;
  deadlineDate: string;
  currentStageId?: string;
  notes?: string | null;
  paymentMethod?: string;
}

export interface ChangeOrderStageDto {
  toStageId: string;
  notes?: string | null;
}

export interface ProductImageDto {
  id: string;
  productId: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  isPrimary: boolean;
  fileSizeBytes: number;
  mimeType: string;
  sortOrder: number;
  createdAt: string;
}

export interface ProductDto {
  id: string;
  sku: string;
  name: string;
  category: string;
  description?: string | null;
  dimensions?: string | null;
  basePrice: number;
  estimatedProductionDays?: number | null;
  isActive: boolean;
  images: ProductImageDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  sku: string;
  name: string;
  category: string;
  description?: string | null;
  dimensions?: string | null;
  basePrice: number;
  estimatedProductionDays?: number | null;
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  category?: string;
  description?: string | null;
  dimensions?: string | null;
  basePrice?: number;
  estimatedProductionDays?: number | null;
  isActive?: boolean;
}

export interface AssignBranchAdminDto {
  email: string;
  fullName: string;
  password?: string;
  phone?: string | null;
}

export interface UpdateBranchDto {
  name?: string;
  address?: string;
  phone?: string | null;
  isActive?: boolean;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  database: 'connected' | 'disconnected';
  uptimeSeconds: number;
}

export interface RawMaterialDto {
  id: string;
  code: string;
  name: string;
  category: string;
  unitOfMeasurement: string;
  currentStockQuantity: number;
  currentUnitCost: number;
  stockValue: number;
  reorderAlertQuantity?: number | null;
  isLowStock: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRawMaterialDto {
  code: string;
  name: string;
  category: string;
  unitOfMeasurement: string;
  initialStockQuantity?: number;
  initialUnitCost?: number;
  reorderAlertQuantity?: number | null;
}

export interface UpdateRawMaterialDto {
  name?: string;
  category?: string;
  unitOfMeasurement?: string;
  reorderAlertQuantity?: number | null;
  isActive?: boolean;
}

export interface MaterialStockInDto {
  id: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialCode: string;
  unitOfMeasurement: string;
  branchId?: string | null;
  branchName?: string | null;
  receivedQuantity: number;
  unitCost: number;
  totalCost: number;
  supplierInvoiceRef?: string | null;
  receivedDate: string;
  recordedByUserName: string;
  recordedByUserId: string;
}

export interface CreateMaterialStockInDto {
  rawMaterialId: string;
  branchId?: string | null;
  receivedQuantity: number;
  unitCost: number;
  supplierInvoiceRef?: string | null;
  receivedDate?: string;
}

export interface MaterialConsumptionDto {
  id: string;
  orderId: string;
  orderNumber: string;
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialCode: string;
  unitOfMeasurement: string;
  branchId?: string | null;
  branchName?: string | null;
  consumedQuantity: number;
  unitCostAllocated: number;
  totalMaterialCost: number;
  consumedAt: string;
  recordedByUserName: string;
  recordedByUserId: string;
}

export interface CreateMaterialConsumptionDto {
  orderId: string;
  rawMaterialId: string;
  branchId?: string | null;
  consumedQuantity: number;
  unit?: string | null;
  notes?: string | null;
}

export interface StockValuationCategorySummary {
  category: string;
  itemCount: number;
  totalQuantity: number;
  totalStockValue: number;
}

export interface StockValuationDto {
  totalStockValue: number;
  totalItemsInStock: number;
  lowStockCount: number;
  stockLocation: string;
  categories: StockValuationCategorySummary[];
  materials: RawMaterialDto[];
}

export interface OrderMaterialCostDto {
  orderId: string;
  orderNumber: string;
  totalAgreedPrice: number;
  totalMaterialCost: number;
  grossProfit: number;
  grossMarginPercentage: number;
  consumptions: MaterialConsumptionDto[];
}

export interface PaymentDto {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  paymentType: PaymentType;
  paymentMethod: string;
  referenceNumber?: string | null;
  paymentDate: string;
  recordedByUserName: string;
  recordedByUserId: string;
  idempotencyKey?: string | null;
}

export interface CreatePaymentDto {
  orderId: string;
  amount: number;
  paymentType?: PaymentType;
  paymentMethod?: string;
  referenceNumber?: string | null;
  paymentDate?: string;
  idempotencyKey?: string | null;
}

export interface ExpenseDto {
  id: string;
  branchId?: string | null;
  branchName?: string | null;
  category: string;
  amount: number;
  expenseDate: string;
  description: string;
  receiptRef?: string | null;
  recordedByUserName: string;
  recordedByUserId: string;
  idempotencyKey?: string | null;
}

export interface CreateExpenseDto {
  branchId?: string | null;
  category: string;
  amount: number;
  description: string;
  expenseDate?: string;
  receiptRef?: string | null;
  idempotencyKey?: string | null;
}

export interface BranchFinancialContribution {
  branchId: string;
  branchName: string;
  totalOrdersValue: number;
  totalCashCollected: number;
  totalExpenses: number;
  netContribution: number;
}

export interface FinancialSummaryDto {
  period: string;
  totalContractedRevenue: number;
  totalEarnedRevenue: number;
  totalCashCollected: number;
  totalReceivables: number;
  totalMaterialCost: number;
  totalOperatingExpenses: number;
  grossProfit: number;
  grossMarginPercentage: number;
  netProfit: number;
  netMarginPercentage: number;
  branchBreakdown: BranchFinancialContribution[];
}
