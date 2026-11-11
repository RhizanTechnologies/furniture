import React from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 sm:pb-6 border-b border-wood-200/60 mb-4 sm:mb-6',
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-charcoal-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-xs sm:text-sm text-charcoal-600 max-w-2xl leading-normal">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto pt-1 sm:pt-0 shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};
