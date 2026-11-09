import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeOrderStageDto } from './dto/change-stage.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrderDto, ApiResponse as ApiEnvelope } from '@furniture/shared';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders with multi-criteria filtering' })
  @ApiResponse({ status: 200, description: 'Order list retrieved' })
  async listOrders(
    @Query() query: OrderQueryDto,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<OrderDto[]>> {
    const orders = await this.ordersService.listOrders(query, user);
    return {
      success: true,
      data: orders,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create order with items and initial prepayment' })
  @ApiResponse({ status: 201, description: 'Order successfully created with prepayment and stage history' })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<OrderDto>> {
    const order = await this.ordersService.createOrder(dto, user);
    return {
      success: true,
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details, financial balances, and complete stage history' })
  @ApiResponse({ status: 200, description: 'Order details retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden if branch admin accesses another branch order' })
  async getOrder(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<OrderDto>> {
    const order = await this.ordersService.getOrder(id, user);
    return {
      success: true,
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update order deadline or notes' })
  @ApiResponse({ status: 200, description: 'Order updated' })
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<OrderDto>> {
    const order = await this.ordersService.updateOrder(id, dto, user);
    return {
      success: true,
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(':id/stage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Advance order to a new stage and record immutable transition log' })
  @ApiResponse({ status: 200, description: 'Order stage advanced' })
  async changeStage(
    @Param('id') id: string,
    @Body() dto: ChangeOrderStageDto,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<OrderDto>> {
    const order = await this.ordersService.changeOrderStage(id, dto, user);
    return {
      success: true,
      data: order,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
