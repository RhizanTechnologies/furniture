import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import {
  ExecutiveDashboardAnalyticsDto,
  ProductPerformanceDto,
  CustomerPreferenceMetricsDto,
  PeriodicSalesTrendDto,
  UserRole,
} from '@furniture/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main Executive Dashboard Analytics
   * Authoritative, real-time metrics aggregated strictly from actual database records.
   */
  async getExecutiveDashboard(
    query: AnalyticsQueryDto,
    user: any,
  ): Promise<ExecutiveDashboardAnalyticsDto> {
    const branchId = user.role === UserRole.BRANCH_ADMIN ? user.branchId : query.branchId;

    // Date range resolution
    const { startDate, endDate, dateFilter } = this.resolveDateRange(query);

    // 1. Fetch Orders within date range
    const orderWhere: Prisma.OrderWhereInput = {};
    if (branchId) orderWhere.branchId = branchId;
    if (dateFilter) orderWhere.createdAt = dateFilter;

    const orders = await this.prisma.order.findMany({
      where: orderWhere,
      include: {
        items: { include: { product: true } },
        currentStage: true,
        consumptions: true,
        customer: true,
        branch: true,
      },
    });

    // 2. Fetch Payments within date range
    const paymentWhere: Prisma.PaymentWhereInput = {};
    if (branchId) paymentWhere.order = { branchId };
    if (dateFilter) paymentWhere.paymentDate = dateFilter;

    const payments = await this.prisma.payment.findMany({
      where: paymentWhere,
    });

    // 3. Fetch Expenses within date range
    const expenseWhere: Prisma.ExpenseWhereInput = {};
    if (branchId) expenseWhere.branchId = branchId;
    if (dateFilter) expenseWhere.expenseDate = dateFilter;

    const expenses = await this.prisma.expense.findMany({
      where: expenseWhere,
      include: { branch: true },
    });

    // 4. Fetch Raw Materials for Stock Valuation
    const materials = await this.prisma.rawMaterial.findMany({
      where: { isActive: true },
    });

    // 5. Calculate Financial Overview
    let contractedRevenue = 0;
    let earnedRevenue = 0;
    let outstandingReceivables = 0;
    let totalMaterialCosts = 0;

    for (const ord of orders) {
      const agreed = Number(ord.totalAgreedPrice);
      const remaining = Number(ord.outstandingBalance);
      contractedRevenue += agreed;
      outstandingReceivables += remaining;

      const matCost = ord.consumptions.reduce((sum, c) => sum + Number(c.totalMaterialCost), 0);
      totalMaterialCosts += matCost;

      if (ord.currentStage?.isFinalStage) {
        earnedRevenue += agreed;
      }
    }

    const cashCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const baseRevenue = earnedRevenue > 0 ? earnedRevenue : contractedRevenue;
    const grossProfit = baseRevenue - totalMaterialCosts;
    const grossMarginPercentage =
      baseRevenue > 0 ? Math.round((grossProfit / baseRevenue) * 10000) / 100 : 0;
    const netProfit = grossProfit - totalExpenses;
    const netMarginPercentage =
      baseRevenue > 0 ? Math.round((netProfit / baseRevenue) * 10000) / 100 : 0;

    // 6. Calculate Stock Overview
    let totalStockValue = 0;
    let lowStockAlertsCount = 0;
    let activeMaterialsCount = 0;

    for (const mat of materials) {
      const qty = Number(mat.currentStockQuantity);
      const cost = Number(mat.currentUnitCost);
      const alert = mat.reorderAlertQuantity ? Number(mat.reorderAlertQuantity) : null;

      if (qty > 0) activeMaterialsCount++;
      totalStockValue += qty * cost;
      if (alert !== null && qty <= alert) lowStockAlertsCount++;
    }

    // 7. Calculate Branch Performance Comparisons
    const allBranches = await this.prisma.branch.findMany({ where: { isActive: true } });
    const branchComparisons = allBranches.map((b) => {
      const bOrders = orders.filter((o) => o.branchId === b.id);
      const bRevenue = bOrders.reduce((sum, o) => sum + Number(o.totalAgreedPrice), 0);
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
        ordersCount: bOrders.length,
        totalRevenue: Math.round(bRevenue * 100) / 100,
        cashCollected: Math.round(bCollected * 100) / 100,
        expenses: Math.round(bExpTotal * 100) / 100,
        netProfitContribution: Math.round((bCollected - bExpTotal) * 100) / 100,
      };
    });

    // 8. Calculate Product Performance Analytics (Separate Revenue & Profitability)
    const productStats = this.calculateProductPerformance(orders);
    const topProductsByRevenue = [...productStats]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((p, idx) => ({ ...p, revenueRank: idx + 1 }));

    const topProductsByProfit = [...productStats]
      .sort((a, b) => b.grossProfit - a.grossProfit)
      .slice(0, 5)
      .map((p, idx) => ({ ...p, profitRank: idx + 1 }));

    const lowPerformingProducts = [...productStats]
      .sort((a, b) => a.totalRevenue - b.totalRevenue)
      .slice(0, 5);

    // 9. Calculate Customer Preference Metrics
    const customerPreferences = await this.calculateCustomerPreferences(orders, branchId);

    // 10. Periodic Sales Trends
    const salesTrends = this.calculatePeriodicTrends(orders, payments, expenses, query.period || 'monthly');

    return {
      period: query.period || 'monthly',
      dateRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
      financialOverview: {
        contractedRevenue: Math.round(contractedRevenue * 100) / 100,
        earnedRevenue: Math.round(earnedRevenue * 100) / 100,
        cashCollected: Math.round(cashCollected * 100) / 100,
        outstandingReceivables: Math.round(outstandingReceivables * 100) / 100,
        totalMaterialCosts: Math.round(totalMaterialCosts * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMarginPercentage,
        netProfit: Math.round(netProfit * 100) / 100,
        netMarginPercentage,
      },
      stockOverview: {
        totalStockValue: Math.round(totalStockValue * 100) / 100,
        activeMaterialsCount,
        lowStockAlertsCount,
      },
      branchComparisons,
      salesTrends,
      topProductsByRevenue,
      topProductsByProfit,
      lowPerformingProducts,
      customerPreferences,
    };
  }

  /**
   * Product Performance Analysis
   * Keeps revenue and profitability separate without conflating highest sales with highest margin.
   */
  private calculateProductPerformance(orders: any[]): ProductPerformanceDto[] {
    const productMap = new Map<string, ProductPerformanceDto>();

    for (const order of orders) {
      // Calculate material cost per item or distribute order material cost
      const orderMatCost = order.consumptions?.reduce(
        (sum: number, c: any) => sum + Number(c.totalMaterialCost),
        0,
      ) || 0;

      const totalItemCount = order.items?.length || 1;
      const matCostPerItem = orderMatCost / totalItemCount;

      for (const item of order.items || []) {
        const key = item.productId || item.itemDescription;
        const subtotal = Number(item.subtotal);
        const qty = item.quantity;
        const category = item.product?.category || 'Custom Bespoke';
        const name = item.product?.name || item.itemDescription;
        const sku = item.product?.sku || 'BESPOKE';

        const existing = productMap.get(key) || {
          productId: item.productId,
          sku,
          productName: name,
          category,
          unitsSold: 0,
          ordersCount: 0,
          totalRevenue: 0,
          estimatedMaterialCost: 0,
          grossProfit: 0,
          grossMarginPercentage: 0,
        };

        existing.unitsSold += qty;
        existing.ordersCount += 1;
        existing.totalRevenue += subtotal;
        existing.estimatedMaterialCost += matCostPerItem;

        productMap.set(key, existing);
      }
    }

    return Array.from(productMap.values()).map((p) => {
      const grossProfit = p.totalRevenue - p.estimatedMaterialCost;
      const grossMarginPercentage =
        p.totalRevenue > 0 ? Math.round((grossProfit / p.totalRevenue) * 10000) / 100 : 0;

      return {
        ...p,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        estimatedMaterialCost: Math.round(p.estimatedMaterialCost * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMarginPercentage,
      };
    });
  }

  /**
   * Customer Preference Metrics
   * Formulated strictly from recorded orders, repeat visits and category purchases.
   */
  private async calculateCustomerPreferences(
    orders: any[],
    branchId?: string,
  ): Promise<CustomerPreferenceMetricsDto> {
    const categoryCountMap = new Map<string, { count: number; spent: number }>();
    const customerOrderMap = new Map<string, { fullName: string; phone: string; count: number; spent: number }>();

    let totalItems = 0;
    for (const ord of orders) {
      const customer = ord.customer;
      if (customer) {
        const custRecord = customerOrderMap.get(customer.id) || {
          fullName: customer.fullName,
          phone: customer.phone,
          count: 0,
          spent: 0,
        };
        custRecord.count += 1;
        custRecord.spent += Number(ord.totalAgreedPrice);
        customerOrderMap.set(customer.id, custRecord);
      }

      for (const item of ord.items || []) {
        totalItems++;
        const cat = item.product?.category || 'Custom Bespoke';
        const current = categoryCountMap.get(cat) || { count: 0, spent: 0 };
        current.count += item.quantity;
        current.spent += Number(item.subtotal);
        categoryCountMap.set(cat, current);
      }
    }

    const categoryPreferences = Array.from(categoryCountMap.entries()).map(([category, data]) => ({
      category,
      ordersCount: data.count,
      totalSpent: Math.round(data.spent * 100) / 100,
      percentageOfOrders: totalItems > 0 ? Math.round((data.count / totalItems) * 1000) / 10 : 0,
    }));

    const customerList = Array.from(customerOrderMap.entries());
    const totalUniqueCustomers = customerList.length;
    const repeatCustomersCount = customerList.filter(([_, d]) => d.count > 1).length;
    const repeatCustomerRate =
      totalUniqueCustomers > 0 ? Math.round((repeatCustomersCount / totalUniqueCustomers) * 1000) / 10 : 0;

    const totalSpentAll = orders.reduce((sum, o) => sum + Number(o.totalAgreedPrice), 0);
    const averageOrderValue =
      orders.length > 0 ? Math.round((totalSpentAll / orders.length) * 100) / 100 : 0;

    const topLoyalCustomers = customerList
      .sort((a, b) => b[1].spent - a[1].spent)
      .slice(0, 5)
      .map(([id, d]) => ({
        customerId: id,
        fullName: d.fullName,
        phone: d.phone,
        ordersCount: d.count,
        totalSpent: Math.round(d.spent * 100) / 100,
      }));

    return {
      categoryPreferences,
      repeatCustomerRate,
      totalUniqueCustomers,
      averageOrderValue,
      topLoyalCustomers,
    };
  }

  /**
   * Periodic Sales Trends (Daily, Weekly, Monthly)
   */
  private calculatePeriodicTrends(
    orders: any[],
    payments: any[],
    expenses: any[],
    period: 'daily' | 'weekly' | 'monthly' | 'all',
  ): PeriodicSalesTrendDto[] {
    const trendMap = new Map<string, { label: string; count: number; revenue: number; cash: number; expenses: number }>();

    for (const ord of orders) {
      const d = new Date(ord.createdAt);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const entry = trendMap.get(key) || { label, count: 0, revenue: 0, cash: 0, expenses: 0 };
      entry.count += 1;
      entry.revenue += Number(ord.totalAgreedPrice);
      trendMap.set(key, entry);
    }

    for (const pay of payments) {
      const d = new Date(pay.paymentDate);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const entry = trendMap.get(key) || { label, count: 0, revenue: 0, cash: 0, expenses: 0 };
      entry.cash += Number(pay.amount);
      trendMap.set(key, entry);
    }

    for (const exp of expenses) {
      const d = new Date(exp.expenseDate);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const entry = trendMap.get(key) || { label, count: 0, revenue: 0, cash: 0, expenses: 0 };
      entry.expenses += Number(exp.amount);
      trendMap.set(key, entry);
    }

    return Array.from(trendMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([date, d]) => ({
        date,
        label: d.label,
        ordersCount: d.count,
        contractedRevenue: Math.round(d.revenue * 100) / 100,
        cashCollected: Math.round(d.cash * 100) / 100,
        expenses: Math.round(d.expenses * 100) / 100,
      }));
  }

  private resolveDateRange(query: AnalyticsQueryDto): {
    startDate?: Date;
    endDate?: Date;
    dateFilter?: { gte?: Date; lte?: Date };
  } {
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      return { startDate: start, endDate: end, dateFilter: { gte: start, lte: end } };
    }

    const now = new Date();
    if (query.period === 'daily') {
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return { startDate: dayAgo, endDate: now, dateFilter: { gte: dayAgo, lte: now } };
    }
    if (query.period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { startDate: weekAgo, endDate: now, dateFilter: { gte: weekAgo, lte: now } };
    }
    if (query.period === 'monthly') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: monthAgo, endDate: now, dateFilter: { gte: monthAgo, lte: now } };
    }

    return {};
  }
}
