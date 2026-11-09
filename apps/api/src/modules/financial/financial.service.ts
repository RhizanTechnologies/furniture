import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { FinancialQueryDto } from './dto/financial-query.dto';
import {
  PaymentDto,
  ExpenseDto,
  FinancialSummaryDto,
  UserRole,
  PaymentType,
} from '@furniture/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinancialService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a payment against an order.
   * Atomically increments totalPaid, decrements outstandingBalance, checks overpayments,
   * and provides idempotency protection.
   */
  async recordPayment(dto: CreatePaymentDto, user: any): Promise<PaymentDto> {
    // 1. Idempotency Check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.payment.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: {
          order: { include: { customer: true } },
          recordedByUser: true,
        },
      });
      if (existing) {
        return this.mapPaymentToDto(existing);
      }
    }

    // 2. Fetch Order & Validate Tenancy
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { customer: true, branch: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${dto.orderId}" not found`);
    }

    if (user.role === UserRole.BRANCH_ADMIN && user.branchId !== order.branchId) {
      throw new ForbiddenException("Cannot record payment for another branch's order");
    }

    // 3. Decimal Calculations & Overpayment Validation
    const paymentAmount = new Prisma.Decimal(dto.amount);
    if (paymentAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    const currentTotalPaid = order.totalPaid;
    const agreedPrice = order.totalAgreedPrice;
    const currentOutstanding = order.outstandingBalance;

    if (paymentAmount.greaterThan(currentOutstanding)) {
      throw new BadRequestException(
        `Payment amount of ${paymentAmount} ETB exceeds current outstanding balance of ${currentOutstanding} ETB. Overpayment is rejected.`,
      );
    }

    const newTotalPaid = currentTotalPaid.plus(paymentAmount);
    const newOutstanding = agreedPrice.minus(newTotalPaid);

    // Determine payment type
    let paymentType = dto.paymentType || PaymentType.PROGRESS_PAYMENT;
    if (newOutstanding.equals(0)) {
      paymentType = PaymentType.FINAL_SETTLEMENT;
    }

    // 4. Atomic Transaction: Payment record + Order balance update + Idempotency log
    return await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: paymentAmount,
          paymentType,
          paymentMethod: dto.paymentMethod || 'Cash',
          referenceNumber: dto.referenceNumber?.trim() || null,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          recordedByUserId: user.id,
          idempotencyKey: dto.idempotencyKey?.trim() || null,
        },
        include: {
          order: { include: { customer: true } },
          recordedByUser: true,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          totalPaid: newTotalPaid,
          outstandingBalance: newOutstanding,
        },
      });

      if (dto.idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            idempotencyKey: dto.idempotencyKey.trim(),
            userId: user.id,
            resourceType: 'PAYMENT',
            resourceId: payment.id,
            responsePayload: { paymentId: payment.id, amount: Number(paymentAmount) },
          },
        });
      }

      return this.mapPaymentToDto(payment);
    });
  }

  /**
   * List payments with optional order or branch filters
   */
  async listPayments(query: FinancialQueryDto, user: any): Promise<PaymentDto[]> {
    const where: Prisma.PaymentWhereInput = {};

    if (query.orderId) {
      where.orderId = query.orderId;
    }

    if (user.role === UserRole.BRANCH_ADMIN) {
      where.order = { branchId: user.branchId };
    } else if (query.branchId) {
      where.order = { branchId: query.branchId };
    }

    if (query.startDate || query.endDate) {
      where.paymentDate = {};
      if (query.startDate) where.paymentDate.gte = new Date(query.startDate);
      if (query.endDate) where.paymentDate.lte = new Date(query.endDate);
    }

    const payments = await this.prisma.payment.findMany({
      where,
      orderBy: { paymentDate: 'desc' },
      include: {
        order: { include: { customer: true } },
        recordedByUser: true,
      },
    });

    return payments.map((p) => this.mapPaymentToDto(p));
  }

  /**
   * Record a business operating expense.
   * Enforces branch tenancy and idempotency.
   */
  async recordExpense(dto: CreateExpenseDto, user: any): Promise<ExpenseDto> {
    // 1. Idempotency Check
    if (dto.idempotencyKey) {
      const existing = await this.prisma.expense.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
        include: { branch: true, recordedByUser: true },
      });
      if (existing) {
        return this.mapExpenseToDto(existing);
      }
    }

    // 2. Tenancy Validation
    let targetBranchId: string | null = null;
    if (user.role === UserRole.BRANCH_ADMIN) {
      targetBranchId = user.branchId; // Strictly forced to own branch
    } else {
      targetBranchId = dto.branchId || null; // Owner can specify branch or null for central
    }

    const expenseAmount = new Prisma.Decimal(dto.amount);
    if (expenseAmount.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Expense amount must be greater than zero');
    }

    return await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          branchId: targetBranchId,
          category: dto.category.trim(),
          amount: expenseAmount,
          description: dto.description.trim(),
          receiptRef: dto.receiptRef?.trim() || null,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
          recordedByUserId: user.id,
          idempotencyKey: dto.idempotencyKey?.trim() || null,
        },
        include: {
          branch: true,
          recordedByUser: true,
        },
      });

      if (dto.idempotencyKey) {
        await tx.idempotencyRecord.create({
          data: {
            idempotencyKey: dto.idempotencyKey.trim(),
            userId: user.id,
            resourceType: 'EXPENSE',
            resourceId: expense.id,
            responsePayload: { expenseId: expense.id, amount: Number(expenseAmount) },
          },
        });
      }

      return this.mapExpenseToDto(expense);
    });
  }

  /**
   * List business expenses
   */
  async listExpenses(query: FinancialQueryDto, user: any): Promise<ExpenseDto[]> {
    const where: Prisma.ExpenseWhereInput = {};

    if (user.role === UserRole.BRANCH_ADMIN) {
      where.branchId = user.branchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.category) {
      where.category = { equals: query.category, mode: 'insensitive' };
    }

    if (query.startDate || query.endDate) {
      where.expenseDate = {};
      if (query.startDate) where.expenseDate.gte = new Date(query.startDate);
      if (query.endDate) where.expenseDate.lte = new Date(query.endDate);
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        branch: true,
        recordedByUser: true,
      },
    });

    return expenses.map((e) => this.mapExpenseToDto(e));
  }

  /**
   * Authoritative Financial Summary and Profitability Formulas.
   * Separates revenue, cash received, receivables, COGS, and operating expenses.
   */
  async getFinancialSummary(query: FinancialQueryDto, user: any): Promise<FinancialSummaryDto> {
    const branchFilter = user.role === UserRole.BRANCH_ADMIN ? user.branchId : query.branchId;

    // 1. Fetch Orders
    const orderWhere: Prisma.OrderWhereInput = {};
    if (branchFilter) orderWhere.branchId = branchFilter;
    if (query.startDate || query.endDate) {
      orderWhere.createdAt = {};
      if (query.startDate) orderWhere.createdAt.gte = new Date(query.startDate);
      if (query.endDate) orderWhere.createdAt.lte = new Date(query.endDate);
    }

    const orders = await this.prisma.order.findMany({
      where: orderWhere,
      include: {
        currentStage: true,
        branch: true,
        consumptions: true,
      },
    });

    // 2. Fetch Payments
    const paymentWhere: Prisma.PaymentWhereInput = {};
    if (branchFilter) paymentWhere.order = { branchId: branchFilter };
    if (query.startDate || query.endDate) {
      paymentWhere.paymentDate = {};
      if (query.startDate) paymentWhere.paymentDate.gte = new Date(query.startDate);
      if (query.endDate) paymentWhere.paymentDate.lte = new Date(query.endDate);
    }

    const payments = await this.prisma.payment.findMany({
      where: paymentWhere,
    });

    // 3. Fetch Expenses
    const expenseWhere: Prisma.ExpenseWhereInput = {};
    if (branchFilter) expenseWhere.branchId = branchFilter;
    if (query.startDate || query.endDate) {
      expenseWhere.expenseDate = {};
      if (query.startDate) expenseWhere.expenseDate.gte = new Date(query.startDate);
      if (query.endDate) expenseWhere.expenseDate.lte = new Date(query.endDate);
    }

    const expenses = await this.prisma.expense.findMany({
      where: expenseWhere,
      include: { branch: true },
    });

    // 4. Perform Financial Formula Calculations
    let totalContractedRevenue = 0;
    let totalEarnedRevenue = 0;
    let totalReceivables = 0;
    let totalMaterialCost = 0;

    for (const ord of orders) {
      const agreed = Number(ord.totalAgreedPrice);
      const remaining = Number(ord.outstandingBalance);
      totalContractedRevenue += agreed;
      totalReceivables += remaining;

      // Material costs consumed for this order
      const ordMatCost = ord.consumptions.reduce((sum, c) => sum + Number(c.totalMaterialCost), 0);
      totalMaterialCost += ordMatCost;

      // Accrual Revenue Recognition: recognized when reaching final delivery stage
      if (ord.currentStage?.isFinalStage) {
        totalEarnedRevenue += agreed;
      }
    }

    const totalCashCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalOperatingExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Gross Profit: Earned Revenue minus Cost of Goods Sold (Materials)
    // If completed orders exist, use earned revenue; otherwise show performance based on total contracted
    const baseRevenue = totalEarnedRevenue > 0 ? totalEarnedRevenue : totalContractedRevenue;
    const grossProfit = baseRevenue - totalMaterialCost;
    const grossMarginPercentage =
      baseRevenue > 0 ? Math.round((grossProfit / baseRevenue) * 10000) / 100 : 0;

    // Net Profit: Gross Profit minus Operating Expenses
    const netProfit = grossProfit - totalOperatingExpenses;
    const netMarginPercentage =
      baseRevenue > 0 ? Math.round((netProfit / baseRevenue) * 10000) / 100 : 0;

    // Branch Breakdown
    const branches = await this.prisma.branch.findMany({ where: { isActive: true } });
    const branchBreakdown = branches.map((b) => {
      const bOrders = orders.filter((o) => o.branchId === b.id);
      const bOrdersValue = bOrders.reduce((sum, o) => sum + Number(o.totalAgreedPrice), 0);
      const bPayments = payments.filter((p) => {
        const ord = orders.find((o) => o.id === p.orderId);
        return ord?.branchId === b.id;
      });
      const bCollected = bPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const bExpenses = expenses.filter((e) => e.branchId === b.id);
      const bExpTotal = bExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

      return {
        branchId: b.id,
        branchName: b.name,
        totalOrdersValue: Math.round(bOrdersValue * 100) / 100,
        totalCashCollected: Math.round(bCollected * 100) / 100,
        totalExpenses: Math.round(bExpTotal * 100) / 100,
        netContribution: Math.round((bCollected - bExpTotal) * 100) / 100,
      };
    });

    return {
      period: query.startDate && query.endDate ? `${query.startDate} to ${query.endDate}` : 'All Time',
      totalContractedRevenue: Math.round(totalContractedRevenue * 100) / 100,
      totalEarnedRevenue: Math.round(totalEarnedRevenue * 100) / 100,
      totalCashCollected: Math.round(totalCashCollected * 100) / 100,
      totalReceivables: Math.round(totalReceivables * 100) / 100,
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      totalOperatingExpenses: Math.round(totalOperatingExpenses * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercentage,
      netProfit: Math.round(netProfit * 100) / 100,
      netMarginPercentage,
      branchBreakdown,
    };
  }

  private mapPaymentToDto(p: any): PaymentDto {
    return {
      id: p.id,
      orderId: p.orderId,
      orderNumber: p.order?.orderNumber || '',
      customerName: p.order?.customer?.fullName || 'Walk-In Customer',
      amount: Number(p.amount),
      paymentType: p.paymentType,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      paymentDate: p.paymentDate.toISOString(),
      recordedByUserName: p.recordedByUser?.fullName || 'System',
      recordedByUserId: p.recordedByUserId,
      idempotencyKey: p.idempotencyKey,
    };
  }

  private mapExpenseToDto(e: any): ExpenseDto {
    return {
      id: e.id,
      branchId: e.branchId,
      branchName: e.branch?.name || (e.branchId ? 'Dedicated Branch' : 'Central Enterprise Overhead'),
      category: e.category,
      amount: Number(e.amount),
      expenseDate: e.expenseDate.toISOString(),
      description: e.description,
      receiptRef: e.receiptRef,
      recordedByUserName: e.recordedByUser?.fullName || 'System',
      recordedByUserId: e.recordedByUserId,
      idempotencyKey: e.idempotencyKey,
    };
  }
}
