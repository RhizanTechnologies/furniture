import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class AssignBranchAdminDto {
  @ApiProperty({ example: 'admin.bole@furniture.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Solomon Bekele' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  fullName!: string;

  @ApiPropertyOptional({ example: 'Admin@123456', description: 'Required when creating a new user' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '+251922334455' })
  @IsOptional()
  @IsString()
  phone?: string;
}
