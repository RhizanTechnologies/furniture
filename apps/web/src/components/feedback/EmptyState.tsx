import React from 'react';
import { PackageOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-wood-300 p-8 text-center bg-wood-50/40',
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-wood-100 text-wood-700 mb-3">
        {icon || <PackageOpen className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold text-charcoal-900">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
