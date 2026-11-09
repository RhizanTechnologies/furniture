import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, PaymentType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeOrderStageDto } from './dto/change-stage.dto';
import { OrderQueryDto } from './dto/order-query.dto';
import { OrderDto, UserRole } from '@furniture/shared';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto, user: any): Promise<OrderDto> {
    const branchId = user.role === UserRole.OWNER ? dto.branchId || user.branchId : user.branchId;

    if (!branchId) {
      throw new BadRequestException('Branch ID is required to create an order');
    }

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${dto.customerId}" not found`);
    }

    // Validate financial amounts
    if (dto.prepaymentAmount > dto.totalAgreedPrice) {
      throw new BadRequestException('Prepayment amount cannot exceed the agreed total price');
    }

    const outstandingBalance = dto.totalAgreedPrice - dto.prepaymentAmount;

    // Resolve initial stage
    let currentStageId = dto.currentStageId;
    if (!currentStageId) {
      const initialStage = await this.prisma.orderStage.findFirst({
        where: { isActive: true },
        orderBy: { sequenceOrder: 'asc' },
      });
      if (!initialStage) {
        throw new BadRequestException('No active order stages configured. Please configure order stages first.');
      }
      currentStageId = initialStage.id;
    } else {
      const stage = await this.prisma.orderStage.findUnique({
        where: { id: currentStageId },
      });
      if (!stage || !stage.isActive) {
        throw new BadRequestException('Specified order stage is invalid or inactive');
      }
    }

    // Generate Order Number: ORD-YYYY-XXXXX
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count();
    const orderNumber = `ORD-${year}-${String(count + 1).padStart(5, '0')}`;

    // Execute atomic transaction for Order + Items + Prepayment + Stage History
    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          branchId,
          currentStageId: currentStageId!,
          totalAgreedPrice: new Prisma.Decimal(dto.totalAgreedPrice),
          totalPaid: new Prisma.Decimal(dto.prepaymentAmount),
          outstandingBalance: new Prisma.Decimal(outstandingBalance),
          deadlineDate: new Date(dto.deadlineDate),
          notes: dto.notes?.trim() || null,
        },
      });

      // 2. Create Order Items
      for (const item of dto.items) {
        const subtotal = item.quantity * item.unitPrice;
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId || null,
            itemDescription: item.itemDescription.trim(),
            quantity: item.quantity,
            unitPrice: new Prisma.Decimal(item.unitPrice),
            subtotal: new Prisma.Decimal(subtotal),
          },
        });
      }

      // 3. Record Initial Prepayment (if > 0)
      if (dto.prepaymentAmount > 0) {
        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: new Prisma.Decimal(dto.prepaymentAmount),
            paymentType: PaymentType.PREPAYMENT,
            paymentMethod: dto.paymentMethod || 'Cash',
            recordedByUserId: user.id,
          },
        });
      }

      // 4. Record Initial Stage History
      await tx.orderStageHistory.create({
        data: {
          orderId: order.id,
          fromStageId: null,
          toStageId: currentStageId!,
          changedByUserId: user.id,
          notes: 'Order created with initial prepayment',
        },
      });

      return order;
    });

    return this.getOrder(createdOrder.id, user);
  }

  async listOrders(query: OrderQueryDto, user: any): Promise<OrderDto[]> {
    const where: Prisma.OrderWhereInput = {};

    // Branch tenancy restriction
    if (user.role === UserRole.BRANCH_ADMIN) {
      where.branchId = user.branchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.stageId) {
      where.currentStageId = query.stageId;
    }

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { fullName: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        customer: true,
        branch: true,
        currentStage: true,
        items: true,
        stageHistories: {
          include: {
            fromStage: true,
            toStage: true,
            changedByUser: true,
          },
          orderBy: { changedAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.mapOrderToDto(o));
  }

  async getOrder(id: string, user: any): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        branch: true,
        currentStage: true,
        items: true,
        stageHistories: {
          include: {
            fromStage: true,
            toStage: true,
            changedByUser: true,
          },
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    // Branch tenancy validation
    if (user.role === UserRole.BRANCH_ADMIN && order.branchId !== user.branchId) {
      throw new ForbiddenException('Forbidden: You are not authorized to view orders from another branch');
    }

    return this.mapOrderToDto(order);
  }

  async updateOrder(id: string, dto: UpdateOrderDto, user: any): Promise<OrderDto> {
    const existing = await this.getOrder(id, user);

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        ...(dto.deadlineDate && { deadlineDate: new Date(dto.deadlineDate) }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      },
      include: {
        customer: true,
        branch: true,
        currentStage: true,
        items: true,
        stageHistories: {
          include: {
            fromStage: true,
            toStage: true,
            changedByUser: true,
          },
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    return this.mapOrderToDto(updated);
  }

  async changeOrderStage(id: string, dto: ChangeOrderStageDto, user: any): Promise<OrderDto> {
    const order = await this.getOrder(id, user);

    // Verify target stage exists and is active
    const targetStage = await this.prisma.orderStage.findUnique({
      where: { id: dto.toStageId },
    });
    if (!targetStage || !targetStage.isActive) {
      throw new BadRequestException('Target order stage is invalid or inactive');
    }

    // Atomic stage transition and audit log
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { currentStageId: dto.toStageId },
      });

      await tx.orderStageHistory.create({
        data: {
          orderId: id,
          fromStageId: order.currentStageId,
          toStageId: dto.toStageId,
          changedByUserId: user.id,
          notes: dto.notes?.trim() || null,
        },
      });
    });

    return this.getOrder(id, user);
  }

  private mapOrderToDto(o: any): OrderDto {
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      customerId: o.customerId,
      branchId: o.branchId,
      currentStageId: o.currentStageId,
      totalAgreedPrice: Number(o.totalAgreedPrice),
      totalPaid: Number(o.totalPaid),
      outstandingBalance: Number(o.outstandingBalance),
      deadlineDate: o.deadlineDate.toISOString(),
      notes: o.notes,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      customer: o.customer
        ? {
            id: o.customer.id,
            branchId: o.customer.branchId,
            fullName: o.customer.fullName,
            phone: o.customer.phone,
            email: o.customer.email,
            address: o.customer.address,
            notes: o.customer.notes,
            createdAt: o.customer.createdAt.toISOString(),
            updatedAt: o.customer.updatedAt.toISOString(),
          }
        : undefined,
      branch: o.branch
        ? {
            id: o.branch.id,
            name: o.branch.name,
            code: o.branch.code,
            address: o.branch.address,
            phone: o.branch.phone,
            stockMode: o.branch.stockMode,
            isActive: o.branch.isActive,
            createdAt: o.branch.createdAt.toISOString(),
          }
        : undefined,
      currentStage: o.currentStage
        ? {
            id: o.currentStage.id,
            name: o.currentStage.name,
            color: o.currentStage.color,
            sequenceOrder: o.currentStage.sequenceOrder,
            isFinalStage: o.currentStage.isFinalStage,
            isActive: o.currentStage.isActive,
            createdAt: o.currentStage.createdAt.toISOString(),
            updatedAt: o.currentStage.updatedAt.toISOString(),
          }
        : undefined,
      items: (o.items || []).map((i: any) => ({
        id: i.id,
        orderId: i.orderId,
        productId: i.productId,
        itemDescription: i.itemDescription,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
      stageHistories: (o.stageHistories || []).map((h: any) => ({
        id: h.id,
        orderId: h.orderId,
        fromStageId: h.fromStageId,
        toStageId: h.toStageId,
        changedByUserId: h.changedByUserId,
        changedByUserName: h.changedByUser?.fullName || 'System',
        fromStageName: h.fromStage?.name || null,
        toStageName: h.toStage?.name || 'Stage',
        notes: h.notes,
        changedAt: h.changedAt.toISOString(),
      })),
    };
  }
}
