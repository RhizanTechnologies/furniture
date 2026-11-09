import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRawMaterialDto {
  @ApiPropertyOptional({ example: 'Solid Wanza Hardwood Premium', description: 'Updated material name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'Timber', description: 'Updated category' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'Meter', description: 'Updated unit of measurement' })
  @IsString()
  @IsOptional()
  unitOfMeasurement?: string;

  @ApiPropertyOptional({ example: 15.0, description: 'Updated low stock reorder alert quantity' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  reorderAlertQuantity?: number;

  @ApiPropertyOptional({ example: true, description: 'Active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
