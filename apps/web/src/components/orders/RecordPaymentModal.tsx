import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderDto, PaymentDto, PaymentType, CreatePaymentInput } from '@furniture/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { db } from '@/lib/db';
import { syncEngine } from '@/lib/sync-engine';
import { formatCurrency } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';
import { CreditCard, DollarSign, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';

interface RecordPaymentModalProps {
  order: OrderDto | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (payment: PaymentDto) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [amount, setAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<PaymentType>(PaymentType.FINAL_SETTLEMENT);
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset when order opens
  useEffect(() => {
    if (order && isOpen) {
      const balance = Number(order.outstandingBalance) || 0;
      setAmount(balance);
      setPaymentType(
        balance > 0 ? PaymentType.FINAL_SETTLEMENT : PaymentType.PROGRESS_PAYMENT
      );
      setPaymentMethod('Cash');
      setReferenceNumber('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setError(null);
    }
  }, [order, isOpen]);

  const paymentMutation = useMutation({
    mutationFn: (data: CreatePaymentInput) =>
      apiClient<PaymentDto>('/payments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });

  if (!order) return null;

  const currentOutstanding = Number(order.outstandingBalance) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Payment amount must be greater than 0.');
      return;
    }

    if (numericAmount > currentOutstanding) {
      setError(
        `Payment amount (${formatCurrency(numericAmount)}) cannot exceed the outstanding balance of ${formatCurrency(currentOutstanding)}.`
      );
      return;
    }

    const payload: CreatePaymentInput = {
      orderId: order.id,
      amount: numericAmount,
      paymentType,
      paymentMethod,
      referenceNumber: referenceNumber.trim() || undefined,
      paymentDate: new Date(paymentDate).toISOString(),
    };

    if (!navigator.onLine) {
      // Offline mode: queue in outbox & update local Dexie cache
      const tempId = `temp-pay-${crypto.randomUUID()}`;
      await syncEngine.enqueueMutation({
        entityType: 'PAYMENT',
        action: 'CREATE',
        payload,
        tempEntityId: tempId,
      });

      // Optimistically update Dexie local order record
      const localOrder = await db.orders.get(order.id);
      if (localOrder) {
        const newPaid = Number(localOrder.totalPaid || 0) + numericAmount;
        const newBal = Math.max(0, Number(localOrder.outstandingBalance || 0) - numericAmount);
        await db.orders.update(order.id, {
          totalPaid: newPaid,
          outstandingBalance: newBal,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['order-payments', order.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });

      onSuccess?.({
        id: tempId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customer?.fullName || 'Walk-In Customer',
        amount: numericAmount,
        paymentType,
        paymentMethod,
        referenceNumber: referenceNumber.trim() || undefined,
        paymentDate: payload.paymentDate || new Date().toISOString(),
        recordedByUserId: 'local',
        recordedByUserName: 'Current Staff',
      });

      onClose();
      return;
    }

    try {
      const createdPayment = await paymentMutation.mutateAsync(payload);

      // Cache server record in IndexedDB
      await db.payments.put({
        id: createdPayment.id,
        orderId: createdPayment.orderId,
        amount: createdPayment.amount,
        paymentType: createdPayment.paymentType,
        paymentMethod: createdPayment.paymentMethod,
        referenceNumber: createdPayment.referenceNumber,
        paymentDate: createdPayment.paymentDate,
        isPendingSync: false,
      });

      // Update local order
      const localOrder = await db.orders.get(order.id);
      if (localOrder) {
        const newPaid = Number(localOrder.totalPaid || 0) + numericAmount;
        const newBal = Math.max(0, Number(localOrder.outstandingBalance || 0) - numericAmount);
        await db.orders.update(order.id, {
          totalPaid: newPaid,
          outstandingBalance: newBal,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', order.id] });
      queryClient.invalidateQueries({ queryKey: ['order-payments', order.id] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });

      onSuccess?.(createdPayment);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record payment. Please try again.');
    }
  };

  const paymentMethods = ['Cash', 'Bank Transfer', 'Telebirr', 'CBE Birr', 'Check'];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-full max-w-lg p-4 sm:p-6 rounded-2xl bg-white shadow-2xl">
        <DialogHeader className="pr-6 border-b border-wood-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-stone-900">
                {t('paymentModal.title', 'Record Order Payment')}: {order.orderNumber}
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500">
                {t('orders.customer', 'Customer')}: <strong>{order.customer?.fullName || t('orders.selectCustomer', 'Customer')}</strong> • {order.branch?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Live Balance Overview Banner */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-wood-50/60 rounded-xl border border-wood-200/80 text-center text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              {t('orders.agreedPrice', 'Agreed Total')}
            </span>
            <span className="font-mono font-bold text-stone-800 text-xs sm:text-sm">
              {formatCurrency(order.totalAgreedPrice)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              {t('orderDetail.totalPaid', 'Already Paid')}
            </span>
            <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
              {formatCurrency(order.totalPaid)}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              {t('orders.balanceDue', 'Remaining')}
            </span>
            <span className="font-mono font-bold text-amber-800 text-xs sm:text-sm">
              {formatCurrency(currentOutstanding)}
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Amount input & quick settlement shortcut */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                {t('paymentModal.paymentAmount', 'Payment Amount')} (ETB) <span className="text-red-500">*</span>
              </label>
              {currentOutstanding > 0 && amount !== currentOutstanding && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(currentOutstanding);
                    setPaymentType(PaymentType.FINAL_SETTLEMENT);
                  }}
                  className="text-[11px] text-emerald-800 font-semibold hover:underline"
                >
                  {t('orderDetail.finalSettlement', 'Pay Full Balance')} ({formatCurrency(currentOutstanding)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-stone-500">
                ETB
              </span>
              <Input
                type="number"
                step="any"
                min="0.01"
                max={currentOutstanding}
                value={amount || ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setAmount(val);
                  if (val >= currentOutstanding) {
                    setPaymentType(PaymentType.FINAL_SETTLEMENT);
                  } else {
                    setPaymentType(PaymentType.PROGRESS_PAYMENT);
                  }
                }}
                placeholder={`Max ${currentOutstanding}`}
                className="pl-12 font-mono font-bold text-sm bg-background/50 border-wood-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Payment Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                {t('paymentModal.paymentType', 'Payment Type')}
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                className="w-full h-9 rounded-md border border-wood-200 bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-wood-400"
              >
                <option value={PaymentType.FINAL_SETTLEMENT}>{t('orderDetail.finalSettlement', 'Final Settlement (Closing Balance)')}</option>
                <option value={PaymentType.PROGRESS_PAYMENT}>{t('orderDetail.progressPayment', 'Progress Payment (Milestone)')}</option>
                <option value={PaymentType.PREPAYMENT}>{t('orderDetail.depositPrepayment', 'Prepayment / Deposit')}</option>
              </select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                {t('paymentModal.paymentMethod', 'Payment Method')}
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 rounded-md border border-wood-200 bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-wood-400"
              >
                {paymentMethods.map((m) => (
                  <option key={m} value={m}>
                    {m === 'Cash' ? t('paymentModal.cash', 'Cash') : m === 'Telebirr' ? t('paymentModal.telebirr', 'Telebirr') : m === 'CBE Birr' ? t('paymentModal.cbeBank', 'CBE Birr') : m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reference Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                {t('paymentModal.referenceNumber', 'Transaction / Receipt Ref (Optional)')}
              </label>
              <Input
                placeholder={t('paymentModal.referencePlaceholder', 'e.g. CBE-TXN-98402, Telebirr #, Receipt')}
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="h-9 text-xs font-mono bg-background/50 border-wood-200"
              />
            </div>

            {/* Payment Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                {t('common.date', 'Payment Date')}
              </label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-9 text-xs bg-background/50 border-wood-200"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-wood-100 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={paymentMutation.isPending}
              className="w-full sm:w-auto text-xs"
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={paymentMutation.isPending || amount <= 0}
              className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white space-x-1.5 text-xs shadow"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {paymentMutation.isPending
                  ? t('paymentModal.recording', 'Recording Payment...')
                  : `${t('paymentModal.recordPaymentBtn', 'Confirm Payment')} (${formatCurrency(amount || 0)})`}
              </span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
