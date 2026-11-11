import React from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize && currentPage === 1) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-wood-100/80 text-xs text-stone-600 ${className}`}
    >
      <div className="font-medium text-stone-500">
        Showing <span className="font-semibold text-stone-900">{startItem}</span> to{' '}
        <span className="font-semibold text-stone-900">{endItem}</span> of{' '}
        <span className="font-semibold text-stone-900">{totalItems}</span> items
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0 border-wood-200 hover:bg-wood-50"
          title="First Page"
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 px-2 space-x-1 border-wood-200 hover:bg-wood-50 text-xs"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <span className="px-2 font-medium font-mono text-stone-800 text-[11px] sm:text-xs">
          Page {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 px-2 space-x-1 border-wood-200 hover:bg-wood-50 text-xs"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0 border-wood-200 hover:bg-wood-50"
          title="Last Page"
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
