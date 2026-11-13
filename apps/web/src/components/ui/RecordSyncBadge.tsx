import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface RecordSyncBadgeProps {
  isPendingSync?: boolean;
  className?: string;
}

export const RecordSyncBadge: React.FC<RecordSyncBadgeProps> = ({
  isPendingSync,
  className = '',
}) => {
  const { t } = useLanguage();

  if (isPendingSync) {
    return (
      <span
        title="Saved locally on this device. Pending server synchronization."
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800 ${className}`}
      >
        <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
        <span>{t('common.pendingSync', 'Local (Pending Sync)')}</span>
      </span>
    );
  }

  return (
    <span
      title="Authoritatively confirmed by server."
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800 ${className}`}
    >
      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
      <span>{t('common.synced', 'Confirmed')}</span>
    </span>
  );
};
