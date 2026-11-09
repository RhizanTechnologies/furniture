import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { AssignBranchAdminDto } from './dto/assign-admin.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchAccessGuard } from '../../common/guards/branch-access.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, BranchDto, ApiResponse as ApiEnvelope } from '@furniture/shared';

@ApiTags('Branches')
@Controller('branches')
@UseGuards(AuthGuard, RolesGuard)
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'List all business branches (Owner only)' })
  @ApiResponse({ status: 200, description: 'List of branches with stock configuration and administrators' })
  async listBranches(): Promise<ApiEnvelope<BranchDto[]>> {
    const branches = await this.branchesService.listBranches();
    return {
      success: true,
      data: branches,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post()
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Create a new business branch (Owner only)' })
  @ApiResponse({ status: 201, description: 'Branch successfully created' })
  async createBranch(@Body() dto: CreateBranchDto): Promise<ApiEnvelope<BranchDto>> {
    const branch = await this.branchesService.createBranch(dto);
    return {
      success: true,
      data: branch,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(':id')
  @UseGuards(BranchAccessGuard)
  @ApiOperation({ summary: 'Get branch details by ID (Owner or Assigned Admin)' })
  @ApiResponse({ status: 200, description: 'Branch details retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden if branch administrator accesses another branch' })
  async getBranch(@Param('id') id: string): Promise<ApiEnvelope<BranchDto>> {
    const branch = await this.branchesService.getBranch(id);
    return {
      success: true,
      data: branch,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put(':id')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Update branch information (Owner only)' })
  @ApiResponse({ status: 200, description: 'Branch updated successfully' })
  async updateBranch(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ): Promise<ApiEnvelope<BranchDto>> {
    const branch = await this.branchesService.updateBranch(id, dto);
    return {
      success: true,
      data: branch,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post(':id/admin')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Assign or replace the administrator for a branch (Owner only)' })
  @ApiResponse({ status: 200, description: 'Administrator assigned to branch successfully' })
  async assignAdmin(
    @Param('id') id: string,
    @Body() dto: AssignBranchAdminDto,
  ): Promise<ApiEnvelope<BranchDto>> {
    const branch = await this.branchesService.assignBranchAdmin(id, dto);
    return {
      success: true,
      data: branch,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
