import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CustomerDto,
  createCustomerSchema,
  CreateCustomerInput,
} from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormInput } from '@/components/forms/FormInput';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { RecordSyncBadge } from '@/components/ui/RecordSyncBadge';
import { apiClient } from '@/lib/api-client';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/sync-engine';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import {
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  Clock,
  Eye,
} from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, translateStage } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  const PAGE_SIZE = 10;

  // Fetch customers with Dexie cache & local pending sync records
  const {
    data: customers = [],
    isLoading,
    error,
    refetch,
  } = useQuery<Array<CustomerDto & { isPendingSync?: boolean }>>({
    queryKey: ['customers', searchTerm],
    queryFn: async () => {
      try {
        const serverCustomers = await apiClient<CustomerDto[]>(
          `/customers${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`,
        );
        // Cache server records in IndexedDB
        for (const c of serverCustomers) {
          await db.customers.put({
            id: c.id,
            fullName: c.fullName,
            phone: c.phone,
            email: c.email,
            address: c.address,
            notes: c.notes,
            branchId: c.branchId,
            isPendingSync: false,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
          });
        }
        // Include any local pending customers
        const pending = await db.customers.filter((c) => c.isPendingSync === true).toArray();
        const pendingMapped: Array<CustomerDto & { isPendingSync?: boolean }> = pending.map((p) => ({
          ...p,
          ordersCount: 0,
          totalSpent: 0,
          outstandingBalance: 0,
          isPendingSync: true,
        }));

        return [...pendingMapped, ...serverCustomers];
      } catch (e) {
        // Fallback to IndexedDB
        const local = await db.customers.toArray();
        const filtered = local.filter(
          (c) =>
            !searchTerm ||
            c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm),
        );
        return filtered.map((c) => ({
          ...c,
          ordersCount: 0,
          totalSpent: 0,
          outstandingBalance: 0,
          isPendingSync: c.isPendingSync,
        }));
      }
    },
  });

  const paginatedCustomers = (customers || []).slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Fetch selected customer details
  const { data: customerDetails, isLoading: isDetailsLoading } = useQuery<{
    orders: any[];
  } & CustomerDto>({
    queryKey: ['customer', selectedCustomerId],
    queryFn: () => apiClient<any>(`/customers/${selectedCustomerId}`),
    enabled: !!selectedCustomerId,
  });

  // Create Customer Form
  const createForm = useForm<CreateCustomerInput>({
    resolver: zodResolver(createCustomerSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateCustomerInput) =>
      apiClient<CustomerDto>('/customers', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });

  const handleFormSubmit = async (data: CreateCustomerInput) => {
    if (!navigator.onLine) {
      // Offline: Enqueue in outbox & save to Dexie
      const tempId = `temp-cust-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'CUSTOMER',
        action: 'CREATE',
        payload: data,
        tempEntityId: tempId,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreateOpen(false);
      createForm.reset();
      return;
    }

    try {
      const newCustomer = await createMutation.mutateAsync(data);
      await db.customers.put({
        id: newCustomer.id,
        fullName: newCustomer.fullName,
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
        notes: newCustomer.notes,
        branchId: newCustomer.branchId,
        isPendingSync: false,
        createdAt: newCustomer.createdAt,
        updatedAt: newCustomer.updatedAt,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreateOpen(false);
      createForm.reset();
      setSelectedCustomerId(newCustomer.id);
    } catch (err: any) {
      // Network failure during submit: save locally
      const tempId = `temp-cust-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'CUSTOMER',
        action: 'CREATE',
        payload: data,
        tempEntityId: tempId,
      });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreateOpen(false);
      createForm.reset();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('customers.title', 'Walk-In Customers Registry')}
        description={t('customers.subtitle', 'Register showroom visitors, record client specifications, and review lifetime purchase history.')}
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="space-x-1.5 shadow">
            <UserPlus className="h-4 w-4" />
            <span>{t('customers.addCustomerBtn', 'Register Customer')}</span>
          </Button>
        }
      />

      {/* Search Bar */}
      <Card className="border-wood-200/90">
        <CardContent className="p-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('customers.searchPlaceholder', 'Search by customer name or phone...')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-background/50 border-wood-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Registry Table */}
      <Card className="border-wood-200">
        <CardHeader className="pb-3 border-b border-wood-100">
          <CardTitle className="text-lg">{t('customers.directory', 'Registered Clients Directory')}</CardTitle>
          <CardDescription>
            {t('customers.directoryDesc', 'Master client record for quotation delivery, progress updates, and payment reconciliation.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState message={t('common.loading', 'Loading registered showroom customers...')} />
          ) : !customers || customers.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-12 w-12 text-wood-300" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">{t('customers.noCustomers', 'No Customers Found')}</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? t('common.noData', 'No clients match your filter criteria.')
                  : t('customers.subtitle', 'Start by registering your first showroom walk-in client.')}
              </p>
              <div className="mt-6">
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  <UserPlus className="mr-1.5 h-4 w-4" />
                  {t('customers.addCustomerBtn', 'Register Customer')}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Phone & Tablet Responsive Cards (lg:hidden) */}
              <div className="lg:hidden space-y-3 p-3">
                {paginatedCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    className="p-3.5 rounded-xl border border-wood-200/90 bg-white shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-charcoal-900 text-sm">{cust.fullName}</div>
                        <div className="font-mono text-xs text-wood-700">{cust.phone}</div>
                        {cust.email && (
                          <div className="text-[11px] text-muted-foreground">{cust.email}</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <RecordSyncBadge isPendingSync={cust.isPendingSync} />
                        <Badge variant="wood" className="text-[10px]">
                          {cust.ordersCount || 0} {t('customers.ordersCount', 'Orders')}
                        </Badge>
                      </div>
                    </div>

                    {cust.address && (
                      <p className="text-xs text-stone-600 line-clamp-1">
                        📍 {cust.address}
                      </p>
                    )}

                    <div className="pt-2 border-t border-dashed border-stone-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase text-muted-foreground block font-bold">{t('common.total', 'Total Spent')}</span>
                        <span className="font-semibold text-charcoal-900 font-mono">
                          {formatCurrency(cust.totalSpent || 0)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase text-muted-foreground block font-bold">{t('customers.balance', 'Balance')}</span>
                        {(cust.outstandingBalance || 0) > 0 ? (
                          <span className="font-semibold text-amber-700 font-mono text-xs">
                            {formatCurrency(cust.outstandingBalance || 0)}
                          </span>
                        ) : (
                          <Badge variant="success" className="text-[10px]">
                            {t('common.active', 'Cleared')}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedCustomerId(cust.id)}
                        className="h-7 text-xs space-x-1 border-wood-300 w-full"
                      >
                        <Eye className="h-3 w-3" />
                        <span>{t('common.viewDetails', 'View Client Details & History')}</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (lg:block) */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-wood-50/50">
                      <TableHead>{t('customers.customerName', 'Customer Name')}</TableHead>
                      <TableHead>{t('customers.phoneNumber', 'Phone Number')}</TableHead>
                      <TableHead>{t('common.status', 'Status')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('customers.address', 'Address')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('customers.ordersCount', 'Orders')}</TableHead>
                      <TableHead>{t('common.total', 'Total Spent')}</TableHead>
                      <TableHead>{t('customers.balance', 'Outstanding Balance')}</TableHead>
                      <TableHead className="text-right">{t('common.actions', 'Action')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((cust) => (
                      <TableRow key={cust.id}>
                        <TableCell className="font-semibold text-charcoal-900">
                          <div>{cust.fullName}</div>
                          {cust.email && (
                            <div className="text-[11px] text-muted-foreground">{cust.email}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{cust.phone}</TableCell>
                        <TableCell>
                          <RecordSyncBadge isPendingSync={cust.isPendingSync} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-charcoal-600">
                          {cust.address || '—'}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="wood" className="text-[10px]">
                            {cust.ordersCount || 0} {t('customers.ordersCount', 'Orders')}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(cust.totalSpent || 0)}
                        </TableCell>
                        <TableCell>
                          {(cust.outstandingBalance || 0) > 0 ? (
                            <span className="font-semibold text-amber-700">
                              {formatCurrency(cust.outstandingBalance || 0)}
                            </span>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              {t('common.active', 'Cleared')}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCustomerId(cust.id)}
                            className="h-7 text-xs space-x-1 border-wood-300"
                          >
                            <Eye className="h-3 w-3" />
                            <span>{t('common.details', 'History')}</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              <div className="px-4 pb-4">
                <Pagination
                  currentPage={currentPage}
                  totalItems={(customers || []).length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Customer Registration Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('customers.newCustomerModalTitle', 'Register Showroom Customer')}</DialogTitle>
            <DialogDescription>
              {t('customers.subtitle', 'Record client identity, contact information, and delivery location.')}
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleFormSubmit)} className="space-y-4">
              <FormInput
                name="fullName"
                label={t('customers.fullName', 'Full Name')}
                placeholder="e.g., Almaz Ayana"
                required
              />

              <FormInput
                name="phone"
                label={t('customers.phone', 'Phone Number')}
                placeholder="e.g., +251 911 234567"
                required
                description="Unique identifier used for customer profile identification"
              />

              <FormInput
                name="email"
                label={t('common.email', 'Email Address')}
                placeholder="e.g., almaz@example.com (optional)"
              />

              <FormInput
                name="address"
                label={t('customers.cityAddress', 'Physical Address / Sub-city')}
                placeholder="e.g., Bole Subcity, Woreda 03, Addis Ababa"
              />

              <FormInput
                name="notes"
                label={t('customers.notes', 'Client Notes')}
                placeholder="e.g., Prefers solid walnut wood finish, referred by interior architect"
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  {t('common.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t('common.loading', 'Saving...') : t('customers.saveCustomer', 'Save Customer')}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Customer Profile & Purchase History Modal */}
      <Dialog
        open={!!selectedCustomerId}
        onOpenChange={(open) => !open && setSelectedCustomerId(null)}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{customerDetails?.fullName}</span>
              <Badge variant="wood">{t('customers.title', 'Profile Record')}</Badge>
            </DialogTitle>
            <DialogDescription>
              {t('customers.subtitle', 'Customer purchase summary and complete order progression history.')}
            </DialogDescription>
          </DialogHeader>

          {isDetailsLoading ? (
            <LoadingState message={t('common.loading', 'Fetching client details...')} />
          ) : customerDetails ? (
            <div className="space-y-6 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-wood-50/50 p-4 rounded-lg border border-wood-100 text-xs">
                <div>
                  <span className="text-muted-foreground block">{t('customers.phoneNumber', 'Phone')}</span>
                  <span className="font-semibold">{customerDetails.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('common.email', 'Email')}</span>
                  <span className="font-medium">{customerDetails.email || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('customers.address', 'Address')}</span>
                  <span className="font-medium">{customerDetails.address || '—'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('customers.ordersCount', 'Total Orders')}</span>
                  <span className="font-semibold">{customerDetails.ordersCount || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('common.total', 'Total Revenue')}</span>
                  <span className="font-semibold text-emerald-800">
                    {formatCurrency(customerDetails.totalSpent || 0)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('customers.balance', 'Outstanding')}</span>
                  <span className="font-semibold text-amber-800">
                    {formatCurrency(customerDetails.outstandingBalance || 0)}
                  </span>
                </div>
              </div>

              {customerDetails.notes && (
                <div className="p-3 bg-amber-50/50 rounded border border-amber-200/50 text-xs">
                  <span className="font-semibold text-amber-900 block mb-0.5">{t('customers.notes', 'Client Preferences & Notes')}:</span>
                  <p className="text-amber-800">{customerDetails.notes}</p>
                </div>
              )}

              <div>
                <h4 className="text-xs font-semibold text-charcoal-700 uppercase tracking-wider mb-2">
                  {t('orders.title', 'Order History')} ({customerDetails.orders?.length || 0})
                </h4>
                {(!customerDetails.orders || customerDetails.orders.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic py-4 text-center border border-dashed rounded">
                    {t('orders.noOrders', 'No orders logged for this customer yet.')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {customerDetails.orders.map((ord: any) => (
                      <div
                        key={ord.id}
                        className="flex items-center justify-between p-3 border rounded-lg bg-card text-xs hover:border-wood-300"
                      >
                        <div>
                          <div className="font-mono font-bold text-wood-900">{ord.orderNumber}</div>
                          <div className="text-muted-foreground text-[11px]">
                            {new Date(ord.createdAt).toLocaleDateString()} • {ord.items?.length || 0} {t('common.details', 'items')}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(ord.totalAgreedPrice)}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {t('orderDetail.totalPaid', 'Paid')}: {formatCurrency(ord.totalPaid)}
                            </div>
                          </div>
                          <Badge
                            style={{
                              backgroundColor: `${ord.currentStage?.colorHex || '#666'}15`,
                              color: ord.currentStage?.colorHex || '#666',
                              borderColor: `${ord.currentStage?.colorHex || '#666'}40`,
                            }}
                            className="border text-[10px]"
                          >
                            {translateStage(ord.currentStage?.name || 'In Progress')}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedCustomerId(null)}>
              {t('common.close', 'Close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
