import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  OrderStageDto,
  createOrderStageSchema,
  CreateOrderStageInput,
} from '@furniture/shared';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { apiClient } from '@/lib/api-client';
import { useLanguage } from '@/context/LanguageContext';
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

export const OrderStagesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, translateStage } = useLanguage();
  const [includeInactive, setIncludeInactive] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<OrderStageDto | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch stages
  const { data: stages = [], isLoading, error, refetch } = useQuery<OrderStageDto[]>({
    queryKey: ['order-stages', includeInactive],
    queryFn: () => apiClient<OrderStageDto[]>(`/order-stages?includeInactive=${includeInactive}`),
  });

  // Create form
  const createForm = useForm<CreateOrderStageInput>({
    resolver: zodResolver(createOrderStageSchema),
    defaultValues: {
      name: '',
      color: '#8B5A2B',
      isFinalStage: false,
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateOrderStageInput) =>
      apiClient<OrderStageDto>('/order-stages', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-stages'] });
      setIsCreateOpen(false);
      createForm.reset();
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to create stage');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OrderStageDto> }) =>
      apiClient<OrderStageDto>(`/order-stages/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-stages'] });
      setEditingStage(null);
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to update stage');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<{ message: string }>(`/order-stages/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-stages'] });
      setActionError(null);
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to delete stage');
    },
  });

  // Move stage up or down
  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === stages.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newStages = [...stages];
    const current = newStages[index];
    newStages[index] = newStages[targetIndex];
    newStages[targetIndex] = current;

    const payload = {
      stages: newStages.map((s, idx) => ({
        id: s.id,
        sequenceOrder: idx + 1,
      })),
    };

    try {
      await apiClient('/order-stages/reorder', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      queryClient.invalidateQueries({ queryKey: ['order-stages'] });
    } catch (err: any) {
      setActionError(err.message || 'Failed to reorder stages');
    }
  };

  const handleToggleActive = (stage: OrderStageDto) => {
    updateMutation.mutate({
      id: stage.id,
      data: { isActive: !stage.isActive },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('stages.title', 'Custom Order Stages')}
        description={t('stages.reorderHint', 'Design the production and delivery pipeline. Define stage names, colors, and sequence order. Branch staff move orders through these exact stages.')}
        action={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIncludeInactive(!includeInactive)}
            >
              {includeInactive ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1 text-stone-500" /> {t('common.filter', 'Hide Inactive')}
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1 text-stone-500" /> {t('common.all', 'Show Inactive')}
                </>
              )}
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-wood-600 hover:bg-wood-700">
              <Plus className="w-4 h-4 mr-2" /> {t('stages.addStageBtn', 'Add Stage')}
            </Button>
          </div>
        }
      />

      {actionError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-800 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{t('common.warning', 'Action Alert')}</p>
            <p>{actionError}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActionError(null)}>
            {t('common.close', 'Dismiss')}
          </Button>
        </div>
      )}

      {/* Pipeline Information Card */}
      <Card className="bg-wood-50/50 border-wood-200">
        <CardContent className="p-4 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-5 h-5 text-wood-700 flex-shrink-0" />
            <div>
              <p className="font-medium text-wood-900">{t('stages.subtitle', 'Owner-Managed Order Stages')}</p>
              <p className="text-wood-600 text-xs">
                {t('stages.reorderHint', 'No stages are hardcoded. Stages with active or historical orders cannot be hard-deleted to preserve audit integrity; deactivate them instead.')}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="border-wood-300 text-wood-800 font-mono">
            {stages.length} {t('stages.title', 'Configured Stages')}
          </Badge>
        </CardContent>
      </Card>

      {/* Stage Pipeline List */}
      {isLoading ? (
        <LoadingState message="Loading stage pipeline..." />
      ) : error ? (
        <ErrorState
          title="Could not load stages"
          message={(error as Error).message}
          onRetry={refetch}
        />
      ) : stages.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Layers className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-stone-800">No Stages Defined</h3>
            <p className="text-sm text-stone-500 mt-1 mb-4">
              Add your first custom stage to establish the order workflow pipeline.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-wood-600 hover:bg-wood-700">
              <Plus className="w-4 h-4 mr-2" /> Add First Stage
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <Card
              key={stage.id}
              className={`transition-all duration-150 border-l-4 ${
                stage.isActive ? 'bg-white' : 'bg-stone-50 opacity-75'
              }`}
              style={{ borderLeftColor: stage.color }}
            >
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      title="Move up in pipeline"
                    >
                      <ArrowUp className="w-4 h-4 text-stone-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      disabled={index === stages.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      title="Move down in pipeline"
                    >
                      <ArrowDown className="w-4 h-4 text-stone-500" />
                    </Button>
                  </div>

                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white" style={{ backgroundColor: stage.color }}>
                    {index + 1}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-stone-900 text-base">{translateStage(stage.name)}</h4>
                      {stage.isFinalStage && (
                        <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 mr-1" /> {t('stages.isFinalStage', 'Final Stage')}
                        </Badge>
                      )}
                      {!stage.isActive && (
                        <Badge variant="outline" className="text-stone-400 border-stone-300">
                          {t('common.inactive', 'Inactive')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-stone-500 mt-1">
                      <span className="flex items-center">
                        <span
                          className="w-2.5 h-2.5 rounded-full mr-1.5 inline-block"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.color}
                      </span>
                      <span>•</span>
                      <span>{t('stages.sequence', 'Sequence')}: {stage.sequenceOrder}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 self-end sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(stage)}
                    title={stage.isActive ? 'Deactivate stage' : 'Activate stage'}
                  >
                    {stage.isActive ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 mr-1" /> Deactivate
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Activate
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingStage(stage)}
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete stage "${stage.name}"? If any orders use this stage, deletion will be blocked.`)) {
                        deleteMutation.mutate(stage.id);
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Stage Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Order Stage</DialogTitle>
            <DialogDescription>
              Create a new workflow stage for tracking order progression across branches.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Stage Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Carpentry Assembly, Finishing, Ready"
                {...createForm.register('name')}
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Badge Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    className="w-10 h-10 p-0 border rounded cursor-pointer"
                    {...createForm.register('color')}
                  />
                  <Input {...createForm.register('color')} />
                </div>
                {createForm.formState.errors.color && (
                  <p className="text-xs text-red-500 mt-1">
                    {createForm.formState.errors.color.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="create-isFinal"
                  className="rounded border-stone-300 text-wood-600 focus:ring-wood-500 w-4 h-4 cursor-pointer"
                  {...createForm.register('isFinalStage')}
                />
                <label
                  htmlFor="create-isFinal"
                  className="text-sm font-medium text-stone-700 cursor-pointer"
                >
                  Marks order complete
                </label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-wood-600 hover:bg-wood-700"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating...' : 'Create Stage'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Stage Dialog */}
      {editingStage && (
        <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Stage: {editingStage.name}</DialogTitle>
              <DialogDescription>
                Update the stage name, color badge, or completion status.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const name = (form.elements.namedItem('edit-name') as HTMLInputElement).value;
                const color = (form.elements.namedItem('edit-color') as HTMLInputElement).value;
                const isFinalStage = (form.elements.namedItem('edit-isFinal') as HTMLInputElement).checked;

                updateMutation.mutate({
                  id: editingStage.id,
                  data: { name, color, isFinalStage },
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Stage Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="edit-name"
                  name="edit-name"
                  defaultValue={editingStage.name}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Badge Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      name="edit-color"
                      id="edit-color"
                      defaultValue={editingStage.color}
                      className="w-10 h-10 p-0 border rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="edit-isFinal"
                    name="edit-isFinal"
                    defaultChecked={editingStage.isFinalStage}
                    className="rounded border-stone-300 text-wood-600 focus:ring-wood-500 w-4 h-4 cursor-pointer"
                  />
                  <label
                    htmlFor="edit-isFinal"
                    className="text-sm font-medium text-stone-700 cursor-pointer"
                  >
                    Marks order complete
                  </label>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStage(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-wood-600 hover:bg-wood-700"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
export default OrderStagesPage;
