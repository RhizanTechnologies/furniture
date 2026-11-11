import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { CreateStockInDto } from './dto/create-stock-in.dto';
import { CreateMaterialConsumptionDto } from './dto/create-material-consumption.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UserRole,
  RawMaterialDto,
  MaterialStockInDto,
  MaterialConsumptionDto,
  StockValuationDto,
  OrderMaterialCostDto,
  ApiResponse as ApiEnvelope,
} from '@furniture/shared';

@ApiTags('Inventory, Raw Materials & Costing')
@Controller('inventory')
@UseGuards(AuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('materials')
  @ApiOperation({ summary: 'List raw materials with current stock, WAC unit cost and valuations' })
  @ApiResponse({ status: 200, description: 'Raw materials retrieved' })
  async listMaterials(
    @Query() query: InventoryQueryDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<RawMaterialDto[]>> {
    const materials = await this.inventoryService.listMaterials(query, req.user);
    return {
      success: true,
      data: materials,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('materials/:id')
  @ApiOperation({ summary: 'Get raw material details with stock-in and consumption history' })
  @ApiResponse({ status: 200, description: 'Material details retrieved' })
  @ApiResponse({ status: 404, description: 'Material not found' })
  async getMaterial(
    @Param('id') id: string,
    @Req() req?: any,
  ): Promise<ApiEnvelope<RawMaterialDto & { stockIns: MaterialStockInDto[]; consumptions: MaterialConsumptionDto[] }>> {
    const material = await this.inventoryService.getMaterial(id, req?.user);
    return {
      success: true,
      data: material,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('materials')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create new raw material definition (Owner only)' })
  @ApiResponse({ status: 201, description: 'Raw material created' })
  async createMaterial(
    @Body() dto: CreateRawMaterialDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<RawMaterialDto>> {
    const material = await this.inventoryService.createMaterial(dto, req.user);
    return {
      success: true,
      data: material,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Put('materials/:id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update raw material metadata (Owner only)' })
  @ApiResponse({ status: 200, description: 'Raw material updated' })
  async updateMaterial(
    @Param('id') id: string,
    @Body() dto: UpdateRawMaterialDto,
  ): Promise<ApiEnvelope<RawMaterialDto>> {
    const updated = await this.inventoryService.updateMaterial(id, dto);
    return {
      success: true,
      data: updated,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('stock-in')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record replenishment batch (stock-in) with automatic WAC recalculation' })
  @ApiResponse({ status: 201, description: 'Stock-in recorded successfully' })
  async recordStockIn(
    @Body() dto: CreateStockInDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<MaterialStockInDto>> {
    const stockIn = await this.inventoryService.recordStockIn(dto, req.user);
    return {
      success: true,
      data: stockIn,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('stock-ins')
  @ApiOperation({ summary: 'List historical stock-in purchase batches' })
  @ApiResponse({ status: 200, description: 'Stock-ins retrieved' })
  async listStockIns(
    @Req() req: any,
    @Query('rawMaterialId') rawMaterialId?: string,
    @Query('branchId') branchId?: string,
  ): Promise<ApiEnvelope<MaterialStockInDto[]>> {
    const effectiveBranchId =
      req.user?.role === UserRole.BRANCH_ADMIN ? req.user.branchId : branchId;
    const stockIns = await this.inventoryService.listStockIns(rawMaterialId, effectiveBranchId);
    return {
      success: true,
      data: stockIns,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('consumption')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record material consumption for an order (freezes historical unit cost)' })
  @ApiResponse({ status: 201, description: 'Material consumption recorded successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid input' })
  async recordConsumption(
    @Body() dto: CreateMaterialConsumptionDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<MaterialConsumptionDto>> {
    const consumption = await this.inventoryService.recordConsumption(dto, req.user);
    return {
      success: true,
      data: consumption,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('consumptions')
  @ApiOperation({ summary: 'List material consumption records' })
  @ApiResponse({ status: 200, description: 'Consumptions retrieved' })
  async listConsumptions(
    @Query('orderId') orderId?: string,
    @Query('rawMaterialId') rawMaterialId?: string,
  ): Promise<ApiEnvelope<MaterialConsumptionDto[]>> {
    const consumptions = await this.inventoryService.listConsumptions(orderId, rawMaterialId);
    return {
      success: true,
      data: consumptions,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('valuation')
  @Roles(UserRole.OWNER, UserRole.BRANCH_ADMIN)
  @ApiOperation({ summary: 'Get total stock valuation report using Weighted Average Cost' })
  @ApiResponse({ status: 200, description: 'Valuation report generated' })
  async getStockValuation(
    @Query('branchId') branchId?: string,
    @Req() req?: any,
  ): Promise<ApiEnvelope<StockValuationDto>> {
    const valuation = await this.inventoryService.getStockValuation(branchId, req?.user);
    return {
      success: true,
      data: valuation,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('orders/:orderId/costing')
  @ApiOperation({ summary: 'Get raw material costing breakdown and gross margin for an order' })
  @ApiResponse({ status: 200, description: 'Order material costing calculated' })
  async getOrderCosting(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ): Promise<ApiEnvelope<OrderMaterialCostDto>> {
    const costing = await this.inventoryService.getOrderCosting(orderId, req.user);
    return {
      success: true,
      data: costing,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
