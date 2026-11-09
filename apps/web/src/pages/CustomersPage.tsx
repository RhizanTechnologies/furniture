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
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Fetch customers
  const { data: customers, isLoading, error, refetch } = useQuery<CustomerDto[]>({
    queryKey: ['customers', searchTerm],
    queryFn: () =>
      apiClient<CustomerDto[]>(
        `/customers${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`,
      ),
  });

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
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreateOpen(false);
      createForm.reset();
      setSelectedCustomerId(newCustomer.id);
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Walk-In Customers Registry"
        description="Register showroom visitors, record client specifications, and review lifetime purchase history."
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="space-x-1.5 shadow">
            <UserPlus className="h-4 w-4" />
            <span>Register Customer</span>
          </Button>
        }
      />

      {/* Search Bar */}
      <Card className="border-wood-200/90">
        <CardContent className="p-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name, phone, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading && <LoadingState message="Loading registered customers..." />}

      {error && (
        <ErrorState
          title="Failed to Load Customers"
          message={(error as any)?.message || 'An error occurred while fetching customer records.'}
          onRetry={() => refetch()}
        />
      )}

      {/* Customer Registry Table */}
      {customers && (
        <Card className="border-wood-200/90 overflow-hidden">
          <CardHeader className="py-3 px-5 border-b border-wood-100 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Customers ({customers.length})</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Name</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead className="hidden md:table-cell">Address</TableHead>
                <TableHead className="hidden sm:table-cell">Orders</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Outstanding Balance</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((cust) => (
                <TableRow key={cust.id}>
                  <TableCell className="font-semibold text-charcoal-900">
                    <div>{cust.fullName}</div>
                    {cust.email && (
                      <div className="text-[11px] text-muted-foreground">{cust.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{cust.phone}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-charcoal-600">
                    {cust.address || '—'}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant="wood" className="text-[10px]">
                      {cust.ordersCount || 0} Orders
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
                        Cleared
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
                      <span>History</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No customers found matching your search term.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Register Customer Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register Walk-In Customer</DialogTitle>
            <DialogDescription>
              Capture visitor information quickly. Phone number is validated to prevent duplicates.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...createForm}>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="space-y-4 py-2"
            >
              <FormInput name="fullName" label="Full Name" placeholder="e.g. Almaz Ayana" />
              <FormInput
                name="phone"
                label="Primary Phone Number"
                placeholder="e.g. +251911223344"
                description="Used as primary deduplication key across orders."
              />
              <FormInput
                name="email"
                label="Email (Optional)"
                type="email"
                placeholder="e.g. almaz@example.com"
              />
              <FormInput
                name="address"
                label="Physical / Delivery Address (Optional)"
                placeholder="Subcity, Woreda, Landmark"
              />
              <FormInput
                name="notes"
                label="Intake Remarks (Optional)"
                placeholder="Wood preferences, architectural drawings, etc."
              />

              {createMutation.isError && (
                <p className="text-xs text-red-600 font-medium p-2 bg-red-50 rounded border border-red-200">
                  {(createMutation.error as any)?.message || 'Failed to register customer.'}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Register Customer'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Customer Order History Dialog */}
      <Dialog
        open={!!selectedCustomerId}
        onOpenChange={(open) => !open && setSelectedCustomerId(null)}
      >
        {customerDetails && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{customerDetails.fullName}</DialogTitle>
              <DialogDescription className="space-x-3 text-xs">
                <span>{customerDetails.phone}</span>
                {customerDetails.email && <span>• {customerDetails.email}</span>}
                {customerDetails.address && <span>• {customerDetails.address}</span>}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-wood-50 border border-wood-200 text-center">
                <div>
                  <div className="text-[11px] uppercase font-semibold text-muted-foreground">Orders</div>
                  <div className="text-lg font-bold text-charcoal-900">{customerDetails.orders.length}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase font-semibold text-muted-foreground">Total Paid</div>
                  <div className="text-lg font-bold text-emerald-800">
                    {formatCurrency(customerDetails.totalSpent || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase font-semibold text-muted-foreground">Outstanding</div>
                  <div className="text-lg font-bold text-amber-800">
                    {formatCurrency(customerDetails.outstandingBalance || 0)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-2">
                  Order History
                </h4>
                {customerDetails.orders.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic py-3">
                    No orders placed yet by this customer.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {customerDetails.orders.map((ord: any) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-md border border-wood-200 bg-white flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-wood-900">{ord.orderNumber}</div>
                          <div className="text-muted-foreground">
                            {new Date(ord.createdAt).toLocaleDateString()} • {ord.itemsCount} item(s)
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="font-bold">{formatCurrency(ord.totalAgreedPrice)}</div>
                          <Badge variant="wood" className="text-[10px]">
                            {ord.currentStage?.name || 'In Production'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setSelectedCustomerId(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
