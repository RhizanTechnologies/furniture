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
        'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-6 border-b border-wood-200/60 mb-6',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-charcoal-900 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-charcoal-600 max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center space-x-2">{action}</div>}
    </div>
  );
};
