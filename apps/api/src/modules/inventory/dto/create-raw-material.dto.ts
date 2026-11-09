import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRawMaterialDto {
  @ApiProperty({ example: 'MAT-WNZ-001', description: 'Unique material code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Solid Wanza Hardwood Timber', description: 'Material name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Timber', description: 'Material category' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Meter', description: 'Unit of measurement (Meter, Sqm, Sheet, Piece, Liter, Kg)' })
  @IsString()
  @IsNotEmpty()
  unitOfMeasurement: string;

  @ApiPropertyOptional({ example: 50.0, description: 'Initial stock quantity on hand' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  initialStockQuantity?: number;

  @ApiPropertyOptional({ example: 450.0, description: 'Initial purchase unit cost in ETB' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  initialUnitCost?: number;

  @ApiPropertyOptional({ example: 10.0, description: 'Low stock reorder threshold' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  reorderAlertQuantity?: number;
}
