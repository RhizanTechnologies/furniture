import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  OrderDto,
  OrderStageDto,
  CustomerDto,
  ProductDto,
  createOrderSchema,
  CreateOrderFormInput,
} from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormInput } from '@/components/forms/FormInput';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { OrderDetailModal } from '@/components/orders/OrderDetailModal';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Search,
  Layers,
  Calendar,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Eye,
  AlertTriangle,
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);

  // 1. Fetch Orders
  const { data: orders, isLoading, error, refetch } = useQuery<OrderDto[]>({
    queryKey: ['orders', selectedStageId, searchTerm],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedStageId !== 'ALL') params.append('stageId', selectedStageId);
      if (searchTerm) params.append('search', searchTerm);
      return apiClient<OrderDto[]>(`/orders?${params.toString()}`);
    },
  });

  // 2. Fetch Stages
  const { data: stages = [] } = useQuery<OrderStageDto[]>({
    queryKey: ['order-stages'],
    queryFn: () => apiClient<OrderStageDto[]>('/order-stages'),
  });

  // 3. Fetch Customers
  const { data: customers = [] } = useQuery<CustomerDto[]>({
    queryKey: ['customers'],
    queryFn: () => apiClient<CustomerDto[]>('/customers'),
  });

  // 4. Fetch Products (for catalog selection)
  const { data: products = [] } = useQuery<ProductDto[]>({
    queryKey: ['products'],
    queryFn: () => apiClient<ProductDto[]>('/products'),
  });

  // Order Creation Form
  const orderForm = useForm<CreateOrderFormInput>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      customerId: '',
      items: [
        {
          productId: undefined,
          itemDescription: '',
          quantity: 1,
          unitPrice: 0,
        },
      ],
      totalAgreedPrice: 0,
      prepaymentAmount: 0,
      deadlineDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: 'Cash',
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: orderForm.control,
    name: 'items',
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderFormInput) =>
      apiClient<OrderDto>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          deadlineDate: new Date(data.deadlineDate).toISOString(),
        }),
      }),
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsCreateOpen(false);
      orderForm.reset();
      setSelectedOrder(newOrder);
    },
  });

  // Handle product selection in item row
  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      orderForm.setValue(`items.${index}.productId`, prod.id);
      orderForm.setValue(`items.${index}.itemDescription`, `${prod.name} (${prod.sku})`);
      orderForm.setValue(`items.${index}.unitPrice`, prod.basePrice);

      // Auto update total agreed price
      const currentItems = orderForm.getValues('items');
      const calculatedTotal = currentItems.reduce(
        (sum, item, idx) =>
          sum + (idx === index ? prod.basePrice * (item.quantity || 1) : (item.unitPrice || 0) * (item.quantity || 1)),
        0,
      );
      orderForm.setValue('totalAgreedPrice', calculatedTotal);
    }
  };

  const watchAgreed = orderForm.watch('totalAgreedPrice') || 0;
  const watchPrepayment = orderForm.watch('prepaymentAmount') || 0;
  const computedBalance = Math.max(0, watchAgreed - watchPrepayment);

  const filteredOrders = orders || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Furniture Orders & Pipeline"
        description="Track active manufacturing contracts, customize stage progressions, and manage customer deposits and outstanding balances."
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="space-x-1.5 shadow">
            <Plus className="h-4 w-4" />
            <span>Create Order</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="border-wood-200/90">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Button
              type="button"
              variant={selectedStageId === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedStageId('ALL')}
              className="text-xs h-8 px-3 shrink-0"
            >
              All Orders
            </Button>
            {stages.map((st) => (
              <Button
                key={st.id}
                type="button"
                variant={selectedStageId === st.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStageId(st.id)}
                className="text-xs h-8 px-3 shrink-0"
              >
                {st.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {isLoading && <LoadingState message="Loading furniture orders pipeline..." />}

      {error && (
        <ErrorState
          title="Failed to Load Orders"
          message={(error as any)?.message || 'An error occurred while loading orders.'}
          onRetry={() => refetch()}
        />
      )}

      {/* Orders Table */}
      {orders && (
        <Card className="border-wood-200/90 overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-wood-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Orders Pipeline ({filteredOrders.length})</CardTitle>
              <CardDescription>Click any order to inspect details and advance production stages.</CardDescription>
            </div>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead className="hidden sm:table-cell">Deadline</TableHead>
                <TableHead>Agreed Total</TableHead>
                <TableHead>Paid / Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((ord) => {
                const deadlinePassed = new Date(ord.deadlineDate) < new Date();

                return (
                  <TableRow
                    key={ord.id}
                    className="cursor-pointer hover:bg-wood-100/60"
                    onClick={() => setSelectedOrder(ord)}
                  >
                    <TableCell className="font-mono text-xs font-bold text-wood-900">
                      {ord.orderNumber}
                    </TableCell>
                    <TableCell className="font-medium text-charcoal-900">
                      <div>{ord.customer?.fullName || 'Walk-In'}</div>
                      <div className="text-[11px] text-muted-foreground">{ord.customer?.phone}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: ord.currentStage?.color || '#8B5A2B',
                          color: '#ffffff',
                        }}
                        className="text-[10px]"
                      >
                        {ord.currentStage?.name || 'In Production'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs">
                      <div className={`flex items-center space-x-1 ${deadlinePassed ? 'text-red-700 font-semibold' : 'text-charcoal-700'}`}>
                        {deadlinePassed && <AlertTriangle className="h-3.5 w-3.5" />}
                        <span>{new Date(ord.deadlineDate).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-charcoal-900">
                      {formatCurrency(ord.totalAgreedPrice)}
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="text-emerald-800 font-medium">{formatCurrency(ord.totalPaid)}</div>
                        {ord.outstandingBalance > 0 ? (
                          <div className="text-amber-800 font-semibold">
                            Bal: {formatCurrency(ord.outstandingBalance)}
                          </div>
                        ) : (
                          <Badge variant="success" className="text-[9px] mt-0.5">
                            Fully Paid
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(ord);
                        }}
                        className="h-7 text-xs space-x-1 border-wood-300"
                      >
                        <Eye className="h-3 w-3" />
                        <span>Inspect</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found matching the filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Create Order Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Furniture Order</DialogTitle>
            <DialogDescription>
              Record the client contract, catalog or custom specifications, initial prepayment, and deadline.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...orderForm}>
            <form
              onSubmit={orderForm.handleSubmit((data) => createOrderMutation.mutate(data))}
              className="space-y-4 py-2"
            >
              {/* Customer Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                  Select Registered Customer
                </label>
                <select
                  {...orderForm.register('customerId')}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                >
                  <option value="">-- Choose Walk-In Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.phone})
                    </option>
                  ))}
                </select>
                {orderForm.formState.errors.customerId && (
                  <p className="text-xs text-red-600 font-medium">
                    {orderForm.formState.errors.customerId.message}
                  </p>
                )}
              </div>

              {/* Order Items */}
              <div className="space-y-3 pt-2 border-t border-wood-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    Order Items & Custom Specifications
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({
                        productId: undefined,
                        itemDescription: '',
                        quantity: 1,
                        unitPrice: 0,
                      })
                    }
                    className="h-7 text-xs space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </Button>
                </div>

                {fields.map((field, idx) => (
                  <div
                    key={field.id}
                    className="p-3 rounded-md border border-wood-200 bg-wood-50/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-charcoal-700">
                      <span>Item #{idx + 1}</span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Quick Pick from Catalog */}
                    <div className="space-y-1">
                      <select
                        onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        className="w-full h-8 px-2.5 rounded border border-wood-300 bg-white text-xs"
                      >
                        <option value="">-- Quick-fill from Furniture Catalog (Optional) --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} - {formatCurrency(p.basePrice)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <FormInput
                      name={`items.${idx}.itemDescription`}
                      label="Specification / Item Name"
                      placeholder="e.g. Grand Wanza Dining Table (Custom 260cm)"
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormInput
                        name={`items.${idx}.quantity`}
                        label="Quantity"
                        type="number"
                        min="1"
                      />
                      <FormInput
                        name={`items.${idx}.unitPrice`}
                        label="Unit Price (ETB)"
                        type="number"
                        step="0.01"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial Balances Section */}
              <div className="p-3.5 rounded-lg bg-wood-100/70 border border-wood-300 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    name="totalAgreedPrice"
                    label="Agreed Total Contract Price (ETB)"
                    type="number"
                    step="0.01"
                  />
                  <FormInput
                    name="prepaymentAmount"
                    label="Initial Deposit / Prepayment (ETB)"
                    type="number"
                    step="0.01"
                  />
                </div>

                <div className="flex justify-between items-center text-xs font-medium pt-1 border-t border-wood-200">
                  <span className="text-charcoal-700">Calculated Outstanding Balance:</span>
                  <span className="text-sm font-bold text-amber-900">
                    {formatCurrency(computedBalance)}
                  </span>
                </div>
              </div>

              {/* Deadline & Payment Method */}
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  name="deadlineDate"
                  label="Target Completion Deadline"
                  type="date"
                />
                <div className="space-y-1.5 w-full">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    Payment Method
                  </label>
                  <select
                    {...orderForm.register('paymentMethod')}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Telebirr">Telebirr</option>
                    <option value="CBE Birr">CBE Birr</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <FormInput
                name="notes"
                label="Order Notes / Customer Instructions (Optional)"
                placeholder="Wood finish specifications, delivery requirements..."
              />

              {createOrderMutation.isError && (
                <p className="text-xs text-red-600 font-medium p-2 bg-red-50 rounded border border-red-200">
                  {(createOrderMutation.error as any)?.message || 'Failed to create order.'}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending ? 'Initiating Order...' : 'Confirm & Create Order'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        stages={stages}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
};
