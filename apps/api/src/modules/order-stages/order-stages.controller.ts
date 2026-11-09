import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrderStagesService } from './order-stages.service';
import { CreateOrderStageDto } from './dto/create-order-stage.dto';
import { UpdateOrderStageDto } from './dto/update-order-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, OrderStageDto, ApiResponse as ApiEnvelope } from '@furniture/shared';

@ApiTags('Custom Order Stages')
@Controller('order-stages')
@UseGuards(AuthGuard, RolesGuard)
export class OrderStagesController {
  constructor(private readonly orderStagesService: OrderStagesService) {}

  @Get()
  @ApiOperation({ summary: 'List custom order stages in sequence pipeline order' })
  @ApiResponse({ status: 200, description: 'Order stages retrieved' })
  async listStages(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<ApiEnvelope<OrderStageDto[]>> {
    const stages = await this.orderStagesService.listStages(includeInactive === 'true');
    return {
      success: true,
      data: stages,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new order stage (Owner only)' })
  @ApiResponse({ status: 201, description: 'Order stage created' })
  async createStage(@Body() dto: CreateOrderStageDto): Promise<ApiEnvelope<OrderStageDto>> {
    const stage = await this.orderStagesService.createStage(dto);
    return {
      success: true,
      data: stage,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update an order stage (Owner only)' })
  @ApiResponse({ status: 200, description: 'Order stage updated' })
  async updateStage(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStageDto,
  ): Promise<ApiEnvelope<OrderStageDto>> {
    const stage = await this.orderStagesService.updateStage(id, dto);
    return {
      success: true,
      data: stage,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an unused order stage (Owner only)' })
  @ApiResponse({ status: 200, description: 'Stage deleted' })
  @ApiResponse({ status: 409, description: 'Cannot delete stage with existing orders' })
  async deleteStage(@Param('id') id: string): Promise<ApiEnvelope<{ message: string }>> {
    await this.orderStagesService.deleteStage(id);
    return {
      success: true,
      data: { message: 'Order stage deleted successfully' },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('reorder')
  @Roles(UserRole.OWNER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder stage pipeline sequence (Owner only)' })
  @ApiResponse({ status: 200, description: 'Stages reordered successfully' })
  async reorderStages(@Body() dto: ReorderStagesDto): Promise<ApiEnvelope<OrderStageDto[]>> {
    const stages = await this.orderStagesService.reorderStages(dto);
    return {
      success: true,
      data: stages,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
