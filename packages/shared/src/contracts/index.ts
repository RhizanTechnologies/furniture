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

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  database: 'connected' | 'disconnected';
  uptimeSeconds: number;
}
