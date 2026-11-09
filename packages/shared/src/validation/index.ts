import { z } from 'zod';
import { UserRole, StockMode } from '../enums/index.js';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createBranchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters'),
  code: z.string().min(2, 'Branch code must be at least 2 characters').toUpperCase(),
  address: z.string().min(3, 'Address is required'),
  phone: z.string().optional().nullable(),
  stockMode: z.nativeEnum(StockMode)
});

export type CreateBranchInput = z.infer<typeof createBranchSchema>;

export const updateBranchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters').optional(),
  address: z.string().min(3, 'Address is required').optional(),
  phone: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateBranchInput = z.infer<typeof updateBranchSchema>;

export const createProductSchema = z.object({
  sku: z.string().min(2, 'SKU code must be at least 2 characters').toUpperCase(),
  name: z.string().min(2, 'Product name is required'),
  category: z.string().min(2, 'Category is required'),
  description: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  basePrice: z.coerce.number().positive('Base price must be greater than 0'),
  estimatedProductionDays: z.coerce.number().int().min(1, 'Lead days must be at least 1 day').optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  name: z.string().min(2, 'Product name is required').optional(),
  category: z.string().min(2, 'Category is required').optional(),
  description: z.string().optional().nullable(),
  dimensions: z.string().optional().nullable(),
  basePrice: z.coerce.number().positive('Base price must be greater than 0').optional(),
  estimatedProductionDays: z.coerce.number().int().min(1).optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const assignBranchAdminSchema = z.object({
  email: z.string().email('Valid email is required'),
  fullName: z.string().min(2, 'Full name is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  phone: z.string().optional().nullable(),
});

export type AssignBranchAdminInput = z.infer<typeof assignBranchAdminSchema>;

