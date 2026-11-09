import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class StageOrderItem {
  @ApiProperty({ example: 'stage-uuid' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  sequenceOrder!: number;
}

export class ReorderStagesDto {
  @ApiProperty({ type: [StageOrderItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StageOrderItem)
  stages!: StageOrderItem[];
}
