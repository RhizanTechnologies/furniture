import { UserRole, StockMode } from '../enums/index.js';

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
