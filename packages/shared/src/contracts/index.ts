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
