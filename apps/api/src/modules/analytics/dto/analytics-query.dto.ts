import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Branch ID (Owner only)' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({
    description: 'Reporting period interval',
    enum: ['daily', 'weekly', 'monthly', 'all'],
    default: 'monthly',
  })
  @IsOptional()
  @IsString()
  period?: 'daily' | 'weekly' | 'monthly' | 'all';

  @ApiPropertyOptional({ description: 'Start date ISO string' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date ISO string' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
