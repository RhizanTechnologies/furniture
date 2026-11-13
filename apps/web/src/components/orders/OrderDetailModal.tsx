import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  OrderDto,
  OrderStageDto,
  OrderMaterialCostDto,
  RawMaterialDto,
  PaymentDto,
  CreateMaterialConsumptionDto,
} from '@furniture/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RecordPaymentModal } from './RecordPaymentModal';
import { apiClient } from '@/lib/api-client';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
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
  Layers,
  CreditCard,
  Receipt,
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
  const { t, translateStage } = useLanguage();
  const [targetStageId, setTargetStageId] = useState<string>('');
  const [transitionNotes, setTransitionNotes] = useState<string>('');
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Payment recording state
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  // Material consumption form state
  const [isConsumeOpen, setIsConsumeOpen] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [consumeQty, setConsumeQty] = useState<number>(1);
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

  // 3. Fetch Order Payments History
  const { data: orderPayments = [] } = useQuery<PaymentDto[]>({
    queryKey: ['order-payments', order?.id],
    queryFn: () => apiClient<PaymentDto[]>(`/payments?orderId=${order?.id}`),
    enabled: !!order?.id,
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

  const selectedMaterial = materials.find((m) => m.id === selectedMaterialId);

  const handleRecordConsumption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId || consumeQty <= 0) {
      setConsumeError('Please select a material and enter a positive quantity.');
      return;
    }
    if (selectedMaterial && consumeQty > selectedMaterial.currentStockQuantity) {
      setConsumeError(
        `Entered quantity (${consumeQty} ${selectedMaterial.unitOfMeasurement}) exceeds available inventory (${selectedMaterial.currentStockQuantity} ${selectedMaterial.unitOfMeasurement}). Negative stock is disallowed.`
      );
      return;
    }
    consumptionMutation.mutate({
      orderId: order.id,
      rawMaterialId: selectedMaterialId,
      consumedQuantity: consumeQty,
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
                  {translateStage(order.currentStage?.name || 'In Production')}
                </Badge>
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold mt-1 text-charcoal-900 break-words">
                {t('orderDetail.title', 'Order Details')}: {order.customer?.fullName || t('orders.customer', 'Customer')}
              </DialogTitle>
            </div>

            <div className="text-left sm:text-right text-xs text-muted-foreground flex sm:flex-col flex-wrap gap-x-3 gap-y-0.5">
              <div>{t('common.created', 'Created')}: {new Date(order.createdAt).toLocaleDateString()}</div>
              <div className="flex items-center space-x-1 font-semibold text-charcoal-700">
                <Calendar className="h-3.5 w-3.5 text-wood-700" />
                <span>{t('orders.deadline', 'Deadline')}: {new Date(order.deadlineDate).toLocaleDateString()}</span>
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
                <span>{t('orderDetail.customerInfo', 'Customer Contact Information')}</span>
              </div>
              <p className="text-charcoal-900 font-medium break-words">{order.customer?.fullName}</p>
              <p className="text-charcoal-600 break-words">{t('common.phone', 'Phone')}: {order.customer?.phone}</p>
              {order.customer?.address && (
                <p className="text-charcoal-500 break-words">{t('common.address', 'Address')}: {order.customer?.address}</p>
              )}
            </div>

            <div className="p-3 bg-wood-50/50 rounded-lg border border-wood-100 space-y-1 break-words">
              <div className="font-semibold text-charcoal-800 flex items-center space-x-1.5">
                <MapPin className="h-3.5 w-3.5 text-wood-700" />
                <span>{t('common.branch', 'Branch')}</span>
              </div>
              <p className="text-charcoal-900 font-medium break-words">
                {order.branch?.name} ({order.branch?.code})
              </p>
              <p className="text-charcoal-600">{t('branches.stockMode', 'Stock Mode')}: {order.branch?.stockMode}</p>
              <p className="text-charcoal-500 break-words">{t('common.address', 'Location')}: {order.branch?.address}</p>
            </div>
          </div>

          {/* Authoritative Financial Balance Box */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-wood-200 bg-gradient-to-r from-wood-50/70 to-cream-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center space-x-1.5">
                <DollarSign className="h-4 w-4 text-wood-700" />
                <span>{t('finance.title', 'Financial Summary')}</span>
              </h4>
              {!isFullyPaid && (
                <Button
                  size="sm"
                  onClick={() => setIsPaymentOpen(true)}
                  className="h-7 text-xs bg-emerald-700 hover:bg-emerald-800 text-white space-x-1.5 shadow-sm px-2.5"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{t('orders.recordPayment', 'Record Payment')}</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-center">
              <div className="p-2.5 bg-white/90 rounded-lg border border-wood-100 shadow-sm flex flex-row sm:flex-col justify-between sm:justify-center items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  {t('orders.agreedPrice', 'Agreed Price')}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-wood-950">
                  {formatCurrency(order.totalAgreedPrice)}
                </span>
              </div>
              <div className="p-2.5 bg-white/90 rounded-lg border border-wood-100 shadow-sm flex flex-row sm:flex-col justify-between sm:justify-center items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  {t('orderDetail.totalPaid', 'Total Paid')}
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-emerald-700">
                  {formatCurrency(order.totalPaid)}
                </span>
              </div>
              <div className="p-2.5 bg-white/90 rounded-lg border border-wood-100 shadow-sm flex flex-row sm:flex-col justify-between sm:justify-center items-center">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  {t('orders.balanceDue', 'Outstanding Balance')}
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

            {/* Settle Balance CTA / Fully Paid banner */}
            {!isFullyPaid ? (
              <div className="pt-2 border-t border-wood-200/60 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs text-amber-900 font-medium">
                  {t('orderDetail.balanceRemaining', 'Remaining to collect')}:{' '}
                  <span className="font-mono font-bold text-sm text-amber-800">
                    {formatCurrency(order.outstandingBalance)}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsPaymentOpen(true)}
                  className="w-full sm:w-auto h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white space-x-1.5 shadow"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>{t('orderDetail.recordPaymentBtn', 'Settle / Record Progress Payment')}</span>
                </Button>
              </div>
            ) : (
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{t('orderDetail.finalSettlement', 'Order is fully paid and cleared')}</span>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                  {t('orderDetail.totalPaid', 'Zero Outstanding Balance')}
                </Badge>
              </div>
            )}
          </div>

          {/* Payment Receipts & Transaction Audit */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-wood-200 bg-white shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-800 flex items-center space-x-1.5">
                <Receipt className="h-4 w-4 text-wood-700" />
                <span>{t('finance.paymentsTab', 'Payment Receipts & Inflow Ledger')} ({orderPayments.length})</span>
              </h4>
              {!isFullyPaid && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPaymentOpen(true)}
                  className="h-7 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50 space-x-1"
                >
                  <Plus className="h-3 w-3" />
                  <span>{t('orders.recordPayment', 'Add Payment')}</span>
                </Button>
              )}
            </div>

            {orderPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2 text-center">
                {t('orderDetail.noPaymentsYet', 'No individual payment transactions recorded yet.')}
              </p>
            ) : (
              <div className="space-y-2">
                {orderPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-2.5 rounded-lg border border-wood-100 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-stone-900">
                          {formatCurrency(p.amount)}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[9px] py-0 bg-white border-wood-200 text-wood-900"
                        >
                          {p.paymentType}
                        </Badge>
                        <span className="text-[11px] text-stone-500 font-medium">
                          via {p.paymentMethod}
                        </span>
                      </div>
                      {p.referenceNumber && (
                        <div className="font-mono text-[11px] text-stone-600">
                          Ref: {p.referenceNumber}
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground sm:text-right">
                      <div>{new Date(p.paymentDate).toLocaleDateString()}</div>
                      <div className="text-[10px]">{t('common.createdBy', 'Logged by')} {p.recordedByUserName || 'Staff'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Raw Material Consumption & Product Costing (Prompt 6) */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-wood-200 bg-white shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-800 flex items-center space-x-1.5">
                  <Boxes className="h-4 w-4 text-wood-700" />
                  <span>{t('orderDetail.materialCostSummary', 'Production Material Costing & Margin')}</span>
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {t('orderDetail.materialsUsed', 'Frozen historical raw material costs allocated to this furniture order.')}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsConsumeOpen(true)}
                className="h-8 text-xs text-wood-800 border-wood-300 hover:bg-wood-50 space-x-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t('inventory.recordUsedBtn', 'Log Material Usage')}</span>
              </Button>
            </div>

            {/* Costing & Profitability Pills (Owner sees Material Costs, Gross Profit & Margin) */}
            {isOwner ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('inventory.unitCost', 'Material Cost')}</span>
                  <span className="font-mono font-bold text-stone-900 text-xs sm:text-sm">
                    {formatCurrency(costing?.totalMaterialCost || 0)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-center">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">{t('orders.agreedPrice', 'Agreed Selling')}</span>
                  <span className="font-mono font-bold text-stone-900 text-xs sm:text-sm">
                    {formatCurrency(costing?.totalAgreedPrice || order.totalAgreedPrice)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-800 uppercase font-semibold block">{t('finance.grossProfit', 'Gross Profit')}</span>
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
              </div>
            ) : (
              <div className="pt-1">
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <span className="text-xs text-stone-600 font-medium">{t('orders.agreedPrice', 'Contracted Agreed Price')}:</span>
                  <span className="font-mono font-bold text-stone-900 text-sm">
                    {formatCurrency(order.totalAgreedPrice)}
                  </span>
                </div>
              </div>
            )}

            {/* Consumed Materials Cards (Card-based layout for full responsive PWA) */}
            {costing?.consumptions && costing.consumptions.length > 0 ? (
              <div className="space-y-2">
                {costing.consumptions.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-lg border border-wood-100 bg-stone-50/60 hover:bg-stone-50 transition-colors space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-stone-900 break-words">{c.rawMaterialName}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{c.rawMaterialCode}</div>
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">
                        {c.consumedQuantity} {c.unitOfMeasurement}
                      </Badge>
                    </div>

                    {isOwner && (
                      <div className="pt-2 border-t border-dashed border-stone-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="text-muted-foreground">
                          Unit WAC Cost: <span className="font-mono text-stone-800">{formatCurrency(c.unitCostAllocated)}</span>
                        </div>
                        <div className="text-stone-800">
                          Allocated Cost: <span className="font-mono font-bold text-wood-900">{formatCurrency(c.totalMaterialCost)}</span>
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-muted-foreground flex justify-between items-center pt-0.5">
                      <span>{t('common.createdBy', 'Logged by')}: {c.recordedByUserName || 'Staff'}</span>
                      {c.consumedAt && <span>{new Date(c.consumedAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic bg-stone-50 p-2.5 rounded border text-center">
                {t('inventory.noMaterials', 'No materials logged yet for this order. Click "Log Material Usage" as workshop staff assemble this order.')}
              </p>
            )}
          </div>

          {/* Order Stage Pipeline & Transition Controls */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-wood-200 bg-white space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex flex-wrap items-center justify-between gap-2">
              <span>{t('orderDetail.orderTimeline', 'Production Workflow Pipeline')}</span>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] lowercase font-normal text-muted-foreground hidden sm:inline">
                  {t('stages.reorderHint', 'Move order through configured stages')}
                </span>
                {isOwner && (
                  <Link
                    to="/order-stages"
                    onClick={onClose}
                    className="inline-flex items-center space-x-1 text-[11px] font-semibold text-wood-700 hover:text-wood-950 bg-wood-50 hover:bg-wood-100 border border-wood-200 px-2 py-0.5 rounded transition-colors"
                  >
                    <Layers className="h-3 w-3" />
                    <span>{t('stages.title', 'Customize Stages')}</span>
                  </Link>
                )}
              </div>
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
                      <span>{translateStage(st.name)}</span>
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
                <option value="">{t('orderDetail.selectNextStage', '-- Move to Next Stage --')}</option>
                {stages.map((st) => (
                  <option key={st.id} value={st.id} disabled={st.id === order.currentStageId}>
                    {translateStage(st.name)} {st.id === order.currentStageId ? `(${t('common.active', 'Current')})` : ''}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder={t('orders.specialNotesPlaceholder', 'Transition remarks (optional e.g. Quality checked)')}
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
                {stageMutation.isPending ? t('common.loading', 'Updating...') : t('orderDetail.changeStageBtn', 'Advance Stage')}
              </Button>
            </div>

            {transitionError && (
              <p className="text-xs text-red-600 font-medium">{transitionError}</p>
            )}
          </div>

          {/* Ordered Furniture Items Cards (Card-based layout for full responsive PWA) */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 flex items-center justify-between">
              <span>{t('orders.itemsSection', 'Contracted Furniture Products')}</span>
              <span className="text-[11px] font-normal text-muted-foreground font-mono">
                {order.items?.length || 0} {t('common.details', 'items')}
              </span>
            </h4>

            <div className="space-y-2">
              {order.items?.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-wood-200/90 bg-white shadow-xs space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="font-semibold text-stone-900 leading-snug break-words">
                        {item.itemDescription}
                      </div>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs shrink-0 bg-stone-50 border-stone-300">
                      {t('orders.quantity', 'Qty')}: <span className="font-bold ml-1">{item.quantity}</span>
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-dashed border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="text-muted-foreground">
                      {t('orders.unitPrice', 'Unit Price')}: <span className="font-mono text-stone-800">{formatCurrency(item.unitPrice)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground text-[11px] mr-1">{t('orders.subtotal', 'Subtotal')}:</span>
                      <span className="font-mono font-bold text-wood-950 text-xs sm:text-sm">
                        {formatCurrency(item.subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage Progression History Audit Trail */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-700 mb-2 flex items-center space-x-1.5">
              <History className="h-3.5 w-3.5 text-wood-700" />
              <span>{t('stages.title', 'Immutable Stage Progression Audit Log')}</span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {order.stageHistories?.map((hist) => (
                <div
                  key={hist.id}
                  className="p-2.5 rounded-md border border-wood-100 bg-white text-xs flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium flex items-center space-x-1.5">
                      <span>{hist.fromStageName ? translateStage(hist.fromStageName) : t('common.details', 'Initiation')}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <strong className="text-wood-900">{translateStage(hist.toStageName)}</strong>
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
            {t('common.close', 'Close')}
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

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-stone-700">
                    Quantity Consumed <span className="text-red-500">*</span>
                  </label>
                  {selectedMaterial && (
                    <Badge variant="outline" className="text-xs font-mono bg-wood-50 text-wood-900 border-wood-300">
                      Preset Unit: {selectedMaterial.unitOfMeasurement}
                    </Badge>
                  )}
                </div>

                <div className="relative">
                  <Input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={consumeQty}
                    onChange={(e) => {
                      setConsumeQty(parseFloat(e.target.value) || 0);
                      setConsumeError(null);
                    }}
                    className={selectedMaterial ? 'pr-20 font-mono' : 'font-mono'}
                    placeholder="0.00"
                    required
                  />
                  {selectedMaterial && (
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-0.5 rounded bg-wood-100 text-wood-900 pointer-events-none">
                      {selectedMaterial.unitOfMeasurement}
                    </span>
                  )}
                </div>

                {selectedMaterial ? (
                  <div className="mt-2 p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Preset Unit of Measure:</span>
                      <strong className="text-wood-950 font-semibold">{selectedMaterial.unitOfMeasurement}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-600">Available Inventory:</span>
                      <span className="font-mono font-medium text-stone-900">{selectedMaterial.currentStockQuantity} {selectedMaterial.unitOfMeasurement}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-dashed border-stone-200">
                      <span className="text-stone-600">Allocated WAC Unit Cost:</span>
                      <span className="font-mono text-wood-900 font-bold">{formatCurrency(selectedMaterial.currentUnitCost)} / {selectedMaterial.unitOfMeasurement}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1 italic">
                    Select a raw material above to display its fixed measurement unit and available workshop inventory.
                  </p>
                )}
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

      {/* Record Payment Modal */}
      <RecordPaymentModal
        order={order}
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
      />
    </Dialog>
  );
};
