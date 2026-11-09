import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { CreateStockInDto } from './dto/create-stock-in.dto';
import { CreateMaterialConsumptionDto } from './dto/create-material-consumption.dto';
import { InventoryQueryDto } from './dto/inventory-query.dto';
import { convertUnitQuantity } from './unit-conversion.util';
import {
  RawMaterialDto,
  MaterialStockInDto,
  MaterialConsumptionDto,
  StockValuationDto,
  OrderMaterialCostDto,
  UserRole,
  StockMode,
} from '@furniture/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List raw materials with real-time stock balances, WAC unit costs, and stock valuations
   */
  async listMaterials(query: InventoryQueryDto, user: any): Promise<RawMaterialDto[]> {
    const where: Prisma.RawMaterialWhereInput = {};

    if (!query.includeInactive) {
      where.isActive = true;
    }

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { code: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    const materials = await this.prisma.rawMaterial.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const dtos = materials.map((m) => this.mapRawMaterialToDto(m));

    if (query.onlyLowStock) {
      return dtos.filter((d) => d.isLowStock);
    }

    return dtos;
  }

  /**
   * Get single raw material details with recent replenishment and consumption history
   */
  async getMaterial(id: string): Promise<RawMaterialDto & { stockIns: MaterialStockInDto[]; consumptions: MaterialConsumptionDto[] }> {
    const material = await this.prisma.rawMaterial.findUnique({
      where: { id },
      include: {
        stockIns: {
          orderBy: { receivedDate: 'desc' },
          take: 10,
          include: { branch: true, recordedByUser: true, rawMaterial: true },
        },
        consumptions: {
          orderBy: { consumedAt: 'desc' },
          take: 10,
          include: { branch: true, recordedByUser: true, rawMaterial: true, order: true },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(`Raw material with ID "${id}" not found`);
    }

    return {
      ...this.mapRawMaterialToDto(material),
      stockIns: material.stockIns.map((s) => this.mapStockInToDto(s)),
      consumptions: material.consumptions.map((c) => this.mapConsumptionToDto(c)),
    };
  }

  /**
   * Create a new raw material catalog definition (Owner only)
   */
  async createMaterial(dto: CreateRawMaterialDto, user: any): Promise<RawMaterialDto> {
    const existing = await this.prisma.rawMaterial.findUnique({
      where: { code: dto.code.trim().toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Raw material with code "${dto.code}" already exists`);
    }

    const initialQty = dto.initialStockQuantity ? new Prisma.Decimal(dto.initialStockQuantity) : new Prisma.Decimal(0);
    const initialCost = dto.initialUnitCost ? new Prisma.Decimal(dto.initialUnitCost) : new Prisma.Decimal(0);
    const reorderAlert = dto.reorderAlertQuantity ? new Prisma.Decimal(dto.reorderAlertQuantity) : null;

    return await this.prisma.$transaction(async (tx) => {
      const material = await tx.rawMaterial.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          category: dto.category.trim(),
          unitOfMeasurement: dto.unitOfMeasurement.trim(),
          currentStockQuantity: initialQty,
          currentUnitCost: initialCost,
          reorderAlertQuantity: reorderAlert,
          isActive: true,
        },
      });

      // If initial stock was provided, create an initial stock-in audit record
      if (initialQty.greaterThan(0)) {
        await tx.materialStockIn.create({
          data: {
            rawMaterialId: material.id,
            branchId: null, // Central main warehouse
            receivedQuantity: initialQty,
            unitCost: initialCost,
            totalCost: initialQty.mul(initialCost),
            supplierInvoiceRef: 'INITIAL-OPENING-STOCK',
            receivedDate: new Date(),
            recordedByUserId: user.id,
          },
        });
      }

      return this.mapRawMaterialToDto(material);
    });
  }

  /**
   * Update raw material metadata (Owner only)
   */
  async updateMaterial(id: string, dto: UpdateRawMaterialDto): Promise<RawMaterialDto> {
    const material = await this.prisma.rawMaterial.findUnique({ where: { id } });
    if (!material) {
      throw new NotFoundException(`Raw material with ID "${id}" not found`);
    }

    const updated = await this.prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.category && { category: dto.category.trim() }),
        ...(dto.unitOfMeasurement && { unitOfMeasurement: dto.unitOfMeasurement.trim() }),
        ...(dto.reorderAlertQuantity !== undefined && {
          reorderAlertQuantity: dto.reorderAlertQuantity !== null ? new Prisma.Decimal(dto.reorderAlertQuantity) : null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.mapRawMaterialToDto(updated);
  }

  /**
   * Record a material replenishment (Stock-In) batch.
   * Atomically recalculates the Weighted Average Cost (WAC) and updates stock quantities.
   */
  async recordStockIn(dto: CreateStockInDto, user: any): Promise<MaterialStockInDto> {
    const material = await this.prisma.rawMaterial.findUnique({
      where: { id: dto.rawMaterialId },
    });

    if (!material) {
      throw new NotFoundException(`Raw material with ID "${dto.rawMaterialId}" not found`);
    }

    if (!material.isActive) {
      throw new BadRequestException(`Cannot stock-in deactivated material "${material.name}"`);
    }

    // Branch tenancy verification
    let targetBranchId: string | null = null;
    if (user.role === UserRole.BRANCH_ADMIN) {
      const userBranch = await this.prisma.branch.findUnique({ where: { id: user.branchId } });
      if (!userBranch) {
        throw new ForbiddenException('User is not assigned to a valid branch');
      }
      if (userBranch.stockMode === StockMode.MAIN_STOCK) {
        targetBranchId = null; // Replenishes main stock
      } else {
        targetBranchId = userBranch.id; // Replenishes branch dedicated stock
      }
    } else {
      // Owner can replenish central warehouse (null) or a specific branch
      targetBranchId = dto.branchId || null;
    }

    const incomingQty = new Prisma.Decimal(dto.receivedQuantity);
    const incomingUnitCost = new Prisma.Decimal(dto.unitCost);
    const totalIncomingCost = incomingQty.mul(incomingUnitCost);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Calculate New Weighted Average Cost (WAC)
      // WAC_new = ((CurrentQty * CurrentWAC) + (IncomingQty * IncomingCost)) / (CurrentQty + IncomingQty)
      const currentQty = material.currentStockQuantity;
      const currentWac = material.currentUnitCost;

      let newWac: Prisma.Decimal;
      if (currentQty.lessThanOrEqualTo(0)) {
        newWac = incomingUnitCost;
      } else {
        const currentStockValue = currentQty.mul(currentWac);
        const combinedStockValue = currentStockValue.plus(totalIncomingCost);
        const combinedQuantity = currentQty.plus(incomingQty);
        newWac = combinedStockValue.div(combinedQuantity).toDecimalPlaces(2);
      }

      const newTotalQuantity = currentQty.plus(incomingQty);

      // 2. Create Stock-In Audit Record
      const stockIn = await tx.materialStockIn.create({
        data: {
          rawMaterialId: material.id,
          branchId: targetBranchId,
          receivedQuantity: incomingQty,
          unitCost: incomingUnitCost,
          totalCost: totalIncomingCost,
          supplierInvoiceRef: dto.supplierInvoiceRef?.trim() || null,
          receivedDate: dto.receivedDate ? new Date(dto.receivedDate) : new Date(),
          recordedByUserId: user.id,
        },
        include: {
          rawMaterial: true,
          branch: true,
          recordedByUser: true,
        },
      });

      // 3. Update Material's authoritative stock quantity and WAC unit cost
      await tx.rawMaterial.update({
        where: { id: material.id },
        data: {
          currentStockQuantity: newTotalQuantity,
          currentUnitCost: newWac,
        },
      });

      return this.mapStockInToDto(stockIn);
    });
  }

  /**
   * Record raw material consumption against an order.
   * Atomically validates stock availability, deducts inventory, and allocates frozen historical unit cost.
   */
  async recordConsumption(dto: CreateMaterialConsumptionDto, user: any): Promise<MaterialConsumptionDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { branch: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${dto.orderId}" not found`);
    }

    // Branch tenancy check
    if (user.role === UserRole.BRANCH_ADMIN && user.branchId !== order.branchId) {
      throw new ForbiddenException("Cannot record material consumption for another branch's order");
    }

    const material = await this.prisma.rawMaterial.findUnique({
      where: { id: dto.rawMaterialId },
    });

    if (!material) {
      throw new NotFoundException(`Raw material with ID "${dto.rawMaterialId}" not found`);
    }

    if (!material.isActive) {
      throw new BadRequestException(`Cannot consume deactivated material "${material.name}"`);
    }

    // Convert unit quantity if unit is specified
    const convertedQtyNum = convertUnitQuantity(
      dto.consumedQuantity,
      dto.unit,
      material.unitOfMeasurement,
    );
    const convertedQty = new Prisma.Decimal(convertedQtyNum);

    // Validate that stock quantity will not become negative
    if (material.currentStockQuantity.lessThan(convertedQty)) {
      throw new BadRequestException(
        `Insufficient inventory for "${material.name}". Available: ${material.currentStockQuantity} ${material.unitOfMeasurement}, requested: ${convertedQty} ${material.unitOfMeasurement}. Negative stock is disallowed.`,
      );
    }

    // Determine branch attribution for consumption
    const branchId = order.branch.stockMode === StockMode.MAIN_STOCK ? null : order.branchId;

    // Freeze historical cost snapshot using the current WAC unit cost
    const frozenUnitCost = material.currentUnitCost;
    const totalMaterialCost = convertedQty.mul(frozenUnitCost);

    return await this.prisma.$transaction(async (tx) => {
      // 1. Deduct stock from raw material balance
      const newStockQty = material.currentStockQuantity.minus(convertedQty);
      await tx.rawMaterial.update({
        where: { id: material.id },
        data: { currentStockQuantity: newStockQty },
      });

      // 2. Create immutable MaterialConsumption record
      const consumption = await tx.materialConsumption.create({
        data: {
          orderId: order.id,
          rawMaterialId: material.id,
          branchId,
          consumedQuantity: convertedQty,
          unitCostAllocated: frozenUnitCost,
          totalMaterialCost,
          consumedAt: new Date(),
          recordedByUserId: user.id,
        },
        include: {
          order: true,
          rawMaterial: true,
          branch: true,
          recordedByUser: true,
        },
      });

      return this.mapConsumptionToDto(consumption);
    });
  }

  /**
   * List historical stock-in records
   */
  async listStockIns(rawMaterialId?: string, branchId?: string): Promise<MaterialStockInDto[]> {
    const where: Prisma.MaterialStockInWhereInput = {};
    if (rawMaterialId) where.rawMaterialId = rawMaterialId;
    if (branchId) where.branchId = branchId;

    const records = await this.prisma.materialStockIn.findMany({
      where,
      orderBy: { receivedDate: 'desc' },
      include: {
        rawMaterial: true,
        branch: true,
        recordedByUser: true,
      },
    });

    return records.map((s) => this.mapStockInToDto(s));
  }

  /**
   * List material consumption records
   */
  async listConsumptions(orderId?: string, rawMaterialId?: string): Promise<MaterialConsumptionDto[]> {
    const where: Prisma.MaterialConsumptionWhereInput = {};
    if (orderId) where.orderId = orderId;
    if (rawMaterialId) where.rawMaterialId = rawMaterialId;

    const records = await this.prisma.materialConsumption.findMany({
      where,
      orderBy: { consumedAt: 'desc' },
      include: {
        rawMaterial: true,
        branch: true,
        recordedByUser: true,
        order: true,
      },
    });

    return records.map((c) => this.mapConsumptionToDto(c));
  }

  /**
   * Real-time stock valuation report
   * Uses authoritative Weighted Average Cost (WAC) of remaining inventory.
   * Consumed materials are excluded from remaining stock value.
   */
  async getStockValuation(branchId?: string, user?: any): Promise<StockValuationDto> {
    const materials = await this.prisma.rawMaterial.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    const mappedMaterials = materials.map((m) => this.mapRawMaterialToDto(m));

    let totalStockValue = 0;
    let lowStockCount = 0;
    const categoryMap = new Map<string, { itemCount: number; totalQuantity: number; totalStockValue: number }>();

    for (const m of mappedMaterials) {
      totalStockValue += m.stockValue;
      if (m.isLowStock) lowStockCount++;

      const existingCat = categoryMap.get(m.category) || {
        itemCount: 0,
        totalQuantity: 0,
        totalStockValue: 0,
      };

      existingCat.itemCount += 1;
      existingCat.totalQuantity += m.currentStockQuantity;
      existingCat.totalStockValue += m.stockValue;
      categoryMap.set(m.category, existingCat);
    }

    const categories = Array.from(categoryMap.entries()).map(([category, stats]) => ({
      category,
      itemCount: stats.itemCount,
      totalQuantity: Math.round(stats.totalQuantity * 1000) / 1000,
      totalStockValue: Math.round(stats.totalStockValue * 100) / 100,
    }));

    let stockLocation = 'Central Main Warehouse & Global Pool';
    if (branchId) {
      const b = await this.prisma.branch.findUnique({ where: { id: branchId } });
      if (b) stockLocation = `${b.name} (${b.code})`;
    }

    return {
      totalStockValue: Math.round(totalStockValue * 100) / 100,
      totalItemsInStock: mappedMaterials.filter((m) => m.currentStockQuantity > 0).length,
      lowStockCount,
      stockLocation,
      categories,
      materials: mappedMaterials,
    };
  }

  /**
   * Order material costing and gross profit breakdown
   */
  async getOrderCosting(orderId: string, user: any): Promise<OrderMaterialCostDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        consumptions: {
          include: {
            rawMaterial: true,
            branch: true,
            recordedByUser: true,
            order: true,
          },
          orderBy: { consumedAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found`);
    }

    // Branch tenancy check
    if (user.role === UserRole.BRANCH_ADMIN && user.branchId !== order.branchId) {
      throw new ForbiddenException("Cannot view material costing for another branch's order");
    }

    const consumptionsDto = order.consumptions.map((c) => this.mapConsumptionToDto(c));
    const totalMaterialCost = consumptionsDto.reduce((sum, c) => sum + c.totalMaterialCost, 0);
    const totalAgreedPrice = Number(order.totalAgreedPrice);
    const grossProfit = totalAgreedPrice - totalMaterialCost;
    const grossMarginPercentage =
      totalAgreedPrice > 0 ? Math.round((grossProfit / totalAgreedPrice) * 10000) / 100 : 0;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAgreedPrice,
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercentage,
      consumptions: consumptionsDto,
    };
  }

  private mapRawMaterialToDto(m: any): RawMaterialDto {
    const qty = Number(m.currentStockQuantity);
    const cost = Number(m.currentUnitCost);
    const alertQty = m.reorderAlertQuantity ? Number(m.reorderAlertQuantity) : null;
    const isLowStock = alertQty !== null ? qty <= alertQty : false;

    return {
      id: m.id,
      code: m.code,
      name: m.name,
      category: m.category,
      unitOfMeasurement: m.unitOfMeasurement,
      currentStockQuantity: qty,
      currentUnitCost: cost,
      stockValue: Math.round(qty * cost * 100) / 100,
      reorderAlertQuantity: alertQty,
      isLowStock,
      isActive: m.isActive,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }

  private mapStockInToDto(s: any): MaterialStockInDto {
    return {
      id: s.id,
      rawMaterialId: s.rawMaterialId,
      rawMaterialName: s.rawMaterial?.name || '',
      rawMaterialCode: s.rawMaterial?.code || '',
      unitOfMeasurement: s.rawMaterial?.unitOfMeasurement || '',
      branchId: s.branchId,
      branchName: s.branch?.name || (s.branchId ? 'Dedicated Branch' : 'Main Warehouse'),
      receivedQuantity: Number(s.receivedQuantity),
      unitCost: Number(s.unitCost),
      totalCost: Number(s.totalCost),
      supplierInvoiceRef: s.supplierInvoiceRef,
      receivedDate: s.receivedDate.toISOString(),
      recordedByUserName: s.recordedByUser?.fullName || 'System',
      recordedByUserId: s.recordedByUserId,
    };
  }

  private mapConsumptionToDto(c: any): MaterialConsumptionDto {
    return {
      id: c.id,
      orderId: c.orderId,
      orderNumber: c.order?.orderNumber || '',
      rawMaterialId: c.rawMaterialId,
      rawMaterialName: c.rawMaterial?.name || '',
      rawMaterialCode: c.rawMaterial?.code || '',
      unitOfMeasurement: c.rawMaterial?.unitOfMeasurement || '',
      branchId: c.branchId,
      branchName: c.branch?.name || (c.branchId ? 'Branch Workshop' : 'Central Workshop'),
      consumedQuantity: Number(c.consumedQuantity),
      unitCostAllocated: Number(c.unitCostAllocated),
      totalMaterialCost: Number(c.totalMaterialCost),
      consumedAt: c.consumedAt.toISOString(),
      recordedByUserName: c.recordedByUser?.fullName || 'System',
      recordedByUserId: c.recordedByUserId,
    };
  }
}
