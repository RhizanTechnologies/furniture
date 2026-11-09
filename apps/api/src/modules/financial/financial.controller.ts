import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { FinancialQueryDto } from './dto/financial-query.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  UserRole,
  PaymentDto,
  ExpenseDto,
  FinancialSummaryDto,
  ApiResponse as ApiEnvelope,
} from '@furniture/shared';

@ApiTags('Payments, Expenses & Financial Management')
@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class FinancialController {
  constructor(private readonly financialService: FinancialService) {}

  @Post('payments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a payment for an order with balance recalculation and idempotency' })
  @ApiResponse({ status: 201, description: 'Payment recorded' })
  @ApiResponse({ status: 400, description: 'Overpayment or invalid amount' })
  async recordPayment(
    @Body() dto: CreatePaymentDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<PaymentDto>> {
    const payment = await this.financialService.recordPayment(dto, req.user);
    return {
      success: true,
      data: payment,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('payments')
  @ApiOperation({ summary: 'List payments with optional order or branch filters' })
  @ApiResponse({ status: 200, description: 'Payments retrieved' })
  async listPayments(
    @Query() query: FinancialQueryDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<PaymentDto[]>> {
    const payments = await this.financialService.listPayments(query, req.user);
    return {
      success: true,
      data: payments,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('expenses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Record a business operating expense' })
  @ApiResponse({ status: 201, description: 'Expense recorded' })
  async recordExpense(
    @Body() dto: CreateExpenseDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<ExpenseDto>> {
    const expense = await this.financialService.recordExpense(dto, req.user);
    return {
      success: true,
      data: expense,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('expenses')
  @ApiOperation({ summary: 'List business expenses' })
  @ApiResponse({ status: 200, description: 'Expenses retrieved' })
  async listExpenses(
    @Query() query: FinancialQueryDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<ExpenseDto[]>> {
    const expenses = await this.financialService.listExpenses(query, req.user);
    return {
      success: true,
      data: expenses,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Get('financial/summary')
  @Roles(UserRole.OWNER)
  @ApiOperation({ summary: 'Get business-wide financial performance summary, revenue, receivables and net profit (Owner only)' })
  @ApiResponse({ status: 200, description: 'Financial summary generated' })
  async getFinancialSummary(
    @Query() query: FinancialQueryDto,
    @Req() req: any,
  ): Promise<ApiEnvelope<FinancialSummaryDto>> {
    const summary = await this.financialService.getFinancialSummary(query, req.user);
    return {
      success: true,
      data: summary,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
