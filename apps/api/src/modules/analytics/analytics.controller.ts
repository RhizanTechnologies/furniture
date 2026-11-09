import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UserRole,
  ExecutiveDashboardAnalyticsDto,
  ApiResponse as ApiEnvelope,
} from '@furniture/shared';

@ApiTags('Business Analytics & Reporting')
@Controller('analytics')
@UseGuards(AuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get business executive analytics dashboard with actual database metrics' })
  @ApiResponse({ status: 200, description: 'Analytics dashboard generated' })
  async getExecutiveDashboard(
    @Query() query: AnalyticsQueryDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<ExecutiveDashboardAnalyticsDto>> {
    const dashboard = await this.analyticsService.getExecutiveDashboard(query, req.user);
    return {
      success: true,
      data: dashboard,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
