import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateBranchDto {
  @ApiPropertyOptional({ example: 'Bole Flagship Showroom' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'Bole Medhanialem Street, Addis Ababa' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  address?: string;

  @ApiPropertyOptional({ example: '+251911998877' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
