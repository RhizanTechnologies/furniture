import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SyncEntityType {
  CUSTOMER = 'CUSTOMER',
  ORDER = 'ORDER',
  ORDER_STAGE_ADVANCE = 'ORDER_STAGE_ADVANCE',
  PAYMENT = 'PAYMENT',
  EXPENSE = 'EXPENSE',
  MATERIAL_CONSUMPTION = 'MATERIAL_CONSUMPTION',
  PRODUCT_IMAGE = 'PRODUCT_IMAGE',
}

export enum SyncAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  CONSUME = 'CONSUME',
}

export class SyncOperationDto {
  @ApiProperty({ description: 'Stable client-generated UUID v4' })
  @IsString()
  @IsNotEmpty()
  clientMutationId!: string;

  @ApiProperty({ enum: SyncEntityType })
  @IsEnum(SyncEntityType)
  entityType!: SyncEntityType;

  @ApiProperty({ enum: SyncAction })
  @IsEnum(SyncAction)
  action!: SyncAction;

  @ApiProperty({ description: 'Payload data required for the operation' })
  @IsObject()
  payload!: Record<string, any>;

  @ApiPropertyOptional({ description: 'Client creation timestamp' })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiPropertyOptional({ description: 'Temporary client entity ID used for dependency resolution' })
  @IsOptional()
  @IsString()
  tempEntityId?: string;
}

export class SyncBatchDto {
  @ApiProperty({ type: [SyncOperationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOperationDto)
  operations!: SyncOperationDto[];
}
