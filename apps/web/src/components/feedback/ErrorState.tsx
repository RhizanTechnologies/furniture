import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/LanguageContext';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title,
  message,
  onRetry,
  className,
}) => {
  const { t } = useLanguage();
  const displayTitle = title || t('common.somethingWentWrong', 'Something went wrong');
  const displayMessage = message || t('common.unexpectedError', 'An unexpected error occurred while communicating with the server.');

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50/50 p-8 text-center',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-red-950">{displayTitle}</h3>
      <p className="mt-1 text-sm text-red-700 max-w-sm mb-4">{displayMessage}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} size="sm">
          {t('common.tryAgain', 'Try Again')}
        </Button>
      )}
    </div>
  );
};
