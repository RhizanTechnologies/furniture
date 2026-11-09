import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  BranchDto,
  StockMode,
  createBranchSchema,
  CreateBranchInput,
  assignBranchAdminSchema,
  AssignBranchAdminInput,
} from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormInput } from '@/components/forms/FormInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { apiClient } from '@/lib/api-client';
import { Building2, Plus, UserPlus, Phone, MapPin, Layers, Edit } from 'lucide-react';

export const BranchesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [assignAdminBranch, setAssignAdminBranch] = useState<BranchDto | null>(null);

  // Fetch all branches
  const { data: branches, isLoading, error, refetch } = useQuery<BranchDto[]>({
    queryKey: ['branches'],
    queryFn: () => apiClient<BranchDto[]>('/branches'),
  });

  // Create Branch Mutation
  const createBranchForm = useForm<CreateBranchInput>({
    resolver: zodResolver(createBranchSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      phone: '',
      stockMode: StockMode.MAIN_STOCK,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBranchInput) =>
      apiClient<BranchDto>('/branches', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setIsCreateOpen(false);
      createBranchForm.reset();
    },
  });

  // Assign Administrator Mutation
  const assignAdminForm = useForm<AssignBranchAdminInput>({
    resolver: zodResolver(assignBranchAdminSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const assignAdminMutation = useMutation({
    mutationFn: (data: AssignBranchAdminInput) =>
      apiClient<BranchDto>(`/branches/${assignAdminBranch?.id}/admin`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setAssignAdminBranch(null);
      assignAdminForm.reset();
    },
  });

  const handleCreateSubmit = (data: CreateBranchInput) => {
    createMutation.mutate(data);
  };

  const handleAssignSubmit = (data: AssignBranchAdminInput) => {
    assignAdminMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Branches"
        description="Configure workshop & showroom locations, dedicated or central stock models, and assigned branch administrators."
        action={
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="space-x-1.5 shadow">
            <Plus className="h-4 w-4" />
            <span>Create Branch</span>
          </Button>
        }
      />

      {isLoading && <LoadingState message="Loading branches and administrator assignments..." />}

      {error && (
        <ErrorState
          title="Failed to Load Branches"
          message={(error as any)?.message || 'An error occurred while fetching branch records.'}
          onRetry={() => refetch()}
        />
      )}

      {branches && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <Card key={branch.id} className="border-wood-200/90 hover:border-wood-400 transition-all flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">{branch.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">{branch.code}</CardDescription>
                    </div>
                    <Badge variant={branch.stockMode === StockMode.MAIN_STOCK ? 'secondary' : 'wood'}>
                      {branch.stockMode === StockMode.MAIN_STOCK ? 'Main Stock' : 'Branch Stock'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  <div className="space-y-1.5 text-xs text-charcoal-700">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-3.5 w-3.5 text-wood-600 shrink-0" />
                      <span className="truncate">{branch.address}</span>
                    </div>
                    {branch.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="h-3.5 w-3.5 text-wood-600 shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Administrator Card */}
                  <div className="p-3 rounded-md bg-wood-50/70 border border-wood-200">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-600 mb-1">
                      Branch Administrator
                    </div>
                    {branch.admin ? (
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-wood-950">{branch.admin.fullName}</div>
                        <div className="text-xs text-muted-foreground">{branch.admin.email}</div>
                        {branch.admin.phone && (
                          <div className="text-xs text-muted-foreground">{branch.admin.phone}</div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-700 font-medium">Unassigned</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAssignAdminBranch(branch);
                            assignAdminForm.reset();
                          }}
                        >
                          Assign Now
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              <CardFooter className="pt-2 border-t border-wood-100 bg-wood-50/30 flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Status: {branch.isActive ? 'Active' : 'Inactive'}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAssignAdminBranch(branch);
                    if (branch.admin) {
                      assignAdminForm.setValue('fullName', branch.admin.fullName);
                      assignAdminForm.setValue('email', branch.admin.email);
                      assignAdminForm.setValue('phone', branch.admin.phone || '');
                    }
                  }}
                  className="space-x-1"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{branch.admin ? 'Reassign Admin' : 'Assign Admin'}</span>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Create Branch Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogDescription>
              Register a new workshop or showroom branch and designate its inventory stock model.
            </DialogDescription>
          </DialogHeader>

          <FormProvider {...createBranchForm}>
            <form onSubmit={createBranchForm.handleSubmit(handleCreateSubmit)} className="space-y-4 py-2">
              <FormInput name="name" label="Branch Name" placeholder="e.g. Megenagna Workshop" />
              <FormInput name="code" label="Branch Code" placeholder="e.g. BR-MEGENAGNA" />
              <FormInput name="address" label="Physical Address / Subcity" placeholder="e.g. Megenagna, Next to Zefmesh Mall" />
              <FormInput name="phone" label="Contact Phone" placeholder="e.g. +251116630000" />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                  Stock Configuration Mode
                </label>
                <select
                  {...createBranchForm.register('stockMode')}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value={StockMode.MAIN_STOCK}>
                    Main Stock (Draws materials directly from central warehouse)
                  </option>
                  <option value={StockMode.BRANCH_STOCK}>
                    Branch Stock (Maintains independent dedicated physical inventory)
                  </option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Select carefully. Stock mode dictates how material consumption and valuation operate for this branch.
                </p>
              </div>

              {createMutation.isError && (
                <p className="text-xs text-red-600 font-medium">
                  {(createMutation.error as any)?.message || 'Failed to create branch.'}
                </p>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Save Branch'}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>

      {/* Assign Administrator Dialog */}
      <Dialog open={!!assignAdminBranch} onOpenChange={(open) => !open && setAssignAdminBranch(null)}>
        {assignAdminBranch && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Branch Administrator</DialogTitle>
              <DialogDescription>
                Assign exactly one administrator to {assignAdminBranch.name} ({assignAdminBranch.code}).
              </DialogDescription>
            </DialogHeader>

            <FormProvider {...assignAdminForm}>
              <form onSubmit={assignAdminForm.handleSubmit(handleAssignSubmit)} className="space-y-4 py-2">
                <FormInput name="fullName" label="Administrator Full Name" placeholder="e.g. Dawit Haile" />
                <FormInput name="email" label="Administrator Email" type="email" placeholder="e.g. admin.megenagna@furniture.com" />
                <FormInput name="phone" label="Phone Number" placeholder="e.g. +251911445566" />
                <FormInput
                  name="password"
                  label="Password"
                  type="password"
                  placeholder="Required if creating a new user"
                  description="Leave empty if user already exists to keep their existing password."
                />

                {assignAdminMutation.isError && (
                  <p className="text-xs text-red-600 font-medium">
                    {(assignAdminMutation.error as any)?.message || 'Failed to assign administrator.'}
                  </p>
                )}

                <DialogFooter className="pt-2">
                  <Button type="button" variant="secondary" onClick={() => setAssignAdminBranch(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={assignAdminMutation.isPending}>
                    {assignAdminMutation.isPending ? 'Saving Assignment...' : 'Confirm Administrator'}
                  </Button>
                </DialogFooter>
              </form>
            </FormProvider>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};
