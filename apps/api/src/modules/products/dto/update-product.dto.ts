import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Grand Wanza Dining Table (8-Seater)' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Dining Room' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '240cm x 110cm x 76cm' })
  @IsOptional()
  @IsString()
  dimensions?: string;

  @ApiPropertyOptional({ example: 88000.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  basePrice?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  estimatedProductionDays?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: ['uuid-1'], description: 'Branch location IDs stocking/displaying this piece' })
  @IsOptional()
  @IsString({ each: true })
  branchIds?: string[];
}
