import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center text-muted-foreground',
        className
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin text-wood-600 mb-3" />
      <p className="text-sm font-medium text-charcoal-700">{message}</p>
    </div>
  );
};
