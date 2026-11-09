import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  OrderDto,
  OrderStageDto,
  OrderMaterialCostDto,
  RawMaterialDto,
  CreateMaterialConsumptionDto,
} from '@furniture/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Boxes,
  Plus,
  Percent,
  TrendingUp,
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
  const { isOwner } = useAuth();
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [transitionNotes, setTransitionNotes] = useState<string>('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Material consumption form state
  const [isConsumeOpen, setIsConsumeOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [consumeQty, setConsumeQty] = useState<number>(1);
  const [consumeUnit, setConsumeUnit] = useState<string>('');
  const [consumeNotes, setConsumeNotes] = useState<string>('');
  const [consumeError, setConsumeError] = useState<string | null>(null);

  // 1. Fetch Order Material Costing
  const { data: costing, refetch: refetchCosting } = useQuery<OrderMaterialCostDto>({
    queryKey: ['order-costing', order?.id],
    queryFn: () => apiClient<OrderMaterialCostDto>(`/inventory/orders/${order?.id}/costing`),
    enabled: !!order?.id,
  });

  // 2. Fetch Raw Materials for consumption selection
  const { data: materials = [] } = useQuery<RawMaterialDto[]>({
    queryKey: ['raw-materials-dropdown'],
    queryFn: () => apiClient<RawMaterialDto[]>('/inventory/materials'),
    enabled: isConsumeOpen,
  });

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

  const consumptionMutation = useMutation({
    mutationFn: (data: CreateMaterialConsumptionDto) =>
      apiClient('/inventory/consumption', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-costing', order?.id] });
      queryClient.invalidateQueries({ queryKey: ['raw-materials'] });
      queryClient.invalidateQueries({ queryKey: ['stock-valuation'] });
      setIsConsumeOpen(false);
      setSelectedMaterialId('');
      setConsumeQty(1);
      setConsumeUnit('');
      setConsumeNotes('');
      setConsumeError(null);
    },
    onError: (err: any) => {
      setConsumeError(err.message || 'Failed to record material consumption.');
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

  const handleRecordConsumption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || consumeQty <= 0) {
      setConsumeError('Please select a material and enter a positive quantity.');
      return;
    }
    consumptionMutation.mutate({
      orderId: order.id,
      rawMaterialId: selectedMaterialId,
      consumedQuantity: consumeQty,
      unit: consumeUnit.trim() || undefined,
      notes: consumeNotes.trim() || undefined,
    });
  };

  const isFullyPaid = order.outstandingBalance <= 0;

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-3xl max-h-[92vh] overflow-y-auto p-3.5 sm:p-6">
        <DialogHeader className="border-b border-wood-100 pb-3 pr-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-mono text-xs font-bold text-wood-800">
                  {order.orderNumber}
                </span>
                <Badge
                  style={{
                    backgroundColor: order.currentStage?.color || '#8B5A2B',
                    color: '#ffffff',
                  }}
                  className="text-[10px] sm:text-[11px]"
                >
                  {order.currentStage?.name || 'In Production'}
                </Badge>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold mt-1 text-charcoal-900 break-words">
                Order for {order.customer?.fullName || 'Walk-In Customer'}
              </DialogTitle>
            </div>

            <div className="text-left sm:text-right text-xs text-muted-foreground flex sm:flex-col flex-wrap gap-x-3 gap-y-0.5">
              <div>Created: {new Date(order.createdAt).toLocaleDateString()}</div>
              <div className="flex items-center space-x-1 font-semibold text-charcoal-700">
                <Calendar className="h-3.5 w-3.5 text-wood-700" />
                <span>Deadline: {new Date(order.deadlineDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 sm:space-y-6 py-2">
          {/* Customer & Branch Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-wood-50/50 rounded-lg border border-wood-100 space-y-1 break-words">
              <div className="font-semibold text-charcoal-800 flex items-center space-x-1.5">
                <User className="h-3.5 w-3.5 text-wood-700" />
                <span>Customer Contact Information</span>
              </div>
              <p className="text-charcoal-900 font-medium break-words">{order.customer?.fullName}</p>
              <p className="text-charcoal-600 break-words">Phone: {order.customer?.phone}</p>
              {order.customer?.address && (
                <p className="text-charcoal-500 break-words">Address: {order.customer?.address}</p>
              )}
            </div>

            <div className="p-3 bg-wood-50/50 rounded-lg border border-wood-100 space-y-1 break-words">
              <div className="font-semibold text-charcoal-800 flex items-center space-x-1.5">
                <MapPin className="h-3.5 w-3.5 text-wood-700" />
                <span>Workshop Branch Tenancy</span>
              </div>
              <p className="text-charcoal-900 font-medium break-words">
                {order.branch?.name} ({order.branch?.code})
              </p>
              <p className="text-charcoal-600">Stock Mode: {order.branch?.stockMode}</p>
              <p className="text-charcoal-500 break-words">Location: {order.branch?.address}</p>
            </div>
          </div>

          {/* Authoritative Financial Balance Box */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-wood-200 bg-gradient-to-r from-wood-50/70 to-cream-50/50">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-2.5 sm:mb-3 flex items-center space-x-1.5">
              <DollarSign className="h-4 w-4 text-wood-700" />
              <span>Authoritative Financial Summary</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-2.5 bg-white/90 rounded-lg border border-wood-100 shadow-sm flex flex-row sm:flex-col justify-between sm:justify-center items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Agreed Price
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-wood-950">
                  {formatCurrency(order.totalAgreedPrice)}
                </span>
              </div>
              <div className="p-2.5 bg-white/90 rounded-lg border border-wood-100 shadow-sm flex flex-row sm:flex-col justify-between sm:justify-center items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Total Paid
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-emerald-700">
                  {formatCurrency(order.totalPaid)}
                </span>
              </div>
              <div className="p-2.5 bg-white/90 rounded-lg border border-wood-100 shadow-sm flex flex-row sm:flex-col justify-between sm:justify-center items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Outstanding Balance
                </span>
                <span
                  className={`font-mono text-sm sm:text-base font-bold ${
                    isFullyPaid ? 'text-emerald-600' : 'text-amber-800'
                  }`}
                >
                  {formatCurrency(order.outstandingBalance)}
                </span>
              </div>
            </div>
          </div>

          {/* Raw Material Consumption & Product Costing (Prompt 6) */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-wood-200 bg-white shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-800 flex items-center space-x-1.5">
                  <Boxes className="h-4 w-4 text-wood-700" />
                  <span>Production Material Costing & Margin</span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Frozen historical raw material costs allocated to this furniture order.
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsConsumeOpen(true)}
                className="h-8 text-xs text-wood-800 border-wood-300 hover:bg-wood-50 space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Log Material Usage</span>
              </Button>
            </div>

            {/* Costing & Profitability Pills (Owner sees Gross Profit/Margin) */}
            <div className={`grid ${isOwner ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'} gap-2 pt-1`}>
              <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Material Cost</span>
                <span className="font-mono font-bold text-stone-900 text-xs sm:text-sm">
                  {formatCurrency(costing?.totalMaterialCost || 0)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Agreed Selling</span>
                <span className="font-mono font-bold text-stone-900 text-xs sm:text-sm">
                  {formatCurrency(costing?.totalAgreedPrice || order.totalAgreedPrice)}
                </span>
              </div>
              {isOwner && (
                <>
                  <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-center">
                    <span className="text-[10px] text-emerald-800 uppercase font-semibold block">Gross Profit</span>
                    <span className="font-mono font-bold text-emerald-900 text-xs sm:text-sm">
                      {formatCurrency(costing?.grossProfit || order.totalAgreedPrice)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-wood-50/80 border border-wood-200 text-center">
                    <span className="text-[10px] text-wood-800 uppercase font-semibold block">Gross Margin</span>
                    <span className="font-mono font-bold text-wood-900 text-xs sm:text-sm">
                      {costing?.grossMarginPercentage || 100}%
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Consumed Materials Table */}
            {costing?.consumptions && costing.consumptions.length > 0 ? (
              <div className="border rounded-md overflow-x-auto w-full text-xs">
                <Table className="min-w-[480px]">
                  <TableHeader className="bg-stone-50">
                    <TableRow>
                      <TableHead>Material</TableHead>
                      <TableHead className="text-right">Qty Consumed</TableHead>
                      <TableHead className="text-right">Allocated WAC Cost</TableHead>
                      <TableHead className="text-right">Cost Contribution</TableHead>
                      <TableHead>Logged By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {costing.consumptions.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-semibold text-stone-900">{c.rawMaterialName}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{c.rawMaterialCode}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {c.consumedQuantity} {c.unitOfMeasurement}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(c.unitCostAllocated)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-wood-900">
                          {formatCurrency(c.totalMaterialCost)}
                        </TableCell>
                        <TableCell className="text-stone-600 text-[11px]">
                          {c.recordedByUserName}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic bg-stone-50 p-2.5 rounded border text-center">
                No materials logged yet for this order. Click "Log Material Usage" as workshop staff assemble this order.
              </p>
            )}
          </div>

          {/* Order Stage Pipeline & Transition Controls */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-wood-200 bg-white space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex flex-wrap items-center justify-between gap-1">
              <span>Production Workflow Pipeline</span>
              <span className="text-[10px] lowercase font-normal text-muted-foreground">
                Move order through configured stages
              </span>
            </h4>

            {/* Stage Progress Bar / Chips */}
            <div className="flex flex-wrap items-center gap-1.5 py-1">
              {stages.map((st, idx) => {
                const isCurrent = st.id === order.currentStageId;
                return (
                  <div key={st.id} className="flex items-center">
                    <div
                      className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                        isCurrent
                          ? 'border-wood-800 bg-wood-800 text-white shadow-sm ring-2 ring-wood-300'
                          : 'border-wood-200 bg-wood-50/50 text-charcoal-600'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: st.color }}
                      />
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
            <div className="pt-3 border-t border-wood-200/60 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
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
                className="w-full sm:flex-1 h-9 px-3 rounded-md border border-input bg-background text-xs"
              />

              <Button
                size="sm"
                onClick={handleStageTransition}
                disabled={!targetStageId || stageMutation.isPending}
                className="w-full sm:w-auto h-9 text-xs shrink-0"
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
            <div className="border rounded-lg overflow-x-auto w-full">
              <Table className="min-w-[420px]">
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
                      <TableCell className="font-medium text-xs break-words">
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

      {/* Log Material Consumption Modal */}
      {isConsumeOpen && (
        <Dialog open={isConsumeOpen} onOpenChange={setIsConsumeOpen}>
          <DialogContent className="w-[94vw] sm:w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">Log Material Consumption</DialogTitle>
              <DialogDescription className="text-xs">
                Deduct raw materials consumed from inventory and allocate frozen historical cost to Order {order.orderNumber}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRecordConsumption} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Raw Material <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  required
                >
                  <option value="">-- Choose Raw Material --</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.code}) — {m.currentStockQuantity} {m.unitOfMeasurement} available
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Quantity Consumed <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={consumeQty}
                    onChange={(e) => setConsumeQty(parseFloat(e.target.value) || 0)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Custom Unit (Optional)
                  </label>
                  <Input
                    placeholder="e.g. cm, m, sqft"
                    value={consumeUnit}
                    onChange={(e) => setConsumeUnit(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Workshop Usage Notes
                </label>
                <Input
                  placeholder="e.g. Table frame assembly and joinery"
                  value={consumeNotes}
                  onChange={(e) => setConsumeNotes(e.target.value)}
                />
              </div>

              {consumeError && (
                <p className="text-xs text-red-600 font-medium">{consumeError}</p>
              )}

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsConsumeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-wood-700 hover:bg-wood-800"
                  disabled={consumptionMutation.isPending}
                >
                  {consumptionMutation.isPending ? 'Logging Usage...' : 'Confirm Consumption'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};
