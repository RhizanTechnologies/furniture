import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
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
import { RecordSyncBadge } from '@/components/ui/RecordSyncBadge';
import { apiClient } from '@/lib/api-client';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/sync-engine';
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
  UserPlus,
} from 'lucide-react';

export const OrdersPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStageId, setSelectedStageId] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDto | null>(null);

  // Quick Customer Registration Modal state
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickFullName, setQuickFullName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickAddress, setQuickAddress] = useState('');
  const [isSubmittingQuickCustomer, setIsSubmittingQuickCustomer] = useState(false);

  // 1. Fetch Orders with Dexie cache & local pending orders inclusion
  const { data: orders, isLoading, error, refetch } = useQuery<Array<OrderDto & { isPendingSync?: boolean }>>({
    queryKey: ['orders', selectedStageId, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStageId !== 'ALL') params.append('stageId', selectedStageId);
      if (searchTerm) params.append('search', searchTerm);

      try {
        const serverOrders = await apiClient<OrderDto[]>(`/orders?${params.toString()}`);
        for (const ord of serverOrders) {
          await db.orders.put({
            id: ord.id,
            orderNumber: ord.orderNumber,
            customerId: ord.customerId,
            branchId: ord.branchId,
            currentStageId: ord.currentStageId,
            totalAgreedPrice: ord.totalAgreedPrice,
            totalPaid: ord.totalPaid,
            outstandingBalance: ord.outstandingBalance,
            deadlineDate: ord.deadlineDate,
            notes: ord.notes,
            items: ord.items || [],
            isPendingSync: false,
            createdAt: ord.createdAt,
            updatedAt: ord.updatedAt,
          });
        }

        const localPending = await db.orders.filter((o) => o.isPendingSync === true).toArray();
        const pendingMapped: Array<OrderDto & { isPendingSync?: boolean }> = localPending.map((o) => ({
          ...o,
          items: o.items as any,
          isPendingSync: true,
        }));

        return [...pendingMapped, ...serverOrders];
      } catch (err) {
        const local = await db.orders.toArray();
        return local.map((o) => ({
          ...o,
          items: o.items as any,
          isPendingSync: o.isPendingSync,
        }));
      }
    },
  });

  // 2. Fetch Stages
  const { data: stages = [] } = useQuery<OrderStageDto[]>({
    queryKey: ['order-stages'],
    queryFn: async (): Promise<OrderStageDto[]> => {
      try {
        const res = await apiClient<OrderStageDto[]>('/order-stages');
        for (const s of res) {
          await db.orderStages.put({
            id: s.id,
            name: s.name,
            colorHex: s.color,
            sequenceOrder: s.sequenceOrder,
            isActive: s.isActive,
          });
        }
        return res;
      } catch (e) {
        const local = await db.orderStages.toArray();
        return local.map((s) => ({
          id: s.id,
          name: s.name,
          color: s.colorHex,
          sequenceOrder: s.sequenceOrder,
          isFinalStage: false,
          isActive: s.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
      }
    },
  });

  // 3. Fetch Customers
  const { data: customers = [] } = useQuery<CustomerDto[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        return await apiClient<CustomerDto[]>('/customers');
      } catch (e) {
        return (await db.customers.toArray()) as any;
      }
    },
  });

  // 4. Fetch Products (for catalog selection)
  const { data: products = [] } = useQuery<ProductDto[]>({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        return await apiClient<ProductDto[]>('/products');
      } catch (e) {
        return (await db.products.toArray()) as any;
      }
    },
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
  });

  const handleOrderSubmit = async (data: CreateOrderFormInput) => {
    const payload = {
      ...data,
      deadlineDate: new Date(data.deadlineDate).toISOString(),
    };

    if (!navigator.onLine) {
      const tempOrderId = `temp-ord-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'ORDER',
        action: 'CREATE',
        payload,
        tempEntityId: tempOrderId,
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsCreateOpen(false);
      orderForm.reset();
      return;
    }

    try {
      const newOrder = await createOrderMutation.mutateAsync(data);
      await db.orders.put({
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        customerId: newOrder.customerId,
        branchId: newOrder.branchId,
        currentStageId: newOrder.currentStageId,
        totalAgreedPrice: newOrder.totalAgreedPrice,
        totalPaid: newOrder.totalPaid,
        outstandingBalance: newOrder.outstandingBalance,
        deadlineDate: newOrder.deadlineDate,
        notes: newOrder.notes,
        items: (newOrder.items as any) || [],
        isPendingSync: false,
        createdAt: newOrder.createdAt,
        updatedAt: newOrder.updatedAt,
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsCreateOpen(false);
      orderForm.reset();
      setSelectedOrder(newOrder);
    } catch (err) {
      const tempOrderId = `temp-ord-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'ORDER',
        action: 'CREATE',
        payload,
        tempEntityId: tempOrderId,
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setIsCreateOpen(false);
      orderForm.reset();
    }
  };

  // Quick Customer Registration inside Order Dialog
  const handleQuickRegisterCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFullName.trim() || !quickPhone.trim()) return;
    setIsSubmittingQuickCustomer(true);
    try {
      const inputData = {
        fullName: quickFullName.trim(),
        phone: quickPhone.trim(),
        address: quickAddress.trim() || undefined,
      };

      let assignedCustomerId: string;

      if (navigator.onLine) {
        try {
          const createdCustomer = await apiClient<CustomerDto>('/customers', {
            method: 'POST',
            body: JSON.stringify(inputData),
          });
          assignedCustomerId = createdCustomer.id;
          await db.customers.put({
            id: createdCustomer.id,
            fullName: createdCustomer.fullName,
            phone: createdCustomer.phone,
            address: createdCustomer.address,
            branchId: createdCustomer.branchId || user?.branchId || '',
            isPendingSync: false,
            createdAt: createdCustomer.createdAt,
            updatedAt: createdCustomer.updatedAt,
          });
        } catch {
          const tempId = `temp-cust-${crypto.randomUUID()}`;
          await syncEngine.enqueueMutation({
            entityType: 'CUSTOMER',
            action: 'CREATE',
            payload: inputData,
            tempEntityId: tempId,
          });
          await db.customers.put({
            id: tempId,
            fullName: inputData.fullName,
            phone: inputData.phone,
            address: inputData.address,
            branchId: user?.branchId || '',
            isPendingSync: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          assignedCustomerId = tempId;
        }
      } else {
        const tempId = `temp-cust-${crypto.randomUUID()}`;
        await syncEngine.enqueueMutation({
          entityType: 'CUSTOMER',
          action: 'CREATE',
          payload: inputData,
          tempEntityId: tempId,
        });
        await db.customers.put({
          id: tempId,
          fullName: inputData.fullName,
          phone: inputData.phone,
          address: inputData.address,
          branchId: user?.branchId || '',
          isPendingSync: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        assignedCustomerId = tempId;
      }

      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      orderForm.setValue('customerId', assignedCustomerId);
      setIsQuickCustomerOpen(false);
      setQuickFullName('');
      setQuickPhone('');
      setQuickAddress('');
    } catch (err: any) {
      alert(err.message || 'Failed to register customer');
    } finally {
      setIsSubmittingQuickCustomer(false);
    }
  };

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

  // Recalculate price on quantity/unitPrice change
  const handleItemChange = () => {
    const currentItems = orderForm.getValues('items');
    const calculatedTotal = currentItems.reduce(
      (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 1),
      0,
    );
    orderForm.setValue('totalAgreedPrice', calculatedTotal);
  };

  const filteredOrders = orders || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Furniture Orders & Pipeline"
        description="Track client bespoke commissions through customizable workshop stages from deposit intake to final delivery."
        action={
          <div className="flex items-center space-x-2">
            <Link to="/customers">
              <Button variant="outline" size="sm" className="space-x-1.5 border-wood-300">
                <UserPlus className="h-4 w-4" />
                <span>Register Customer</span>
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => {
                orderForm.reset();
                setIsCreateOpen(true);
              }}
              className="space-x-1.5 bg-wood-700 hover:bg-wood-800 text-white shadow"
            >
              <Plus className="h-4 w-4" />
              <span>Create Order</span>
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <Card className="border-wood-200">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, client name, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/50 border-wood-200"
            />
          </div>

          {/* Stage Filter Chips */}
          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto items-center">
            <Button
              size="sm"
              variant={selectedStageId === 'ALL' ? 'default' : 'outline'}
              onClick={() => setSelectedStageId('ALL')}
              className="text-xs h-8"
            >
              All Orders
            </Button>
            {stages.map((stage) => (
              <Button
                key={stage.id}
                size="sm"
                variant={selectedStageId === stage.id ? 'default' : 'outline'}
                onClick={() => setSelectedStageId(stage.id)}
                className="text-xs h-8 space-x-1"
                style={{
                  borderColor: stage.color,
                  backgroundColor: selectedStageId === stage.id ? stage.color : undefined,
                  color: selectedStageId === stage.id ? '#ffffff' : undefined,
                }}
              >
                <span>{stage.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {isLoading ? (
        <LoadingState message="Loading custom production orders..." />
      ) : error ? (
        <ErrorState
          title="Could not load orders"
          message="Failed to fetch orders from server or local offline store."
          onRetry={() => refetch()}
        />
      ) : (
        <Card className="border-wood-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-wood-50/50">
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead className="hidden sm:table-cell">Deadline</TableHead>
                <TableHead>Total Agreed</TableHead>
                <TableHead>Paid / Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((ord) => {
                const deadlinePassed =
                  new Date(ord.deadlineDate).getTime() < Date.now();

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
                      <RecordSyncBadge isPendingSync={ord.isPendingSync} />
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
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
        <DialogContent className="w-[95vw] sm:w-full max-w-2xl max-h-[92vh] overflow-y-auto p-3.5 sm:p-6">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-lg sm:text-xl">Create New Furniture Order</DialogTitle>
            <DialogDescription className="text-xs">
              Record the client contract, catalog or custom specifications, initial prepayment, and deadline. Offline creation is preserved locally.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...orderForm}>
            <form
              onSubmit={orderForm.handleSubmit(handleOrderSubmit)}
              className="space-y-4 py-2"
            >
              {/* Customer Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    Select Registered Customer
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-wood-700 hover:text-wood-900 px-1.5 space-x-1"
                    onClick={() => setIsQuickCustomerOpen(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>+ Quick Register New</span>
                  </Button>
                </div>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                          Catalog Product (Optional)
                        </label>
                        <select
                          className="w-full h-9 px-2 text-xs rounded border border-input bg-background"
                          onChange={(e) => handleSelectProduct(idx, e.target.value)}
                        >
                          <option value="">-- Custom Bespoke Item --</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatCurrency(p.basePrice)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <FormInput
                          name={`items.${idx}.itemDescription`}
                          label="Description / Specifications"
                          placeholder="e.g. 8-Seater Wanza Dining Table"
                          required
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <FormInput
                        type="number"
                        name={`items.${idx}.quantity`}
                        label="Quantity"
                        required
                        className="h-9 text-xs"
                        onChange={handleItemChange}
                      />
                      <FormInput
                        type="number"
                        name={`items.${idx}.unitPrice`}
                        label="Unit Price (ETB)"
                        required
                        className="h-9 text-xs"
                        onChange={handleItemChange}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Financial and Delivery Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-wood-200">
                <FormInput
                  type="number"
                  name="totalAgreedPrice"
                  label="Agreed Contract Price (ETB)"
                  description="Total binding agreement price"
                  required
                />

                <FormInput
                  type="number"
                  name="prepaymentAmount"
                  label="Prepayment / Initial Deposit (ETB)"
                  description="Initial customer deposit"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormInput
                  type="date"
                  name="deadlineDate"
                  label="Delivery Deadline"
                  required
                />

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                    Prepayment Method
                  </label>
                  <select
                    {...orderForm.register('paymentMethod')}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                  >
                    <option value="Cash">Cash Receipt</option>
                    <option value="Bank Transfer">Bank Transfer (Telebirr/CBE/Awash)</option>
                    <option value="Check">Business Check</option>
                  </select>
                </div>
              </div>

              <FormInput
                name="notes"
                label="Manufacturing & Delivery Notes"
                placeholder="e.g. Customer requested natural beeswax finish and delivery to 3rd floor"
              />

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending ? 'Logging Order...' : 'Confirm Order'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Quick Customer Registration Dialog */}
      <Dialog open={isQuickCustomerOpen} onOpenChange={setIsQuickCustomerOpen}>
        <DialogContent className="w-[94vw] sm:w-full sm:max-w-[425px] p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pr-6">
            <DialogTitle className="text-base sm:text-lg">Quick Register Walk-In Client</DialogTitle>
            <DialogDescription className="text-xs">
              Register client info and immediately assign them to the current order.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleQuickRegisterCustomer} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Full Name *
              </label>
              <Input
                required
                placeholder="e.g. Solomon Desta"
                value={quickFullName}
                onChange={(e) => setQuickFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Phone Number *
              </label>
              <Input
                required
                placeholder="e.g. +251 911 234 567"
                value={quickPhone}
                onChange={(e) => setQuickPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Delivery Address (Optional)
              </label>
              <Input
                placeholder="e.g. Bole Atlas, Addis Ababa"
                value={quickAddress}
                onChange={(e) => setQuickAddress(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsQuickCustomerOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingQuickCustomer}>
                {isSubmittingQuickCustomer ? 'Saving...' : 'Save & Select Client'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => {
            setSelectedOrder(null);
            refetch();
          }}
          stages={stages}
        />
      )}
    </div>
  );
};
