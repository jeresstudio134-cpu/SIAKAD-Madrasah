import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage = 10,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  if (totalPages <= 1 && (!totalItems || totalItems === 0)) return null;

  const hasItemsCount = typeof totalItems === 'number' && totalItems > 0;
  const start = (currentPage - 1) * itemsPerPage + 1;
  const end = hasItemsCount ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-slate-600 border-t border-slate-100">
      <div className="flex items-center gap-3">
        <span>
          Menampilkan <strong className="text-slate-800">{start}</strong> -{' '}
          <strong className="text-slate-800">{end}</strong> dari{' '}
          <strong className="text-slate-800">{totalItems}</strong> data
        </span>
        {onLimitChange && (
          <select
            value={itemsPerPage}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-emerald-500"
          >
            <option value={10}>10 per hal</option>
            <option value={20}>20 per hal</option>
            <option value={50}>50 per hal</option>
          </select>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Halaman Sebelumnya"
        >
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>

        <span className="px-3 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 rounded-lg">
          Hal {currentPage} dari {Math.max(1, totalPages)}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
          title="Halaman Berikutnya"
        >
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>
  );
}
