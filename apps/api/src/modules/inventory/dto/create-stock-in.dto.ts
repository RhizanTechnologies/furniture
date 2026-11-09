import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStockInDto {
  @ApiProperty({ example: 'b39178ad-b6f7-4db4-a690-349be88a1a2b', description: 'Raw material ID' })
  @IsString()
  @IsNotEmpty()
  rawMaterialId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Branch ID (omit or null for MAIN_STOCK warehouse pool)',
  })
  @IsString()
  @IsOptional()
  branchId?: string | null;

  @ApiProperty({ example: 25.5, description: 'Quantity received' })
  @IsNumber()
  @IsPositive({ message: 'Received quantity must be positive' })
  @Type(() => Number)
  receivedQuantity: number;

  @ApiProperty({ example: 450.0, description: 'Unit purchase cost in ETB' })
  @IsNumber()
  @Min(0, { message: 'Unit cost cannot be negative' })
  @Type(() => Number)
  unitCost: number;

  @ApiPropertyOptional({ example: 'INV-2026-089', description: 'Supplier invoice reference' })
  @IsString()
  @IsOptional()
  supplierInvoiceRef?: string | null;

  @ApiPropertyOptional({ example: '2026-11-09T10:00:00.000Z', description: 'Received timestamp' })
  @IsString()
  @IsOptional()
  receivedDate?: string;
}
