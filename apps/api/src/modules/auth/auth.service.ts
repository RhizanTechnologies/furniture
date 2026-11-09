import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UserDto } from '@furniture/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<{ user: UserDto; token: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase().trim() },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            stockMode: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated. Please contact the administrator.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    });

    const userDto: UserDto = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role as any,
      branchId: user.branchId,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };

    return { user: userDto, token };
  }

  async getProfile(userId: string): Promise<UserDto & { branch?: any }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            stockMode: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session invalid');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role as any,
      branchId: user.branchId,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      branch: user.branch,
    };
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }
}
