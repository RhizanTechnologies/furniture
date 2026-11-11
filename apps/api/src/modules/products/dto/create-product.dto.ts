import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-TAB-001', description: 'Unique furniture SKU' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  sku!: string;

  @ApiProperty({ example: 'Grand Wanza Dining Table (8-Seater)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'Dining Room' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ example: 'Handcrafted solid Wanza wood table with natural oil finish' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '240cm x 110cm x 76cm' })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiProperty({ example: 85000.0, description: 'Base selling price in ETB' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice!: number;

  @ApiPropertyOptional({ example: 7, description: 'Standard estimated production lead days' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  estimatedProductionDays?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: ['uuid-1', 'uuid-2'], description: 'Branch location IDs stocking/displaying this piece' })
  @IsOptional()
  @IsString({ each: true })
  branchIds?: string[];
}
