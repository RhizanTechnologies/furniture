import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { StockMode } from '@furniture/shared';

export class CreateBranchDto {
  @ApiProperty({ example: 'Bole Showroom & Workshop' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'BR-BOLE' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  code!: string;

  @ApiProperty({ example: 'Bole Subcity, Next to Edna Mall, Addis Ababa' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  address!: string;

  @ApiPropertyOptional({ example: '+251911223344' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: StockMode, default: StockMode.MAIN_STOCK })
  @IsEnum(StockMode)
  stockMode!: StockMode;
}
