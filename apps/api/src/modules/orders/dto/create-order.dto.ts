import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDtoInput {
  @ApiPropertyOptional({ example: 'prod-uuid' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ example: 'Grand Wanza Dining Table (Custom 260cm length)' })
  @IsString()
  @IsNotEmpty()
  itemDescription!: string;

  @ApiProperty({ example: 1, default: 1 })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ example: 85000.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  unitPrice!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 'customer-uuid' })
  @IsString()
  @IsNotEmpty()
  customerId!: string;

  @ApiPropertyOptional({ example: 'branch-uuid' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ type: [OrderItemDtoInput] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDtoInput)
  items!: OrderItemDtoInput[];

  @ApiProperty({ example: 85000.0, description: 'Authoritative agreed total contract price' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  totalAgreedPrice!: number;

  @ApiProperty({ example: 45000.0, description: 'Initial deposit / prepayment' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  prepaymentAmount!: number;

  @ApiProperty({ example: '2026-11-25T00:00:00.000Z', description: 'Promised delivery date' })
  @IsDateString()
  deadlineDate!: string;

  @ApiPropertyOptional({ example: 'stage-uuid', description: 'Initial stage (defaults to sequence 1)' })
  @IsOptional()
  @IsString()
  currentStageId?: string;

  @ApiPropertyOptional({ example: 'Customer requested dark walnut stain finish' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Bank Transfer', default: 'Cash' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
