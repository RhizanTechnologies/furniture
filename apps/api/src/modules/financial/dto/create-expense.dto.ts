import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExpenseDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Branch ID (omit or null for enterprise-wide owner overhead)',
  })
  @IsString()
  @IsOptional()
  branchId?: string | null;

  @ApiProperty({ example: 'Workshop Supplies', description: 'Expense category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 4500.0, description: 'Expense amount in ETB' })
  @IsNumber()
  @IsPositive({ message: 'Expense amount must be positive' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({ example: 'Sanding belts, protective gloves and saw blades replacement', description: 'Description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'RCP-EXP-901', description: 'Receipt voucher reference' })
  @IsString()
  @IsOptional()
  receiptRef?: string;

  @ApiPropertyOptional({ example: '2026-11-09T10:00:00.000Z', description: 'Expense date' })
  @IsString()
  @IsOptional()
  expenseDate?: string;

  @ApiPropertyOptional({ example: 'mutation-uuid-v4', description: 'Idempotency key for offline sync and duplicate prevention' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
