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
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
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

  const [activeTab, setActiveTab] = useState<'payments' | 'expenses' | 'breakdown'>('payments');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // 1. Fetch Financial Summary
  const { data: summary, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useQuery<FinancialSummaryDto>({
    queryKey: ['financial-summary'],
    queryFn: () => apiClient<FinancialSummaryDto>('/financial/summary'),
  });

  // 2. Fetch Payments
  const { data: payments = [], isLoading: isPaymentsLoading } = useQuery<PaymentDto[]>({
    queryKey: ['payments'],
    queryFn: () => apiClient<PaymentDto[]>('/payments'),
  });

  // 3. Fetch Expenses
  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery<ExpenseDto[]>({
    queryKey: ['expenses', selectedCategory],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      return apiClient<ExpenseDto[]>(`/expenses?${params.toString()}`);
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
        title="Financial Management & Accounting"
        description="Monitor cash inflows, record order payments and progress disbursements, log operational expenses, and track net enterprise profit."
        action={
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setIsPaymentOpen(true)}
              className="bg-wood-700 hover:bg-wood-800 text-white space-x-1.5"
            >
              <CreditCard className="h-4 w-4" />
              <span>Record Payment</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsExpenseOpen(true)}
              className="space-x-1.5 border-wood-300 text-wood-900"
            >
              <Receipt className="h-4 w-4" />
              <span>Record Expense</span>
            </Button>
          </div>
        }
      />

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">Financial Alert</p>
            <p>{actionError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Authoritative Financial Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500">
              Cash Inflow Collected
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-800 font-mono">
              {formatCurrency(summary?.totalCashCollected || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-charcoal-600">
            Total payments received across prepayments and progress settlements
          </CardContent>
        </Card>

        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500">
              Outstanding Receivables
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-800 font-mono">
              {formatCurrency(summary?.totalReceivables || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-charcoal-600">
            Remaining unpaid balances owed by customers on active orders
          </CardContent>
        </Card>

        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500">
              Operating Expenses
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-800 font-mono">
              {formatCurrency(summary?.totalOperatingExpenses || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-charcoal-600">
            Overhead, workshop supplies, utilities and branch expenses
          </CardContent>
        </Card>

        <Card className="border-wood-200/80 bg-gradient-to-br from-white to-wood-50/40">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500 flex items-center justify-between">
              <span>Gross Profit</span>
              <span className="font-mono text-[10px] text-wood-700 font-bold">
                {summary?.grossMarginPercentage || 0}% margin
              </span>
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-wood-950 font-mono">
              {formatCurrency(summary?.grossProfit || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-charcoal-600">
            Order revenue minus frozen material costs (COGS)
          </CardContent>
        </Card>

        <Card className={`border-wood-200/80 ${
          (summary?.netProfit || 0) >= 0 ? 'bg-gradient-to-br from-white to-emerald-50/40' : 'bg-rose-50/60'
        }`}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium tracking-wider text-charcoal-500 flex items-center justify-between">
              <span>Net Business Profit</span>
              <span className="font-mono text-[10px] text-emerald-700 font-bold">
                {summary?.netMarginPercentage || 0}% net
              </span>
            </CardDescription>
            <CardTitle className={`text-2xl font-bold font-mono ${
              (summary?.netProfit || 0) >= 0 ? 'text-emerald-900' : 'text-rose-900'
            }`}>
              {formatCurrency(summary?.netProfit || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-charcoal-600">
            Gross profit minus total operating overhead
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-wood-200 flex space-x-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-wood-800 text-wood-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-wood-700'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Payments Ledger ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'expenses'
              ? 'border-wood-800 text-wood-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-wood-700'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Expenses Ledger ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('breakdown')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition-colors ${
            activeTab === 'breakdown'
              ? 'border-wood-800 text-wood-900 font-bold'
              : 'border-transparent text-charcoal-500 hover:text-wood-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Branch Contributions</span>
        </button>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
            <Card className="border-wood-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-wood-50/50">
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Amount (ETB)</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference / Txn #</TableHead>
                    <TableHead>Logged By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p) => (
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    onClick={() => setSelectedCategory(cat)}
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
            <Card className="border-wood-200 overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-wood-50/50">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Location / Branch</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount (ETB)</TableHead>
                    <TableHead>Receipt / Voucher Ref</TableHead>
                    <TableHead>Logged By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((e) => (
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
            onSubmit={paymentForm.handleSubmit((data) => paymentMutation.mutate(data))}
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
            onSubmit={expenseForm.handleSubmit((data) => expenseMutation.mutate(data))}
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
