import React, { useEffect } from 'react';
import { Printer, FileText, Check, HelpCircle } from 'lucide-react';
import { PaperSize, PaperOrientation, applyPrintPageStyle, triggerPrint } from '../../lib/print-utils';

interface PrintPaperBarProps {
  paper: PaperSize;
  onPaperChange: (paper: PaperSize) => void;
  orientation?: PaperOrientation;
  onOrientationChange?: (orientation: PaperOrientation) => void;
  compact?: boolean;
  onCompactChange?: (compact: boolean) => void;
  allowedPapers?: PaperSize[];
  disabled?: boolean;
  printLabel?: string;
  onPrint?: () => void;
  extraControls?: React.ReactNode;
}

export function PrintPaperBar({
  paper,
  onPaperChange,
  orientation = 'portrait',
  onOrientationChange,
  compact = false,
  onCompactChange,
  allowedPapers = ['a4', 'f4'],
  disabled = false,
  printLabel = 'Cetak / Simpan PDF',
  onPrint,
  extraControls,
}: PrintPaperBarProps) {
  // Selalu sinkronkan dynamic style saat paper/orientation/compact berubah
  useEffect(() => {
    applyPrintPageStyle({
      paper,
      orientation,
      compact,
      margin: orientation === 'landscape' ? '8mm 10mm 8mm 10mm' : '8mm 10mm 8mm 10mm',
    });
  }, [paper, orientation, compact]);

  const handlePrintClick = () => {
    applyPrintPageStyle({
      paper,
      orientation,
      compact,
    });
    if (onPrint) {
      onPrint();
    } else {
      triggerPrint({ paper, orientation, compact });
    }
  };

  return (
    <div className="bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 print:hidden transition-all">
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Pilihan Ukuran Kertas */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-emerald-400" />
            Ukuran Kertas:
          </span>
          <div className="inline-flex bg-slate-800/90 p-0.5 rounded-xl border border-slate-700">
            {allowedPapers.includes('a4') && (
              <button
                type="button"
                onClick={() => onPaperChange('a4')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  paper === 'a4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="A4: 210 x 297 mm (Standar Dokumen)"
              >
                {paper === 'a4' && <Check className="w-3 h-3" />}
                A4
              </button>
            )}

            {allowedPapers.includes('f4') && (
              <button
                type="button"
                onClick={() => onPaperChange('f4')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  paper === 'f4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="F4 / Folio: 215 x 330 mm (Standar Rapor & Ijazah Madrasah)"
              >
                {paper === 'f4' && <Check className="w-3 h-3" />}
                F4 / Folio
              </button>
            )}

            {allowedPapers.includes('a5') && (
              <button
                type="button"
                onClick={() => onPaperChange('a5')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  paper === 'a5'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
                title="A5: 148 x 210 mm (Setengah HVS)"
              >
                {paper === 'a5' && <Check className="w-3 h-3" />}
                A5
              </button>
            )}
          </div>
        </div>

        {/* Pilihan Orientasi (Jika diaktifkan) */}
        {onOrientationChange && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Orientasi:
            </span>
            <div className="inline-flex bg-slate-800/90 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => onOrientationChange('portrait')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  orientation === 'portrait'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Tegak
              </button>
              <button
                type="button"
                onClick={() => onOrientationChange('landscape')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  orientation === 'landscape'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Mendatar
              </button>
            </div>
          </div>
        )}

        {/* Pilihan Kerapatan / Skala (Pas 1 Lembar) */}
        {onCompactChange && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Format:
            </span>
            <div className="inline-flex bg-slate-800/90 p-0.5 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => onCompactChange(false)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  !compact
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Standar
              </button>
              <button
                type="button"
                onClick={() => onCompactChange(true)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  compact
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="Optimalkan margin dan spasi agar muat rapi dalam 1 lembar kertas"
              >
                Pas 1 Lembar
              </button>
            </div>
          </div>
        )}

        {/* Kontrol Tambahan khusus (misal 2 Rangkap untuk Kwitansi) */}
        {extraControls}
      </div>

      {/* Tombol Eksekusi Cetak */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePrintClick}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-98 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{printLabel}</span>
        </button>
      </div>
    </div>
  );
}
