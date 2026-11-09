import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  branchId?: string | null;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication session required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
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
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account is inactive or no longer exists');
      }

      (request as any).user = {
        ...user,
        createdAt: user.createdAt.toISOString(),
      };

      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication session');
    }
  }

  private extractToken(request: Request): string | undefined {
    // 1. Try secure HTTP-only cookie first
    if (request.cookies && request.cookies.agy_session) {
      return request.cookies.agy_session;
    }

    // 2. Fallback to Bearer token header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
