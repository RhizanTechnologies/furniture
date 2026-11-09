import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class InventoryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by search term (code or name)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by category (Timber, Fabric, Foam, Hardware, Finish)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Include inactive materials' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeInactive?: boolean;

  @ApiPropertyOptional({ description: 'Filter to only low stock items' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyLowStock?: boolean;

  @ApiPropertyOptional({ description: 'Filter by branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
