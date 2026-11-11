import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ExecutiveDashboardAnalyticsDto,
  BranchDto,
  ProductPerformanceDto,
} from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart,
  Users,
  Boxes,
  Building2,
  Calendar,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Layers,
  ShoppingBag,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { isOwner } = useAuth();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [productView, setProductView] = useState<'revenue' | 'profit' | 'low'>('revenue');

  // Fetch Branches for filter
  const { data: branches = [] } = useQuery<BranchDto[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient<BranchDto[]>('/branches'),
    enabled: isOwner,
  });

  // Fetch Analytics Dashboard
  const { data: analytics, isLoading, error, refetch } = useQuery<ExecutiveDashboardAnalyticsDto>({
    queryKey: ['analytics-dashboard', period, selectedBranchId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate && endDate) {
        params.append('startDate', new Date(startDate).toISOString());
        params.append('endDate', new Date(endDate + 'T23:59:59').toISOString());
      } else {
        params.append('period', period);
      }
      if (selectedBranchId) params.append('branchId', selectedBranchId);
      return apiClient<ExecutiveDashboardAnalyticsDto>(`/analytics/dashboard?${params.toString()}`);
    },
  });

  const fin = analytics?.financialOverview;
  const stock = analytics?.stockOverview;
  const prefs = analytics?.customerPreferences;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Analytics & Intelligence"
        description="Comprehensive operational reporting, product profitability analysis, customer preferences, and comparative branch performance."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector */}
            <div className="bg-wood-50 border border-wood-200 rounded-lg p-0.5 flex space-x-0.5">
              {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    setStartDate('');
                    setEndDate('');
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                    period === p && !startDate
                      ? 'bg-wood-800 text-white shadow-sm'
                      : 'text-charcoal-600 hover:text-wood-900'
                  }`}
                >
                  {p === 'daily' ? '24h' : p === 'weekly' ? '7 Days' : p === 'monthly' ? '30 Days' : 'All Time'}
                </button>
              ))}
            </div>

            {/* Branch selector if Owner */}
            {isOwner && (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-wood-300 bg-background text-xs font-medium text-wood-900"
              >
                <option value="">All Branches (Enterprise)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        }
      />

      {/* Custom Date Range Controls */}
      <Card className="border-wood-200/80 bg-stone-50/60">
        <CardContent className="p-3 sm:p-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-stone-800">
              <Calendar className="w-4 h-4 text-wood-700 shrink-0" />
              <span>Custom Date Range:</span>
            </div>
            <div className="text-[11px] sm:text-xs text-stone-500 font-medium">
              Active: <span className="font-bold text-wood-950 capitalize">{analytics?.period || period}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center gap-2">
            <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-wood-200/90 shadow-xs flex-1">
              <span className="text-[11px] font-medium text-muted-foreground shrink-0 w-8 sm:w-auto">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-transparent text-xs font-mono text-stone-800 focus:outline-none cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-wood-200/90 shadow-xs flex-1">
              <span className="text-[11px] font-medium text-muted-foreground shrink-0 w-8 sm:w-auto">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-transparent text-xs font-mono text-stone-800 focus:outline-none cursor-pointer"
              />
            </div>

            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 self-end sm:self-center"
              >
                Clear Range
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingState message="Aggregating database business intelligence..." />
      ) : error ? (
        <ErrorState
          title="Could not load analytics"
          message={(error as Error).message}
          onRetry={refetch}
        />
      ) : (
        <>
          {/* Executive KPI Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
              <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
                <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500">
                  Contracted Sales Pipeline
                </CardDescription>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-wood-950 font-mono tracking-tight leading-snug sm:leading-normal">
                  {formatCurrency(fin?.contractedRevenue || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600 flex justify-between items-center">
                <span>Earned (Fulfilled):</span>
                <span className="font-mono font-bold text-wood-800">{formatCurrency(fin?.earnedRevenue || 0)}</span>
              </CardContent>
            </Card>

            <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
              <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
                <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500">
                  Cash Inflow Collected
                </CardDescription>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-800 font-mono tracking-tight leading-snug sm:leading-normal">
                  {formatCurrency(fin?.cashCollected || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600 flex justify-between items-center">
                <span>Pending Receivables:</span>
                <span className="font-mono font-bold text-amber-800">{formatCurrency(fin?.outstandingReceivables || 0)}</span>
              </CardContent>
            </Card>

            <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
              <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
                <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500 flex justify-between">
                  <span>Gross Profit</span>
                  <span className="font-mono font-bold text-wood-800 text-[10px]">{fin?.grossMarginPercentage || 0}% margin</span>
                </CardDescription>
                <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-wood-900 font-mono tracking-tight leading-snug sm:leading-normal">
                  {formatCurrency(fin?.grossProfit || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600 flex justify-between items-center">
                <span>COGS Material Costs:</span>
                <span className="font-mono font-medium text-stone-700">{formatCurrency(fin?.totalMaterialCosts || 0)}</span>
              </CardContent>
            </Card>

            <Card className={`border-wood-200/80 ${
              (fin?.netProfit || 0) >= 0 ? 'bg-gradient-to-br from-white to-emerald-50/40' : 'bg-rose-50/60'
            }`}>
              <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
                <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500 flex justify-between">
                  <span>Net Business Profit</span>
                  <span className="font-mono font-bold text-emerald-800 text-[10px]">{fin?.netMarginPercentage || 0}% net</span>
                </CardDescription>
                <CardTitle className={`text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight leading-snug sm:leading-normal ${
                  (fin?.netProfit || 0) >= 0 ? 'text-emerald-950' : 'text-rose-950'
                }`}>
                  {formatCurrency(fin?.netProfit || 0)}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600 flex justify-between items-center">
                <span>Operating Expenses:</span>
                <span className="font-mono font-medium text-rose-800">{formatCurrency(fin?.totalExpenses || 0)}</span>
              </CardContent>
            </Card>
          </div>

          {/* Periodic Sales Trend Visualization & Customer Preference Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales Activity Trend Chart */}
            <Card className="lg:col-span-2 border-wood-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-stone-900 flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-wood-700" />
                      <span>Periodic Sales & Revenue Activity</span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Contracted orders value versus cash collections over recent periods.
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <div className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-wood-700 inline-block" />
                      <span className="text-stone-600">Contracted Sales</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
                      <span className="text-stone-600">Cash Inflow</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {analytics?.salesTrends && analytics.salesTrends.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-48 flex items-end gap-2 pt-6 pb-2 border-b border-stone-200">
                      {analytics.salesTrends.map((trend) => {
                        const maxVal = Math.max(
                          ...analytics.salesTrends.map((t) => Math.max(t.contractedRevenue, t.cashCollected)),
                          1,
                        );
                        const revHeight = Math.max(4, Math.round((trend.contractedRevenue / maxVal) * 150));
                        const cashHeight = Math.max(4, Math.round((trend.cashCollected / maxVal) * 150));

                        return (
                          <div key={trend.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                            {/* Hover Tooltip */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-10 bg-stone-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap shadow-md">
                              <div>{trend.label}</div>
                              <div>Sales: {formatCurrency(trend.contractedRevenue)}</div>
                              <div>Cash: {formatCurrency(trend.cashCollected)}</div>
                            </div>

                            <div className="w-full flex items-end justify-center gap-0.5">
                              <div
                                style={{ height: `${revHeight}px` }}
                                className="w-full max-w-[14px] bg-wood-700 rounded-t hover:bg-wood-800 transition-colors"
                              />
                              <div
                                style={{ height: `${cashHeight}px` }}
                                className="w-full max-w-[14px] bg-emerald-600 rounded-t hover:bg-emerald-700 transition-colors"
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-1">
                              {trend.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-12">
                    No periodic sales recorded in this interval.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Customer Preference Metrics Card */}
            <Card className="border-wood-200 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-stone-900 flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-wood-700" />
                  <span>Customer Category Preferences</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Actual order distribution across furniture categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2 flex-1 flex flex-col justify-between">
                <div className="space-y-3">
                  {prefs?.categoryPreferences && prefs.categoryPreferences.length > 0 ? (
                    prefs.categoryPreferences.map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-stone-800">{cat.category}</span>
                          <span className="font-mono text-stone-600">
                            {formatCurrency(cat.totalSpent)} ({cat.percentageOfOrders}%)
                          </span>
                        </div>
                        <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-wood-700 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(5, cat.percentageOfOrders))}%` }}
                          />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic text-center py-6">
                      No category purchases recorded.
                    </p>
                  )}
                </div>

                {/* Loyalty & Frequency Insights */}
                <div className="p-3 bg-wood-50/60 rounded-lg border border-wood-200/80 text-xs space-y-1.5 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repeat Customer Rate:</span>
                    <span className="font-mono font-bold text-wood-950">{prefs?.repeatCustomerRate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average Order Value (AOV):</span>
                    <span className="font-mono font-bold text-emerald-800">
                      {formatCurrency(prefs?.averageOrderValue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unique Clients Active:</span>
                    <span className="font-mono font-bold text-stone-800">{prefs?.totalUniqueCustomers || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Product Performance Analytics (Separates Revenue & Profitability) */}
          <Card className="border-wood-200">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-stone-900 flex items-center space-x-2">
                    <Award className="w-4 h-4 text-wood-700" />
                    <span>Product Catalog Performance Analysis</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Revenue and profitability are tracked separately to distinguish high-sales models from high-margin furniture.
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant={productView === 'revenue' ? 'default' : 'outline'}
                    onClick={() => setProductView('revenue')}
                    className="flex-1 sm:flex-none text-xs h-8 px-2.5 whitespace-nowrap"
                  >
                    Top by Revenue
                  </Button>
                  <Button
                    size="sm"
                    variant={productView === 'profit' ? 'default' : 'outline'}
                    onClick={() => setProductView('profit')}
                    className="flex-1 sm:flex-none text-xs h-8 px-2.5 whitespace-nowrap"
                  >
                    Top by Profit
                  </Button>
                  <Button
                    size="sm"
                    variant={productView === 'low' ? 'default' : 'outline'}
                    onClick={() => setProductView('low')}
                    className="flex-1 sm:flex-none text-xs h-8 px-2.5 whitespace-nowrap"
                  >
                    Low Performing
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const list: ProductPerformanceDto[] =
                  productView === 'revenue'
                    ? analytics?.topProductsByRevenue || []
                    : productView === 'profit'
                    ? analytics?.topProductsByProfit || []
                    : analytics?.lowPerformingProducts || [];

                if (list.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground italic text-center py-8">
                      No product sales recorded in this interval.
                    </p>
                  );
                }

                return (
                  <>
                    {/* Phone & Tablet Responsive Cards (lg:hidden) */}
                    <div className="lg:hidden space-y-3">
                      {list.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="h-6 w-6 rounded-full bg-wood-100 text-wood-900 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="font-semibold text-stone-900 text-xs sm:text-sm">
                                  {p.productName}
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  {p.sku}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Badge variant="outline" className="text-[10px]">
                                {p.category}
                              </Badge>
                              <Badge variant="wood" className="text-[10px]">
                                {p.unitsSold} sold
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-stone-200 text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Revenue</span>
                              <span className="font-mono font-bold text-stone-900 text-xs">
                                {formatCurrency(p.totalRevenue)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">COGS</span>
                              <span className="font-mono text-stone-600 text-xs">
                                {formatCurrency(p.estimatedMaterialCost)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Gross Profit</span>
                              <span className="font-mono font-bold text-emerald-800 text-xs">
                                {formatCurrency(p.grossProfit)}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Margin</span>
                              <span className="font-mono font-bold text-wood-900 text-xs">
                                {p.grossMarginPercentage}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop Table View (hidden on mobile and tablet) */}
                    <div className="hidden lg:block overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-wood-50/50">
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Furniture Model</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Units Sold</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                            <TableHead className="text-right">Allocated COGS</TableHead>
                            <TableHead className="text-right">Gross Profit</TableHead>
                            <TableHead className="text-right">Gross Margin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.map((p, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="font-bold text-xs font-mono text-wood-800">
                                #{idx + 1}
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-stone-900 text-xs">{p.productName}</div>
                                <div className="font-mono text-[10px] text-muted-foreground">{p.sku}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[10px]">
                                  {p.category}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {p.unitsSold}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-stone-900">
                                {formatCurrency(p.totalRevenue)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-stone-600">
                                {formatCurrency(p.estimatedMaterialCost)}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-emerald-800">
                                {formatCurrency(p.grossProfit)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs font-semibold text-wood-900">
                                {p.grossMarginPercentage}%
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          {/* Branch Comparative Matrix & Top Loyal Clients */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branch Comparisons */}
            <Card className="border-wood-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-stone-900 flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-wood-700" />
                  <span>Comparative Workshop Performance</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Sales orders, cash inflow, expenses and net operating contribution by workshop location.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Phone & Tablet Responsive Cards (sm:hidden) */}
                <div className="sm:hidden space-y-3">
                  {analytics?.branchComparisons?.map((b) => (
                    <div
                      key={b.branchId}
                      className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-900 text-sm">
                          {b.branchName}
                        </span>
                        <Badge variant="wood" className="text-[10px]">
                          {b.ordersCount} Orders
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-dashed border-stone-200 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Sales</span>
                          <span className="font-mono font-bold text-stone-900 text-[11px]">
                            {formatCurrency(b.totalRevenue)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Expenses</span>
                          <span className="font-mono text-rose-800 text-[11px]">
                            {formatCurrency(b.expenses)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Net Profit</span>
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              b.netProfitContribution >= 0 ? 'text-emerald-900' : 'text-rose-900'
                            }`}
                          >
                            {formatCurrency(b.netProfitContribution)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop/Tablet Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-wood-50/50">
                      <TableRow>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-center">Orders</TableHead>
                        <TableHead className="text-right">Sales Revenue</TableHead>
                        <TableHead className="text-right">Expenses</TableHead>
                        <TableHead className="text-right">Net Contribution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics?.branchComparisons?.map((b) => (
                        <TableRow key={b.branchId}>
                          <TableCell className="font-semibold text-xs text-stone-900">
                            {b.branchName}
                          </TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {b.ordersCount}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-stone-900">
                            {formatCurrency(b.totalRevenue)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-rose-800">
                            {formatCurrency(b.expenses)}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-xs font-bold ${
                            b.netProfitContribution >= 0 ? 'text-emerald-900' : 'text-rose-900'
                          }`}>
                            {formatCurrency(b.netProfitContribution)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Top Customer Lifetime Value */}
            <Card className="border-wood-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-stone-900 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-wood-700" />
                  <span>Top Customer Lifetime Spend</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Most frequent and highest spend showroom clients from actual contract records.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {prefs?.topLoyalCustomers && prefs.topLoyalCustomers.length > 0 ? (
                  <>
                    {/* Phone & Tablet Responsive Cards (sm:hidden) */}
                    <div className="sm:hidden space-y-3">
                      {prefs.topLoyalCustomers.map((c) => (
                        <div
                          key={c.customerId}
                          className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-stone-900 text-sm">
                                {c.fullName}
                              </div>
                              <div className="font-mono text-xs text-stone-600">
                                {c.phone}
                              </div>
                            </div>
                            <Badge variant="wood" className="text-[10px]">
                              {c.ordersCount} Orders
                            </Badge>
                          </div>

                          <div className="pt-2 border-t border-dashed border-stone-200 flex items-center justify-between text-xs">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">
                              Lifetime Value
                            </span>
                            <span className="font-mono font-bold text-emerald-800 text-sm">
                              {formatCurrency(c.totalSpent)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop/Tablet Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-wood-50/50">
                          <TableRow>
                            <TableHead>Client Name</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead className="text-center">Orders Placed</TableHead>
                            <TableHead className="text-right">Lifetime Value (ETB)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {prefs.topLoyalCustomers.map((c) => (
                            <TableRow key={c.customerId}>
                              <TableCell className="font-semibold text-xs text-stone-900">
                                {c.fullName}
                              </TableCell>
                              <TableCell className="font-mono text-xs text-stone-600">
                                {c.phone}
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {c.ordersCount}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-xs text-emerald-800">
                                {formatCurrency(c.totalSpent)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center py-8">
                    No customer purchase data available.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
export default AnalyticsPage;
