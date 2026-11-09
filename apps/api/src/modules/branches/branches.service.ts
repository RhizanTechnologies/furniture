import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AssignBranchAdminDto } from './dto/assign-admin.dto';
import { BranchDto, UserRole } from '@furniture/shared';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async listBranches(): Promise<BranchDto[]> {
    const branches = await this.prisma.branch.findMany({
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            branchId: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return branches.map((b) => this.mapBranchToDto(b));
  }

  async getBranch(id: string): Promise<BranchDto> {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            branchId: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }

    return this.mapBranchToDto(branch);
  }

  async createBranch(dto: CreateBranchDto): Promise<BranchDto> {
    // Check code and name uniqueness
    const existing = await this.prisma.branch.findFirst({
      where: {
        OR: [
          { name: { equals: dto.name, mode: 'insensitive' } },
          { code: { equals: dto.code.toUpperCase(), mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        `A branch with name "${dto.name}" or code "${dto.code}" already exists`,
      );
    }

    const branch = await this.prisma.branch.create({
      data: {
        name: dto.name.trim(),
        code: dto.code.trim().toUpperCase(),
        address: dto.address.trim(),
        phone: dto.phone?.trim() || null,
        stockMode: dto.stockMode,
      },
      include: {
        admin: true,
      },
    });

    return this.mapBranchToDto(branch);
  }

  async updateBranch(id: string, dto: UpdateBranchDto): Promise<BranchDto> {
    await this.getBranch(id);

    if (dto.name) {
      const existing = await this.prisma.branch.findFirst({
        where: {
          id: { not: id },
          name: { equals: dto.name, mode: 'insensitive' },
        },
      });
      if (existing) {
        throw new ConflictException(`A branch with name "${dto.name}" already exists`);
      }
    }

    const updated = await this.prisma.branch.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.address && { address: dto.address.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        admin: true,
      },
    });

    return this.mapBranchToDto(updated);
  }

  async assignBranchAdmin(branchId: string, dto: AssignBranchAdminDto): Promise<BranchDto> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      throw new NotFoundException(`Branch with ID ${branchId} not found`);
    }

    const email = dto.email.toLowerCase().trim();

    return this.prisma.$transaction(async (tx) => {
      // 1. If branch currently has an assigned admin, unlink them
      await tx.user.updateMany({
        where: { branchId },
        data: { branchId: null },
      });

      // 2. Check if user already exists
      const existingUser = await tx.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        if (existingUser.role === UserRole.OWNER) {
          throw new BadRequestException('Cannot assign the business Owner as a branch administrator');
        }

        // Assign to this branch
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            role: UserRole.BRANCH_ADMIN,
            branchId: branch.id,
            fullName: dto.fullName.trim(),
            ...(dto.phone && { phone: dto.phone.trim() }),
            ...(dto.password && { passwordHash: await bcrypt.hash(dto.password, 10) }),
            isActive: true,
          },
        });
      } else {
        // Create new administrator user
        if (!dto.password) {
          throw new BadRequestException('Password is required when creating a new branch administrator');
        }

        const passwordHash = await bcrypt.hash(dto.password, 10);
        await tx.user.create({
          data: {
            email,
            passwordHash,
            fullName: dto.fullName.trim(),
            phone: dto.phone?.trim() || null,
            role: UserRole.BRANCH_ADMIN,
            branchId: branch.id,
            isActive: true,
          },
        });
      }

      // Return branch with newly assigned administrator
      const finalBranch = await tx.branch.findUniqueOrThrow({
        where: { id: branchId },
        include: {
          admin: {
            select: {
              id: true,
              email: true,
              fullName: true,
              phone: true,
              role: true,
              branchId: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      });

      return this.mapBranchToDto(finalBranch);
    });
  }

  private mapBranchToDto(b: any): BranchDto {
    return {
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      phone: b.phone,
      stockMode: b.stockMode,
      isActive: b.isActive,
      createdAt: b.createdAt.toISOString(),
      admin: b.admin
        ? {
            id: b.admin.id,
            email: b.admin.email,
            fullName: b.admin.fullName,
            phone: b.admin.phone,
            role: b.admin.role,
            branchId: b.admin.branchId,
            isActive: b.admin.isActive,
            createdAt: b.admin.createdAt.toISOString(),
          }
        : null,
    };
  }
}
