import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CustomerQueryDto {
  @ApiPropertyOptional({ description: 'Filter by registered branch ID' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Search by full name or phone number' })
  @IsOptional()
  @IsString()
  search?: string;
}
