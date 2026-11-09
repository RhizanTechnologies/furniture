import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsPositive, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from '@furniture/shared';

export class CreatePaymentDto {
  @ApiProperty({ example: 'd39178ad-b6f7-4db4-a690-349be88a1a2b', description: 'Order ID' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ example: 15000.0, description: 'Payment amount in ETB' })
  @IsNumber()
  @IsPositive({ message: 'Payment amount must be positive' })
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ enum: PaymentType, default: PaymentType.PROGRESS_PAYMENT, description: 'Payment type' })
  @IsEnum(PaymentType)
  @IsOptional()
  paymentType?: PaymentType;

  @ApiPropertyOptional({ example: 'Cash', default: 'Cash', description: 'Payment method (Cash, Bank Transfer, Telebirr, CBE Birr)' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 'REC-2026-0044', description: 'Receipt or bank transaction reference number' })
  @IsString()
  @IsOptional()
  referenceNumber?: string;

  @ApiPropertyOptional({ example: '2026-11-09T10:00:00.000Z', description: 'Payment timestamp' })
  @IsString()
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional({ example: 'mutation-uuid-v4', description: 'Idempotency key for offline sync and duplicate prevention' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
