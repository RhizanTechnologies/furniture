import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService, SyncOperationResult } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@furniture/shared';

@ApiTags('Synchronization Engine')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.BRANCH_ADMIN)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Synchronize a batch of offline client mutations',
    description:
      'Processes an ordered list of offline client operations (Customer, Order, Payment, Expense, Material Consumption) idempotently with conflict detection and resolution.',
  })
  @ApiResponse({ status: 200, description: 'Batch synchronization processing completed.' })
  async processBatch(
    @Body() dto: SyncBatchDto,
    @CurrentUser() user: any,
  ): Promise<{ results: SyncOperationResult[]; processedAt: string }> {
    const results = await this.syncService.processBatch(dto, user);
    return {
      results,
      processedAt: new Date().toISOString(),
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Check server sync engine readiness and clock' })
  @ApiResponse({ status: 200, description: 'Server sync engine online.' })
  async checkStatus(): Promise<{ status: string; serverTime: string }> {
    return {
      status: 'online',
      serverTime: new Date().toISOString(),
    };
  }
}
