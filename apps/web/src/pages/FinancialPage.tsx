import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  PaymentDto,
  ExpenseDto,
  FinancialSummaryDto,
  OrderDto,
  BranchDto,
  createPaymentSchema,
  createExpenseSchema,
  CreatePaymentInput,
  CreateExpenseInput,
  PaymentType,
} from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { RecordSyncBadge } from '@/components/ui/RecordSyncBadge';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/sync-engine';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import {
  DollarSign,
  Plus,
  Search,
  ArrowDownToLine,
  TrendingUp,
  Receipt,
  CreditCard,
  Building2,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
  Percent,
} from 'lucide-react';

export const FinancialPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { isOwner } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'payments' | 'expenses' | 'breakdown'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [paymentsPage, setPaymentsPage] = useState<number>(1);
  const [expensesPage, setExpensesPage] = useState<number>(1);
  const PAGE_SIZE = 10;

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Financial Summary
  const { data: summary, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useQuery<FinancialSummaryDto>({
    queryKey: ['financial-summary'],
    queryFn: () => apiClient<FinancialSummaryDto>('/financial/summary'),
  });

  // 2. Fetch Payments with Dexie cache & pending local records
  const { data: payments = [], isLoading: isPaymentsLoading } = useQuery<Array<PaymentDto & { isPendingSync?: boolean }>>({
    queryKey: ['payments'],
    queryFn: async (): Promise<Array<PaymentDto & { isPendingSync?: boolean }>> => {
      try {
        const serverPayments = await apiClient<PaymentDto[]>('/payments');
        for (const p of serverPayments) {
          await db.payments.put({
            id: p.id,
            orderId: p.orderId,
            amount: p.amount,
            paymentType: p.paymentType,
            paymentMethod: p.paymentMethod,
            referenceNumber: p.referenceNumber,
            paymentDate: p.paymentDate,
            isPendingSync: false,
          });
        }
        const localPending = await db.payments.filter((p) => p.isPendingSync === true).toArray();
        const pendingMapped = localPending.map((p) => ({
          ...p,
          recordedByUserId: 'local-device',
          orderNumber: 'LOCAL-PENDING',
          customerName: 'Pending Sync Customer',
          branchName: 'Local Branch',
          recordedByUserName: 'Current Device',
          isPendingSync: true,
        }));
        return [...pendingMapped, ...serverPayments] as any;
      } catch (e) {
        const local = await db.payments.toArray();
        return local.map((p) => ({
          ...p,
          recordedByUserId: 'local-device',
          orderNumber: 'LOCAL-OFFLINE',
          customerName: 'Offline Record',
          branchName: 'Local Branch',
          recordedByUserName: 'Offline Staff',
          isPendingSync: p.isPendingSync,
        })) as any;
      }
    },
  });

  // 3. Fetch Expenses with Dexie cache & pending local records
  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery<Array<ExpenseDto & { isPendingSync?: boolean }>>({
    queryKey: ['expenses', selectedCategory],
    queryFn: async (): Promise<Array<ExpenseDto & { isPendingSync?: boolean }>> => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);

      try {
        const serverExpenses = await apiClient<ExpenseDto[]>(`/expenses?${params.toString()}`);
        for (const exp of serverExpenses) {
          await db.expenses.put({
            id: exp.id,
            branchId: exp.branchId,
            category: exp.category,
            amount: exp.amount,
            expenseDate: exp.expenseDate,
            description: exp.description,
            receiptRef: exp.receiptRef,
            isPendingSync: false,
          });
        }
        const localPending = await db.expenses.filter((e) => e.isPendingSync === true).toArray();
        const pendingMapped = localPending.map((e) => ({
          ...e,
          recordedByUserId: 'local-device',
          branchName: 'Local Branch',
          recordedByUserName: 'Current Device',
          isPendingSync: true,
        }));
        return [...pendingMapped, ...serverExpenses] as any;
      } catch (e) {
        const local = await db.expenses.toArray();
        return local.map((e) => ({
          ...e,
          recordedByUserId: 'local-device',
          branchName: 'Local Branch',
          recordedByUserName: 'Offline Staff',
          isPendingSync: e.isPendingSync,
        })) as any;
      }
    },
  });

  // 4. Fetch Active Orders for Payment Dialog
  const { data: activeOrders = [] } = useQuery<OrderDto[]>({
    queryKey: ['orders-for-payment'],
    queryFn: () => apiClient<OrderDto[]>('/orders'),
    enabled: isPaymentOpen,
  });

  // 5. Fetch Branches for Expense Dialog (Owner only)
  const { data: branches = [] } = useQuery<BranchDto[]>({
    queryKey: ['branches-for-expense'],
    queryFn: () => apiClient<BranchDto[]>('/branches'),
    enabled: isExpenseOpen && isOwner,
  });

  // Payment Form
  const paymentForm = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      orderId: '',
      amount: 0,
      paymentType: PaymentType.PROGRESS_PAYMENT,
      paymentMethod: 'Cash',
      referenceNumber: '',
    },
  });

  // Expense Form
  const expenseForm = useForm<CreateExpenseInput>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      branchId: '',
      category: 'Workshop Supplies',
      amount: 0,
      description: '',
      receiptRef: '',
    },
  });

  // Payment Mutation
  const paymentMutation = useMutation({
    mutationFn: (data: CreatePaymentInput) =>
      apiClient<PaymentDto>('/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      setIsPaymentOpen(false);
      paymentForm.reset();
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to record payment');
    },
  });

  // Expense Mutation
  const expenseMutation = useMutation({
    mutationFn: (data: CreateExpenseInput) =>
      apiClient<ExpenseDto>('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          branchId: data.branchId ? data.branchId : null,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      setIsExpenseOpen(false);
      expenseForm.reset();
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to record expense');
    },
  });

  const handlePaymentSubmit = async (data: CreatePaymentInput) => {
    if (!navigator.onLine) {
      const tempId = `temp-pay-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'PAYMENT',
        action: 'CREATE',
        payload: data,
        tempEntityId: tempId,
      });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsPaymentOpen(false);
      paymentForm.reset();
      return;
    }

    try {
      await paymentMutation.mutateAsync(data);
    } catch (err: any) {
      const tempId = `temp-pay-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'PAYMENT',
        action: 'CREATE',
        payload: data,
        tempEntityId: tempId,
      });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setIsPaymentOpen(false);
      paymentForm.reset();
    }
  };

  const handleExpenseSubmit = async (data: CreateExpenseInput) => {
    const payload = {
      ...data,
      branchId: data.branchId ? data.branchId : null,
    };

    if (!navigator.onLine) {
      const tempId = `temp-exp-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'EXPENSE',
        action: 'CREATE',
        payload,
        tempEntityId: tempId,
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsExpenseOpen(false);
      expenseForm.reset();
      return;
    }

    try {
      await expenseMutation.mutateAsync(data);
    } catch (err: any) {
      const tempId = `temp-exp-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'EXPENSE',
        action: 'CREATE',
        payload,
        tempEntityId: tempId,
      });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setIsExpenseOpen(false);
      expenseForm.reset();
    }
  };

  // Filtered lists
  const ordersWithBalance = activeOrders.filter((o) => o.outstandingBalance > 0);
  const selectedOrderId = paymentForm.watch('orderId');
  const selectedOrderObj = activeOrders.find((o) => o.id === selectedOrderId);

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.orderNumber.toLowerCase().includes(term) ||
      p.customerName.toLowerCase().includes(term) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(term))
    );
  });

  const filteredExpenses = expenses.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.description.toLowerCase().includes(term) ||
      e.category.toLowerCase().includes(term) ||
      (e.receiptRef && e.receiptRef.toLowerCase().includes(term))
    );
  });

  const paginatedPayments = filteredPayments.slice(
    (paymentsPage - 1) * PAGE_SIZE,
    paymentsPage * PAGE_SIZE
  );

  const paginatedExpenses = filteredExpenses.slice(
    (expensesPage - 1) * PAGE_SIZE,
    expensesPage * PAGE_SIZE
  );

  const expenseCategories = [
    'ALL',
    'Workshop Supplies',
    'Utilities',
    'Rent',
    'Transportation & Delivery',
    'Maintenance',
    'Marketing',
    'Other',
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('finance.title', 'Financial Management & Accounting')}
        description={t('finance.subtitle', 'Monitor cash inflows, record order payments and progress disbursements, log operational expenses, and track net enterprise profit.')}
        action={
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setIsPaymentOpen(true)}
              className="flex-1 sm:flex-none bg-wood-700 hover:bg-wood-800 text-white space-x-1 sm:space-x-1.5 text-xs px-2.5 sm:px-3 h-8 sm:h-9"
            >
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              <span>{t('orders.recordPayment', 'Record Payment')}</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsExpenseOpen(true)}
              className="flex-1 sm:flex-none space-x-1 sm:space-x-1.5 border-wood-300 text-wood-900 text-xs px-2.5 sm:px-3 h-8 sm:h-9"
            >
              <Receipt className="h-3.5 w-3.5 shrink-0" />
              <span>{t('finance.recordExpenseBtn', 'Record Expense')}</span>
            </Button>
          </div>
        }
      />

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{t('common.warning', 'Financial Alert')}</p>
            <p>{actionError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
            {t('common.close', 'Dismiss')}
          </Button>
        </div>
      )}

      {/* Authoritative Financial Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500">
              {t('finance.totalCollected', 'Cash Inflow Collected')}
            </CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-emerald-800 font-mono tracking-tight leading-snug sm:leading-normal">
              {formatCurrency(summary?.totalCashCollected || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
            {t('finance.subtitle', 'Total payments received across prepayments and progress settlements')}
          </CardContent>
        </Card>

        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500">
              {t('finance.pendingReceivables', 'Outstanding Receivables')}
            </CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-amber-800 font-mono tracking-tight leading-snug sm:leading-normal">
              {formatCurrency(summary?.totalReceivables || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
            {t('orderDetail.balanceRemaining', 'Remaining unpaid balances owed by customers on active orders')}
          </CardContent>
        </Card>

        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500">
              {t('finance.totalExpenses', 'Operating Expenses')}
            </CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-rose-800 font-mono tracking-tight leading-snug sm:leading-normal">
              {formatCurrency(summary?.totalOperatingExpenses || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
            Overhead, workshop supplies, utilities and branch expenses
          </CardContent>
        </Card>

        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500 flex items-center justify-between">
              <span>{t('finance.grossProfit', 'Gross Profit')}</span>
              <span className="font-mono text-[10px] text-wood-700 font-bold">
                {summary?.grossMarginPercentage || 0}% margin
              </span>
            </CardDescription>
            <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-wood-950 font-mono tracking-tight leading-snug sm:leading-normal">
              {formatCurrency(summary?.grossProfit || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
            {t('orderDetail.materialCostSummary', 'Order revenue minus frozen material costs (COGS)')}
          </CardContent>
        </Card>

        <Card className={`border-wood-200/80 ${
          (summary?.netProfit || 0) >= 0 ? 'bg-gradient-to-br from-white to-emerald-50/40' : 'bg-rose-50/60'
        }`}>
          <CardHeader className="p-3.5 sm:p-5 pb-1 sm:pb-2">
            <CardDescription className="text-[11px] sm:text-xs uppercase font-medium tracking-wider text-charcoal-500 flex items-center justify-between">
              <span>{t('finance.netProfit', 'Net Business Profit')}</span>
              <span className="font-mono text-[10px] text-emerald-700 font-bold">
                {summary?.netMarginPercentage || 0}% net
              </span>
            </CardDescription>
            <CardTitle className={`text-lg sm:text-xl lg:text-2xl font-bold font-mono tracking-tight leading-snug sm:leading-normal ${
              (summary?.netProfit || 0) >= 0 ? 'text-emerald-900' : 'text-rose-900'
            }`}>
              {formatCurrency(summary?.netProfit || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3.5 sm:p-5 pt-0 text-[11px] sm:text-xs text-charcoal-600">
            {t('finance.subtitle', 'Gross profit minus total operating overhead')}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-wood-200 overflow-x-auto no-scrollbar">
        <div className="flex space-x-3 sm:space-x-6 min-w-max pb-px">
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-2.5 pt-1 px-1 sm:px-0 flex items-center space-x-1.5 sm:space-x-2 border-b-2 transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
              activeTab === 'payments'
                ? 'border-wood-800 text-wood-950 font-bold'
                : 'border-transparent text-charcoal-500 hover:text-wood-700'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>{t('finance.paymentsTab', 'Payments Ledger')} ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`pb-2.5 pt-1 px-1 sm:px-0 flex items-center space-x-1.5 sm:space-x-2 border-b-2 transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
              activeTab === 'expenses'
                ? 'border-wood-800 text-wood-950 font-bold'
                : 'border-transparent text-charcoal-500 hover:text-wood-700'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span>{t('finance.expensesTab', 'Expenses Ledger')} ({expenses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('breakdown')}
            className={`pb-2.5 pt-1 px-1 sm:px-0 flex items-center space-x-1.5 sm:space-x-2 border-b-2 transition-all whitespace-nowrap text-xs sm:text-sm font-semibold shrink-0 ${
              activeTab === 'breakdown'
                ? 'border-wood-800 text-wood-950 font-bold'
                : 'border-transparent text-charcoal-500 hover:text-wood-700'
            }`}
          >
            <Building2 className="w-4 h-4 shrink-0" />
            <span>{t('finance.branchesTab', 'Branch Contributions')}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: PAYMENTS LEDGER */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <Card className="border-wood-200/90">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order #, customer or ref..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPaymentsPage(1);
                  }}
                  className="pl-9 h-9"
                />
              </div>

              <div className="text-xs text-muted-foreground font-medium">
                Showing {filteredPayments.length} recorded payments
              </div>
            </CardContent>
          </Card>

          {isPaymentsLoading ? (
            <LoadingState message="Loading payment ledger..." />
          ) : filteredPayments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <CreditCard className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-stone-800">No Payments Recorded</h3>
                <p className="text-sm text-stone-500 mt-1 mb-4">
                  {searchTerm ? 'No payments match your search.' : 'Record order prepayments or progress payments.'}
                </p>
                <Button onClick={() => setIsPaymentOpen(true)} className="bg-wood-600 hover:bg-wood-700">
                  <Plus className="w-4 h-4 mr-2" /> Record First Payment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Phone & Tablet Responsive Cards (lg:hidden) */}
              <div className="lg:hidden space-y-3">
                {paginatedPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-wood-800">
                          {p.orderNumber}
                        </span>
                        <RecordSyncBadge isPendingSync={p.isPendingSync} />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          p.paymentType === PaymentType.FINAL_SETTLEMENT
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : p.paymentType === PaymentType.PREPAYMENT
                            ? 'bg-wood-50 text-wood-800 border-wood-300'
                            : 'bg-stone-50 text-stone-800 border-stone-300'
                        }`}
                      >
                        {p.paymentType}
                      </Badge>
                    </div>

                    <div className="flex items-start justify-between text-xs">
                      <div>
                        <div className="font-semibold text-stone-900">{p.customerName}</div>
                        <div className="text-[11px] text-muted-foreground">{new Date(p.paymentDate).toLocaleDateString()}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-muted-foreground block font-bold">Amount Paid</span>
                        <span className="font-mono font-bold text-sm text-emerald-800">
                          {formatCurrency(p.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-dashed border-stone-200 flex items-center justify-between text-[11px] text-stone-600">
                      <span>Method: <strong className="font-medium text-stone-800">{p.paymentMethod}</strong></span>
                      {p.referenceNumber && <span className="font-mono">Ref: {p.referenceNumber}</span>}
                    </div>

                    <div className="text-[10px] text-muted-foreground flex justify-between">
                      <span>Recorded by: {p.recordedByUserName || 'Staff'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (lg:block) */}
              <Card className="hidden lg:block border-wood-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-wood-50/50">
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount (ETB)</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference / Txn #</TableHead>
                      <TableHead>Logged By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPayments.map((p) => (
                      <TableRow key={p.id} className="hover:bg-wood-50/30">
                        <TableCell className="text-xs">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-bold text-wood-800">
                          {p.orderNumber}
                        </TableCell>
                        <TableCell className="font-medium text-xs text-stone-900">
                          {p.customerName}
                        </TableCell>
                        <TableCell>
                          <RecordSyncBadge isPendingSync={p.isPendingSync} />
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-emerald-800">
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              p.paymentType === PaymentType.FINAL_SETTLEMENT
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : p.paymentType === PaymentType.PREPAYMENT
                                ? 'bg-wood-50 text-wood-800 border-wood-300'
                                : 'bg-stone-50 text-stone-800 border-stone-300'
                            }`}
                          >
                            {p.paymentType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{p.paymentMethod}</TableCell>
                        <TableCell className="font-mono text-xs text-stone-600">
                          {p.referenceNumber || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.recordedByUserName}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Payments Pagination Controls */}
              <Pagination
                currentPage={paymentsPage}
                totalItems={filteredPayments.length}
                pageSize={PAGE_SIZE}
                onPageChange={setPaymentsPage}
              />
            </>
          )}
        </div>
      )}

      {/* TAB 2: EXPENSES LEDGER */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <Card className="border-wood-200/90">
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description, category or ref..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setExpensesPage(1);
                  }}
                  className="pl-9 h-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {expenseCategories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setExpensesPage(1);
                    }}
                    className="text-xs h-8 px-3"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {isExpensesLoading ? (
            <LoadingState message="Loading expense ledger..." />
          ) : filteredExpenses.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Receipt className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-stone-800">No Expenses Recorded</h3>
                <p className="text-sm text-stone-500 mt-1 mb-4">
                  {searchTerm || selectedCategory !== 'ALL'
                    ? 'No expenses match your search.'
                    : 'Log workshop operational overhead, rent or utility bills.'}
                </p>
                <Button onClick={() => setIsExpenseOpen(true)} className="bg-wood-600 hover:bg-wood-700">
                  <Plus className="w-4 h-4 mr-2" /> Log First Expense
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Phone & Tablet Responsive Cards (lg:hidden) */}
              <div className="lg:hidden space-y-3">
                {paginatedExpenses.map((e) => (
                  <div
                    key={e.id}
                    className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-stone-900 text-xs">
                          {e.branchName || 'Central'}
                        </span>
                        <RecordSyncBadge isPendingSync={e.isPendingSync} />
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {e.category}
                      </Badge>
                    </div>

                    <div className="flex items-start justify-between text-xs">
                      <div className="text-stone-800 line-clamp-2 max-w-[70%]">
                        {e.description}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-muted-foreground block font-bold">Expense</span>
                        <span className="font-mono font-bold text-sm text-rose-800">
                          {formatCurrency(e.amount)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-dashed border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
                      <span>Date: {new Date(e.expenseDate).toLocaleDateString()}</span>
                      {e.receiptRef && <span className="font-mono">Ref: {e.receiptRef}</span>}
                    </div>

                    <div className="text-[10px] text-muted-foreground flex justify-between">
                      <span>Logged by: {e.recordedByUserName || 'Staff'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (lg:block) */}
              <Card className="hidden lg:block border-wood-200 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-wood-50/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Location / Branch</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount (ETB)</TableHead>
                      <TableHead>Receipt / Voucher Ref</TableHead>
                      <TableHead>Logged By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedExpenses.map((e) => (
                      <TableRow key={e.id} className="hover:bg-wood-50/30">
                        <TableCell className="text-xs">
                          {new Date(e.expenseDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-stone-900">
                          {e.branchName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {e.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <RecordSyncBadge isPendingSync={e.isPendingSync} />
                        </TableCell>
                        <TableCell className="text-xs text-stone-800 max-w-xs truncate">
                          {e.description}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-sm text-rose-800">
                          {formatCurrency(e.amount)}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-stone-600">
                          {e.receiptRef || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {e.recordedByUserName}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Expenses Pagination Controls */}
              <Pagination
                currentPage={expensesPage}
                totalItems={filteredExpenses.length}
                pageSize={PAGE_SIZE}
                onPageChange={setExpensesPage}
              />
            </>
          )}
        </div>
      )}

      {/* TAB 3: BRANCH CONTRIBUTIONS BREAKDOWN */}
      {activeTab === 'breakdown' && (
        <div className="space-y-4">
          <Card className="border-wood-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-stone-900">
                Branch Financial Performance Comparison
              </CardTitle>
              <CardDescription className="text-xs">
                Authoritative breakdown of money collected versus operating expenses per location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Phone & Tablet Responsive Cards (lg:hidden) */}
              <div className="lg:hidden space-y-3">
                {summary?.branchBreakdown?.map((b) => (
                  <div
                    key={b.branchId}
                    className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between font-semibold text-stone-900 text-sm">
                      <span>{b.branchName}</span>
                      <span className={`font-mono font-bold ${
                        b.netContribution >= 0 ? 'text-emerald-900' : 'text-rose-900'
                      }`}>
                        Net: {formatCurrency(b.netContribution)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-stone-50 font-mono">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block font-sans">Cash Inflow</span>
                        <span className="text-emerald-800 font-bold">{formatCurrency(b.totalCashCollected)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block font-sans">Branch Expenses</span>
                        <span className="text-rose-800 font-bold">{formatCurrency(b.totalExpenses)}</span>
                      </div>
                      <div className="col-span-2 pt-1 border-t border-dashed border-stone-200 flex justify-between text-[11px] font-sans">
                        <span className="text-stone-500">Contracted Orders:</span>
                        <span className="font-mono text-stone-900 font-medium">{formatCurrency(b.totalOrdersValue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (lg:block) */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-wood-50/50">
                    <TableRow>
                      <TableHead>Branch Name</TableHead>
                      <TableHead className="text-right">Contracted Orders Value</TableHead>
                      <TableHead className="text-right">Cash Inflow Collected</TableHead>
                      <TableHead className="text-right">Branch Expenses</TableHead>
                      <TableHead className="text-right">Net Operating Contribution</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary?.branchBreakdown?.map((b) => (
                      <TableRow key={b.branchId}>
                        <TableCell className="font-semibold text-stone-900 text-sm">
                          {b.branchName}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatCurrency(b.totalOrdersValue)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-emerald-800 font-bold">
                          {formatCurrency(b.totalCashCollected)}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-rose-800">
                          {formatCurrency(b.totalExpenses)}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold text-sm ${
                          b.netContribution >= 0 ? 'text-emerald-900' : 'text-rose-900'
                        }`}>
                          {formatCurrency(b.netContribution)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Order Payment</DialogTitle>
            <DialogDescription>
              Record customer progress payment or final settlement against an outstanding order.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Select Order <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                {...paymentForm.register('orderId')}
                onChange={(e) => {
                  paymentForm.setValue('orderId', e.target.value);
                  const found = activeOrders.find((o) => o.id === e.target.value);
                  if (found) {
                    paymentForm.setValue('amount', found.outstandingBalance);
                  }
                }}
              >
                <option value="">-- Choose Order with Balance --</option>
                {ordersWithBalance.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} — {o.customer?.fullName} (Balance: {formatCurrency(o.outstandingBalance)})
                  </option>
                ))}
              </select>
              {paymentForm.formState.errors.orderId && (
                <p className="text-xs text-red-500 mt-1">
                  {paymentForm.formState.errors.orderId.message}
                </p>
              )}
            </div>

            {selectedOrderObj && (
              <div className="p-3 bg-wood-50 rounded-lg border border-wood-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract Value:</span>
                  <span className="font-mono font-medium">{formatCurrency(selectedOrderObj.totalAgreedPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Paid:</span>
                  <span className="font-mono text-emerald-700 font-medium">{formatCurrency(selectedOrderObj.totalPaid)}</span>
                </div>
                <div className="flex justify-between font-bold pt-1 border-t border-wood-200">
                  <span className="text-wood-950">Current Outstanding:</span>
                  <span className="font-mono text-amber-900">{formatCurrency(selectedOrderObj.outstandingBalance)}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Payment Amount (ETB) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedOrderObj?.outstandingBalance || undefined}
                  placeholder="0.00"
                  {...paymentForm.register('amount', { valueAsNumber: true })}
                />
                {paymentForm.formState.errors.amount && (
                  <p className="text-xs text-red-500 mt-1">
                    {paymentForm.formState.errors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  {...paymentForm.register('paymentMethod')}
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer (CBE / Awash)</option>
                  <option value="Telebirr">Telebirr</option>
                  <option value="CBE Birr">CBE Birr</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Reference / Transaction #
              </label>
              <Input
                placeholder="e.g. TXN-998811 or Cash Voucher #12"
                {...paymentForm.register('referenceNumber')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wood-700 hover:bg-wood-800"
                disabled={paymentMutation.isPending}
              >
                {paymentMutation.isPending ? 'Recording Payment...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Expense Dialog */}
      <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Operating Expense</DialogTitle>
            <DialogDescription>
              Log business operating overhead, workshop supplies, or utility bills.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={expenseForm.handleSubmit(handleExpenseSubmit)}
            className="space-y-4"
          >
            {isOwner && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Expense Location / Branch
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  {...expenseForm.register('branchId')}
                >
                  <option value="">Central Enterprise Overhead (Global)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  {...expenseForm.register('category')}
                >
                  <option value="Workshop Supplies">Workshop Supplies</option>
                  <option value="Utilities">Utilities (Electricity/Water)</option>
                  <option value="Rent">Rent</option>
                  <option value="Transportation & Delivery">Transportation & Delivery</option>
                  <option value="Maintenance">Maintenance & Repairs</option>
                  <option value="Marketing">Marketing & Advertising</option>
                  <option value="Other">Other Operating Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Amount (ETB) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  {...expenseForm.register('amount', { valueAsNumber: true })}
                />
                {expenseForm.formState.errors.amount && (
                  <p className="text-xs text-red-500 mt-1">
                    {expenseForm.formState.errors.amount.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Monthly electricity bill for Kality workshop"
                {...expenseForm.register('description')}
              />
              {expenseForm.formState.errors.description && (
                <p className="text-xs text-red-500 mt-1">
                  {expenseForm.formState.errors.description.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Receipt / Voucher Ref
              </label>
              <Input
                placeholder="e.g. EEU-BILL-2026-90 or Petty Cash #88"
                {...expenseForm.register('receiptRef')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsExpenseOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wood-700 hover:bg-wood-800"
                disabled={expenseMutation.isPending}
              >
                {expenseMutation.isPending ? 'Logging Expense...' : 'Record Expense'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default FinancialPage;
