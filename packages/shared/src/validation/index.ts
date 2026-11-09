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
