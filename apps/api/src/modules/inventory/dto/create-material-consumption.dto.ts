import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateMaterialConsumptionDto {
  @ApiProperty({ example: 'b39178ad-b6f7-4db4-a690-349be88a1a2b', description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 'c49178ad-b6f7-4db4-a690-349be88a1a3c', description: 'Raw material ID' })
  @IsString()
  @IsNotEmpty()
  rawMaterialId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Branch ID (defaults to order branch or central stock)',
  })
  @IsString()
  @IsOptional()
  branchId?: string | null;

  @ApiProperty({ example: 4.5, description: 'Quantity consumed for the order' })
  @IsNumber()
  @IsPositive({ message: 'Consumed quantity must be positive' })
  @Type(() => Number)
  consumedQuantity: number;

  @ApiPropertyOptional({
    example: 'centimeter',
    description: 'Unit of input quantity if different from material base unit (will be converted)',
  })
  @IsString()
  @IsOptional()
  unit?: string | null;

  @ApiPropertyOptional({ example: 'Used for dining table legs and top framing', description: 'Usage notes' })
  @IsString()
  @IsOptional()
  notes?: string | null;
}
