import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HealthCheckResponse } from '@furniture/shared';

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(): Promise<HealthCheckResponse> {
    const isDbConnected = await this.prisma.isHealthy();
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: isDbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: isDbConnected ? 'connected' : 'disconnected',
      uptimeSeconds,
    };
  }
}
