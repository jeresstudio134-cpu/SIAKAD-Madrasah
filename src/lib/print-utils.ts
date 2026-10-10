/**
 * Sistem Pengaturan Kertas Cetak SIAKAD Madrasah
 * Standar Kertas:
 * - A4: 210 x 297 mm
 * - F4 / Folio: 215 x 330 mm (Standar Arsip dan Rapor Madrasah Indonesia)
 * - A5: 148 x 210 mm (Standar Kwitansi / Nota Kasir)
 */

export type PaperSize = 'a4' | 'f4' | 'a5';
export type PaperOrientation = 'portrait' | 'landscape';

export interface PrintConfig {
  paper?: PaperSize;
  orientation?: PaperOrientation;
  compact?: boolean;
  margin?: string;
}

const PAPER_DIMENSIONS: Record<
  PaperSize,
  Record<PaperOrientation, { width: string; height: string }>
> = {
  a4: {
    portrait: { width: '210mm', height: '297mm' },
    landscape: { width: '297mm', height: '210mm' },
  },
  f4: {
    portrait: { width: '215mm', height: '330mm' },
    landscape: { width: '330mm', height: '215mm' },
  },
  a5: {
    portrait: { width: '148mm', height: '210mm' },
    landscape: { width: '210mm', height: '148mm' },
  },
};

export function applyPrintPageStyle({
  paper = 'a4',
  orientation = 'portrait',
  compact = false,
  margin = '8mm 10mm 8mm 10mm',
}: PrintConfig) {
  if (typeof document === 'undefined') return;

  const dims = PAPER_DIMENSIONS[paper][orientation];
  const styleId = 'siakad-dynamic-print-paper';

  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  // Aturan @page eksplisit yang memaksa browser print preview menggunakan ukuran mm presisi
  styleEl.innerHTML = `
    @media print {
      @page {
        size: ${dims.width} ${dims.height};
        margin: ${margin};
      }
    }
  `;

  // Sinkronisasi data attribute pada html tag
  document.documentElement.setAttribute('data-print-paper', paper);
  document.documentElement.setAttribute('data-print-orientation', orientation);
  document.documentElement.setAttribute('data-print-compact', compact ? 'true' : 'false');
}

export function triggerPrint(config?: PrintConfig) {
  if (typeof window === 'undefined') return;
  if (config) {
    applyPrintPageStyle(config);
  }
  // Beri waktu 50ms bagi browser me-render style sebelum dialog cetak terbuka
  setTimeout(() => {
    window.print();
  }, 50);
}
