import React from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

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
  const { t } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize && currentPage === 1) return null;

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const showingText = t('common.showingItems', 'Showing {start} to {end} of {total} items')
    .replace('{start}', String(startItem))
    .replace('{end}', String(endItem))
    .replace('{total}', String(totalItems));

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-wood-100/80 text-xs text-stone-600 ${className}`}
    >
      <div className="font-medium text-stone-500">
        {showingText}
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0 border-wood-200 hover:bg-wood-50"
          title={t('common.firstPage', 'First Page')}
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
          <span className="hidden sm:inline">{t('common.prev', 'Prev')}</span>
        </Button>

        <span className="px-2 font-medium font-mono text-stone-800 text-[11px] sm:text-xs">
          {t('common.page', 'Page')} {currentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-8 px-2 space-x-1 border-wood-200 hover:bg-wood-50 text-xs"
        >
          <span className="hidden sm:inline">{t('common.next', 'Next')}</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="h-8 w-8 p-0 border-wood-200 hover:bg-wood-50"
          title={t('common.lastPage', 'Last Page')}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
