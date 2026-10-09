import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  const success = useCallback(
    (msg: string, title?: string) => showToast(msg, 'success', title || 'Berhasil'),
    [showToast]
  );
  const error = useCallback(
    (msg: string, title?: string) => showToast(msg, 'error', title || 'Gagal'),
    [showToast]
  );
  const info = useCallback(
    (msg: string, title?: string) => showToast(msg, 'info', title || 'Informasi'),
    [showToast]
  );
  const warning = useCallback(
    (msg: string, title?: string) => showToast(msg, 'warning', title || 'Peringatan'),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast container floating at top-right */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => {
          const bgColors = {
            success: 'bg-emerald-800 text-white border-emerald-600',
            error: 'bg-rose-800 text-white border-rose-600',
            warning: 'bg-amber-800 text-white border-amber-600',
            info: 'bg-slate-800 text-white border-slate-600',
          };

          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />,
            info: <Info className="w-5 h-5 text-sky-300 shrink-0" />,
          };

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-top-2 duration-200 ${
                bgColors[t.type]
              }`}
            >
              {icons[t.type]}
              <div className="flex-1 text-sm">
                {t.title && <div className="font-semibold text-white">{t.title}</div>}
                <div className="text-slate-100 text-xs leading-relaxed mt-0.5">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
