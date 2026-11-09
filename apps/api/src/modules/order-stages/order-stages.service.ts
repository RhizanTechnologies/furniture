import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderStageDto } from './dto/create-order-stage.dto';
import { UpdateOrderStageDto } from './dto/update-order-stage.dto';
import { ReorderStagesDto } from './dto/reorder-stages.dto';
import { OrderStageDto } from '@furniture/shared';

@Injectable()
export class OrderStagesService {
  constructor(private readonly prisma: PrismaService) {}

  async listStages(includeInactive = false): Promise<OrderStageDto[]> {
    const stages = await this.prisma.orderStage.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { sequenceOrder: 'asc' },
    });

    return stages.map((s) => this.mapStageToDto(s));
  }

  async getStage(id: string): Promise<OrderStageDto> {
    const stage = await this.prisma.orderStage.findUnique({
      where: { id },
    });

    if (!stage) {
      throw new NotFoundException(`Order Stage with ID "${id}" not found`);
    }

    return this.mapStageToDto(stage);
  }

  async createStage(dto: CreateOrderStageDto): Promise<OrderStageDto> {
    const existing = await this.prisma.orderStage.findUnique({
      where: { name: dto.name.trim() },
    });

    if (existing) {
      throw new ConflictException(`An order stage named "${dto.name}" already exists`);
    }

    let sequenceOrder = dto.sequenceOrder;
    if (!sequenceOrder) {
      const highest = await this.prisma.orderStage.findFirst({
        orderBy: { sequenceOrder: 'desc' },
      });
      sequenceOrder = (highest?.sequenceOrder || 0) + 1;
    }

    const stage = await this.prisma.orderStage.create({
      data: {
        name: dto.name.trim(),
        color: dto.color || '#8B5A2B',
        sequenceOrder,
        isFinalStage: dto.isFinalStage || false,
        isActive: true,
      },
    });

    return this.mapStageToDto(stage);
  }

  async updateStage(id: string, dto: UpdateOrderStageDto): Promise<OrderStageDto> {
    await this.getStage(id);

    if (dto.name) {
      const existing = await this.prisma.orderStage.findFirst({
        where: {
          id: { not: id },
          name: dto.name.trim(),
        },
      });
      if (existing) {
        throw new ConflictException(`An order stage named "${dto.name}" already exists`);
      }
    }

    const updated = await this.prisma.orderStage.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.color && { color: dto.color }),
        ...(dto.sequenceOrder !== undefined && { sequenceOrder: dto.sequenceOrder }),
        ...(dto.isFinalStage !== undefined && { isFinalStage: dto.isFinalStage }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return this.mapStageToDto(updated);
  }

  async deleteStage(id: string): Promise<void> {
    const stage = await this.prisma.orderStage.findUnique({
      where: { id },
      include: {
        currentOrders: { select: { id: true } },
        toHistories: { select: { id: true } },
      },
    });

    if (!stage) {
      throw new NotFoundException(`Order Stage with ID "${id}" not found`);
    }

    // Safety rule from blueprint: Prevent deletion if active or historical orders use this stage
    if (stage.currentOrders.length > 0 || stage.toHistories.length > 0) {
      throw new ConflictException(
        'Cannot hard-delete this stage because it is associated with existing or historical orders. Deactivate it instead by setting isActive = false.',
      );
    }

    await this.prisma.orderStage.delete({
      where: { id },
    });
  }

  async reorderStages(dto: ReorderStagesDto): Promise<OrderStageDto[]> {
    await this.prisma.$transaction(
      dto.stages.map((item) =>
        this.prisma.orderStage.update({
          where: { id: item.id },
          data: { sequenceOrder: item.sequenceOrder },
        }),
      ),
    );

    return this.listStages(true);
  }

  private mapStageToDto(s: any): OrderStageDto {
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      sequenceOrder: s.sequenceOrder,
      isFinalStage: s.isFinalStage,
      isActive: s.isActive,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    };
  }
}
