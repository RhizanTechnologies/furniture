import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CustomerDto, ApiResponse as ApiEnvelope } from '@furniture/shared';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(AuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List registered walk-in customers' })
  @ApiResponse({ status: 200, description: 'Customer list retrieved' })
  async listCustomers(
    @Query() query: CustomerQueryDto,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<CustomerDto[]>> {
    const customers = await this.customersService.listCustomers(query, user);
    return {
      success: true,
      data: customers,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post()
  @ApiOperation({ summary: 'Register a new walk-in customer' })
  @ApiResponse({ status: 201, description: 'Customer registered successfully' })
  @ApiResponse({ status: 409, description: 'Customer with phone number already exists' })
  async createCustomer(
    @Body() dto: CreateCustomerDto,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<CustomerDto>> {
    const customer = await this.customersService.createCustomer(dto, user);
    return {
      success: true,
      data: customer,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer profile and complete historical orders' })
  @ApiResponse({ status: 200, description: 'Customer details retrieved' })
  @ApiResponse({ status: 403, description: 'Cross-branch access forbidden' })
  async getCustomer(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<CustomerDto & { orders: any[] }>> {
    const customer = await this.customersService.getCustomer(id, user);
    return {
      success: true,
      data: customer,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update customer contact information' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  async updateCustomer(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: any,
  ): Promise<ApiEnvelope<CustomerDto>> {
    const customer = await this.customersService.updateCustomer(id, dto, user);
    return {
      success: true,
      data: customer,
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }
}
