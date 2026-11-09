import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ChangeOrderStageDto {
  @ApiProperty({ example: 'stage-uuid', description: 'Target stage ID to advance to' })
  @IsString()
  @IsNotEmpty()
  toStageId!: string;

  @ApiPropertyOptional({ example: 'Framing completed. Moving to sanding and polishing.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
