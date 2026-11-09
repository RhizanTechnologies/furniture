import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Almaz Ayana' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName!: string;

  @ApiProperty({ example: '+251911445566' })
  @IsString()
  @IsNotEmpty()
  @MinLength(7)
  phone!: string;

  @ApiPropertyOptional({ example: 'almaz@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Bole Subcity, Woreda 03, Addis Ababa' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Referred by interior designer' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'uuid-branch-id', description: 'Branch where customer registered (defaults to caller branch)' })
  @IsOptional()
  @IsString()
  branchId?: string;
}
