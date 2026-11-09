import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @ApiPropertyOptional({ example: '2026-11-30T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  deadlineDate?: string;

  @ApiPropertyOptional({ example: 'Updated instructions for timber finish' })
  @IsOptional()
  @IsString()
  notes?: string;
}
