import React from 'react';
import { FolderSearch, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'Belum Ada Data',
  description = 'Data untuk kategori ini belum tersedia atau tidak ditemukan.',
  icon,
  actionText,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const btnLabel = actionLabel || actionText;
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
        {icon || <FolderSearch className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {btnLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-xs hover:shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {btnLabel}
        </button>
      )}
    </div>
  );
}
