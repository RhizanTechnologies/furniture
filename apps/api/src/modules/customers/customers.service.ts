import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { CustomerDto, UserRole } from '@furniture/shared';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(dto: CreateCustomerDto, user: any): Promise<CustomerDto> {
    const branchId = user.role === UserRole.OWNER ? dto.branchId || user.branchId : user.branchId;

    if (!branchId) {
      throw new BadRequestException('Branch ID is required to register a customer');
    }

    const cleanPhone = dto.phone.replace(/[\s\-\(\)]/g, '').trim();

    // Deduplication check: check if phone already exists
    const existing = await this.prisma.customer.findFirst({
      where: { phone: cleanPhone },
    });

    if (existing) {
      throw new ConflictException(
        `Customer with phone number "${dto.phone}" already exists (${existing.fullName})`,
      );
    }

    const customer = await this.prisma.customer.create({
      data: {
        branchId,
        fullName: dto.fullName.trim(),
        phone: cleanPhone,
        email: dto.email?.trim().toLowerCase() || null,
        address: dto.address?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        orders: {
          select: {
            totalAgreedPrice: true,
            totalPaid: true,
            outstandingBalance: true,
          },
        },
      },
    });

    return this.mapCustomerToDto(customer);
  }

  async listCustomers(query: CustomerQueryDto, user: any): Promise<CustomerDto[]> {
    const where: Prisma.CustomerWhereInput = {};

    // Customer contact profiles are enterprise-wide so any branch can see and select registered clients.
    // If Owner explicitly filters by branch, respect query.branchId.
    if (user.role === UserRole.OWNER && query.branchId && query.branchId !== 'ALL') {
      where.branchId = query.branchId;
    }

    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const customers = await this.prisma.customer.findMany({
      where,
      include: {
        orders: {
          select: {
            branchId: true,
            totalAgreedPrice: true,
            totalPaid: true,
            outstandingBalance: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return customers.map((c) => this.mapCustomerToDto(c, user));
  }

  async getCustomer(id: string, user: any): Promise<CustomerDto & { orders: any[] }> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        orders: {
          include: {
            currentStage: true,
            items: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID "${id}" not found`);
    }

    // Branch Admin can view customer profile information enterprise-wide,
    // but customer orders are strictly scoped: Branch Admin only sees orders placed in their own branch.
    const visibleOrders =
      user.role === UserRole.BRANCH_ADMIN
        ? customer.orders.filter((o) => o.branchId === user.branchId)
        : customer.orders;

    const dto = this.mapCustomerToDto(
      {
        ...customer,
        orders: visibleOrders,
      },
      user,
    );

    return {
      ...dto,
      orders: visibleOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        totalAgreedPrice: Number(o.totalAgreedPrice),
        totalPaid: Number(o.totalPaid),
        outstandingBalance: Number(o.outstandingBalance),
        deadlineDate: o.deadlineDate.toISOString(),
        currentStage: o.currentStage,
        itemsCount: o.items.length,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  async updateCustomer(id: string, dto: UpdateCustomerDto, user: any): Promise<CustomerDto> {
    const customer = await this.getCustomer(id, user);

    let cleanPhone = undefined;
    if (dto.phone) {
      cleanPhone = dto.phone.replace(/[\s\-\(\)]/g, '').trim();
      const existing = await this.prisma.customer.findFirst({
        where: {
          id: { not: id },
          phone: cleanPhone,
        },
      });
      if (existing) {
        throw new ConflictException(`Phone number "${dto.phone}" is already assigned to another customer`);
      }
    }

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName.trim() }),
        ...(cleanPhone && { phone: cleanPhone }),
        ...(dto.email !== undefined && { email: dto.email?.trim().toLowerCase() || null }),
        ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
      },
      include: {
        orders: {
          select: {
            totalAgreedPrice: true,
            totalPaid: true,
            outstandingBalance: true,
          },
        },
      },
    });

    return this.mapCustomerToDto(updated);
  }

  private mapCustomerToDto(c: any, user?: any): CustomerDto {
    const rawOrders = c.orders || [];
    const orders =
      user && user.role === UserRole.BRANCH_ADMIN
        ? rawOrders.filter((o: any) => o.branchId === user.branchId)
        : rawOrders;

    const totalSpent = orders.reduce((sum: number, o: any) => sum + Number(o.totalPaid || 0), 0);
    const outstandingBalance = orders.reduce(
      (sum: number, o: any) => sum + Number(o.outstandingBalance || 0),
      0,
    );

    return {
      id: c.id,
      branchId: c.branchId,
      fullName: c.fullName,
      phone: c.phone,
      email: c.email,
      address: c.address,
      notes: c.notes,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      ordersCount: orders.length,
      totalSpent,
      outstandingBalance,
    };
  }
}
