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

export const createCustomerSchema = z.object({
  fullName: z.string().min(2, 'Customer name is required'),
  phone: z.string().min(7, 'Phone number must be at least 7 characters'),
  email: z.string().email('Valid email is required').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  branchId: z.string().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z.object({
  fullName: z.string().min(2, 'Customer name is required').optional(),
  phone: z.string().min(7, 'Phone number must be at least 7 characters').optional(),
  email: z.string().email('Valid email is required').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const createOrderStageSchema = z.object({
  name: z.string().min(2, 'Stage name is required'),
  color: z.string().default('#8B5A2B'),
  sequenceOrder: z.coerce.number().int().min(1).default(1),
  isFinalStage: z.boolean().default(false),
});

export type CreateOrderStageInput = z.infer<typeof createOrderStageSchema>;

export const updateOrderStageSchema = z.object({
  name: z.string().min(2, 'Stage name is required').optional(),
  color: z.string().optional(),
  sequenceOrder: z.coerce.number().int().min(1).optional(),
  isFinalStage: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateOrderStageInput = z.infer<typeof updateOrderStageSchema>;

export const orderItemInputSchema = z.object({
  productId: z.string().optional().nullable(),
  itemDescription: z.string().min(2, 'Item description is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.coerce.number().positive('Unit price must be positive'),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer selection is required'),
  branchId: z.string().optional(),
  items: z.array(orderItemInputSchema).min(1, 'Order must include at least one item'),
  totalAgreedPrice: z.coerce.number().positive('Agreed total price must be greater than 0'),
  prepaymentAmount: z.coerce.number().min(0, 'Prepayment cannot be negative'),
  deadlineDate: z.string().min(1, 'Target deadline date is required'),
  currentStageId: z.string().optional(),
  notes: z.string().optional().nullable(),
  paymentMethod: z.string().default('Cash'),
}).refine(
  (data) => data.prepaymentAmount <= data.totalAgreedPrice,
  {
    message: 'Prepayment cannot exceed the total agreed price',
    path: ['prepaymentAmount'],
  }
);

export type CreateOrderFormInput = z.infer<typeof createOrderSchema>;

export const changeOrderStageSchema = z.object({
  toStageId: z.string().min(1, 'Target stage is required'),
  notes: z.string().optional().nullable(),
});

export type ChangeOrderStageInput = z.infer<typeof changeOrderStageSchema>;

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

