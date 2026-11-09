import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderDto, OrderStageDto } from '@furniture/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import {
  Calendar,
  User,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  History,
} from 'lucide-react';

interface OrderDetailModalProps {
  order: OrderDto | null;
  stages: OrderStageDto[];
  onClose: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  stages,
  onClose,
}) => {
  const queryClient = useQueryClient();
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [transitionNotes, setTransitionNotes] = useState<string>('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const stageMutation = useMutation({
    mutationFn: (data: { toStageId: string; notes?: string }) =>
      apiClient<OrderDto>(`/orders/${order?.id}/stage`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order?.id] });
      setTargetStageId('');
      setTransitionNotes('');
      setTransitionError(null);
    },
    onError: (err: any) => {
      setTransitionError(err.message || 'Failed to update order stage.');
    },
  });

  if (!order) return null;

  const handleStageTransition = () => {
    if (!targetStageId) return;
    stageMutation.mutate({
      toStageId: targetStageId,
      notes: transitionNotes || undefined,
    });
  };

  const isFullyPaid = order.outstandingBalance <= 0;

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-wood-100 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold text-wood-800">
                  {order.orderNumber}
                </span>
                <Badge
                  style={{
                    backgroundColor: order.currentStage?.color || '#8B5A2B',
                    color: '#ffffff',
                  }}
                  className="text-[11px]"
                >
                  {order.currentStage?.name || 'In Production'}
                </Badge>
              </div>
              <DialogTitle className="text-xl font-bold mt-1">
                Order for {order.customer?.fullName || 'Walk-In Customer'}
              </DialogTitle>
            </div>

            <div className="text-right text-xs text-muted-foreground">
              <div>Created: {new Date(order.createdAt).toLocaleDateString()}</div>
              <div className="flex items-center space-x-1 font-semibold text-charcoal-700 mt-0.5">
                <Calendar className="h-3.5 w-3.5 text-wood-700" />
                <span>Deadline: {new Date(order.deadlineDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Customer & Branch Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-lg bg-wood-50/70 border border-wood-200 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-charcoal-800 flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-wood-700" />
                <span>{order.customer?.fullName}</span>
              </span>
              <div className="text-muted-foreground pl-5">{order.customer?.phone}</div>
              {order.customer?.address && (
                <div className="text-muted-foreground pl-5 truncate">
                  {order.customer?.address}
                </div>
              )}
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="font-semibold text-charcoal-800 flex items-center sm:justify-end space-x-1.5">
                <MapPin className="h-3.5 w-3.5 text-wood-700" />
                <span>{order.branch?.name || 'Assigned Branch'}</span>
              </span>
              <div className="text-muted-foreground font-mono">
                Stock Mode: {order.branch?.stockMode === 'MAIN_STOCK' ? 'Main Stock' : 'Branch Stock'}
              </div>
            </div>
          </div>

          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-wood-200 bg-white">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">
                Agreed Total Price
              </div>
              <div className="text-lg font-bold text-charcoal-900 mt-1">
                {formatCurrency(order.totalAgreedPrice)}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-wood-200 bg-white">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">
                Total Paid / Deposit
              </div>
              <div className="text-lg font-bold text-emerald-800 mt-1">
                {formatCurrency(order.totalPaid)}
              </div>
            </div>

            <div className="p-3 rounded-lg border border-wood-200 bg-white">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">
                Outstanding Balance
              </div>
              <div className="text-lg font-bold mt-1">
                {isFullyPaid ? (
                  <span className="text-emerald-700 flex items-center space-x-1 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Settled</span>
                  </span>
                ) : (
                  <span className="text-amber-800">
                    {formatCurrency(order.outstandingBalance)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Visual Stage Pipeline */}
          <div className="space-y-3 p-4 rounded-lg bg-wood-50/90 border border-wood-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Production Stage Progression
              </h4>
              <Badge variant="wood" className="text-[10px]">
                Stage: {order.currentStage?.name}
              </Badge>
            </div>

            {/* Stage Step Indicators */}
            <div className="flex items-center overflow-x-auto py-2 gap-1.5 scrollbar-thin">
              {stages.map((st, idx) => {
                const isCurrent = order.currentStageId === st.id;
                const isPast =
                  order.stageHistories?.some((h) => h.toStageId === st.id) && !isCurrent;

                return (
                  <div key={st.id} className="flex items-center shrink-0">
                    <div
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center space-x-1.5 transition-all ${
                        isCurrent
                          ? 'bg-wood-800 text-white border-wood-900 shadow-sm font-bold ring-2 ring-wood-400'
                          : isPast
                          ? 'bg-wood-200/70 text-wood-950 border-wood-300'
                          : 'bg-white text-muted-foreground border-wood-200 opacity-60'
                      }`}
                    >
                      <span className="h-4 w-4 rounded-full bg-black/10 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{st.name}</span>
                    </div>
                    {idx < stages.length - 1 && (
                      <ArrowRight className="h-3 w-3 text-wood-400 mx-1 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Advance Stage Control */}
            <div className="pt-3 border-t border-wood-200/60 flex flex-col sm:flex-row gap-2 items-center">
              <select
                value={targetStageId}
                onChange={(e) => setTargetStageId(e.target.value)}
                className="w-full sm:w-60 h-9 px-3 rounded-md border border-input bg-background text-xs font-medium"
              >
                <option value="">-- Move to Next Stage --</option>
                {stages.map((st) => (
                  <option key={st.id} value={st.id} disabled={st.id === order.currentStageId}>
                    {st.name} {st.id === order.currentStageId ? '(Current)' : ''}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Transition remarks (optional e.g. Quality checked)"
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-xs"
              />

              <Button
                size="sm"
                onClick={handleStageTransition}
                disabled={!targetStageId || stageMutation.isPending}
                className="w-full sm:w-auto h-9 text-xs"
              >
                {stageMutation.isPending ? 'Updating...' : 'Advance Stage'}
              </Button>
            </div>

            {transitionError && (
              <p className="text-xs text-red-600 font-medium">{transitionError}</p>
            )}
          </div>

          {/* Ordered Furniture Items Table */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-2">
              Contracted Furniture Products
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Specification / Description</TableHead>
                  <TableHead className="text-center">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs">
                      {item.itemDescription}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Stage Progression History Audit Trail */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-2 flex items-center space-x-1.5">
              <History className="h-3.5 w-3.5 text-wood-700" />
              <span>Immutable Stage Progression Audit Log</span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {order.stageHistories?.map((hist) => (
                <div
                  key={hist.id}
                  className="p-2.5 rounded-md border border-wood-100 bg-white text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium flex items-center space-x-1.5">
                      <span>{hist.fromStageName || 'Initiation'}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <strong className="text-wood-900">{hist.toStageName}</strong>
                    </div>
                    {hist.notes && (
                      <div className="text-charcoal-600 italic text-[11px]">
                        "{hist.notes}"
                      </div>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-muted-foreground">
                    <div>{hist.changedByUserName}</div>
                    <div>{new Date(hist.changedAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2 border-t border-wood-100">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
