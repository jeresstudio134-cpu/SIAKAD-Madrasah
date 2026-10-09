import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full animate-pulse space-y-3">
      <div className="h-10 bg-slate-100 rounded-lg w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 border-b border-slate-100">
          {Array.from({ length: cols }).map((_, j) => (
            <div
              key={j}
              className={`h-4 bg-slate-100 rounded ${
                j === 0 ? 'w-12' : j === 1 ? 'w-48' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs animate-pulse space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-100 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-6 bg-slate-100 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}
