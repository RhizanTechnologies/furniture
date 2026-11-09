import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthCheckResponse } from '@furniture/shared';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Application and database connectivity status' })
  async getHealth(): Promise<{ success: boolean; data: HealthCheckResponse }> {
    const health = await this.healthService.checkHealth();
    return {
      success: health.status === 'ok',
      data: health,
    };
  }
}
