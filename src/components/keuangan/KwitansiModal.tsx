import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { KwitansiData } from '../../types';
import { Modal } from '../ui/Modal';
import { PrintPaperBar } from '../ui/PrintPaperBar';
import { PaperSize, triggerPrint } from '../../lib/print-utils';
import { Printer, School, CheckCircle, AlertTriangle, Copy } from 'lucide-react';

interface KwitansiModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksiId: number | null;
}

function KwitansiItemView({
  kwitansi,
  copyLabel,
  compact = false,
}: {
  kwitansi: KwitansiData;
  copyLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-300 print:border-none print:p-0 text-slate-900 font-sans">
      {/* Status Dibatalkan Watermark */}
      {kwitansi.transaksi.status === 'dibatalkan' && (
        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          TRANSAKSI INI TELAH DIBATALKAN (VOID). Alasan: {kwitansi.transaksi.alasan_batal || '-'}
        </div>
      )}

      {/* Copy Label Badge (Jika Mode Rangkap) */}
      {copyLabel && (
        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-500 mb-2 border-b border-slate-200 pb-1">
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
            {copyLabel}
          </span>
          <span className="font-mono text-emerald-800">
            NO: {kwitansi.transaksi.nomor_transaksi}
          </span>
        </div>
      )}

      {/* 1. KOP SURAT MADRASAH */}
      <div className="kop-surat border-b-2 border-slate-800 pb-2.5 mb-3">
        <div className="flex items-center gap-3">
          <div className="kop-logo w-12 h-12 flex items-center justify-center border border-emerald-800 rounded-full bg-emerald-50 shrink-0">
            {kwitansi.madrasah.logo_url ? (
              <img
                src={kwitansi.madrasah.logo_url}
                alt="Logo"
                className="w-9 h-9 object-contain"
              />
            ) : (
              <School className="w-6 h-6 text-emerald-800" />
            )}
          </div>
          <div className="flex-1 text-center">
            <p className="text-[9px] font-bold tracking-widest text-slate-700 uppercase">
              KEMENTERIAN AGAMA REPUBLIK INDONESIA
            </p>
            <h2 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
              {kwitansi.madrasah.nama}
            </h2>
            <p className="text-[9px] text-slate-600">
              NSM: {kwitansi.madrasah.nsm || '-'} • NPSN: {kwitansi.madrasah.npsn || '-'}
            </p>
            <p className="text-[8.5px] text-slate-500">
              {kwitansi.madrasah.alamat || 'Alamat Madrasah'} • Telp: {kwitansi.madrasah.telepon || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Judul Kwitansi */}
      <div className="text-center mb-3">
        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-900 underline decoration-1">
          BUKTI KWITANSI PEMBAYARAN RESMI
        </h3>
        {!copyLabel && (
          <p className="font-mono text-[11px] font-bold text-emerald-800 mt-0.5">
            NO: {kwitansi.transaksi.nomor_transaksi}
          </p>
        )}
      </div>

      {/* 2. RINCIAN DATA PEMBAYARAN */}
      <div className="space-y-1.5 text-xs border-y border-dashed border-slate-300 py-2.5 mb-3">
        <div className="grid grid-cols-3 gap-2">
          <span className="text-slate-600">Telah Diterima Dari</span>
          <span className="col-span-2 font-bold text-slate-900">
            : {kwitansi.siswa.nama} ({kwitansi.siswa.nis})
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="text-slate-600">Kelas / Rombel</span>
          <span className="col-span-2 text-slate-900">
            : Kelas {kwitansi.siswa.kelas?.nama || '-'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="text-slate-600">Untuk Pembayaran</span>
          <span className="col-span-2 font-semibold text-slate-900">
            : {kwitansi.tagihan.jenisPembayaran?.nama || 'Tagihan Madrasah'}{' '}
            {kwitansi.tagihan.bulan ? `(Bulan ${kwitansi.tagihan.bulan})` : ''}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="text-slate-600">Metode Pembayaran</span>
          <span className="col-span-2 text-slate-900">
            : {kwitansi.transaksi.metode} {kwitansi.transaksi.catatan ? `(${kwitansi.transaksi.catatan})` : ''}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <span className="text-slate-600">Status Tagihan Ini</span>
          <span className="col-span-2 text-slate-900">
            : <span className={`font-bold ${kwitansi.tagihan.status === 'lunas' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {kwitansi.tagihan.status === 'lunas' ? 'LUNAS' : `DICICIL (Sisa Rp ${kwitansi.tagihan.sisa.toLocaleString('id-ID')})`}
              </span>
          </span>
        </div>
      </div>

      {/* 3. TERBILANG & JUMLAH NOMINAL */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
              Uang Sejumlah (Terbilang):
            </span>
            <span className="text-[11px] font-serif italic text-slate-800">
              "{kwitansi.terbilang}"
            </span>
          </div>
          <div className="bg-emerald-800 text-white px-3.5 py-1.5 rounded-lg text-center shrink-0">
            <span className="text-[9px] block opacity-85 uppercase font-semibold">Nominal Bayar</span>
            <span className="text-sm sm:text-base font-extrabold font-mono">
              Rp {Number(kwitansi.transaksi.jumlah_bayar).toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* 4. TANDA TANGAN PENERIMA */}
      <div className="signature-block print-avoid-break grid grid-cols-2 gap-4 text-center text-xs mt-3 pt-1">
        <div>
          <p className="text-slate-500">Penyetor / Siswa</p>
          <div className="h-10 sm:h-12 signature-space" />
          <p className="font-semibold text-slate-900 border-t border-slate-300 inline-block px-4">
            ( {kwitansi.siswa.nama} )
          </p>
        </div>

        <div>
          <p className="text-slate-500">
            {kwitansi.madrasah.alamat?.split(',')[0] || 'Madrasah'},{' '}
            {new Date(kwitansi.transaksi.tanggal_bayar).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <p className="font-semibold text-slate-800">Petugas Kasir / Bendahara</p>
          <div className="h-10 sm:h-12 flex items-center justify-center signature-space">
            <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              <CheckCircle className="w-3 h-3" /> LUNAS
            </span>
          </div>
          <p className="font-bold text-slate-900 border-t border-slate-300 inline-block px-4">
            {kwitansi.kasirNama}
          </p>
        </div>
      </div>

      {/* Footer Nota */}
      <div className="mt-3 pt-1.5 border-t border-slate-200 text-center text-[8.5px] text-slate-400">
        * Bukti kwitansi sah yang dikeluarkan oleh Sistem Informasi Akademik & Keuangan Madrasah.
      </div>
    </div>
  );
}

export function KwitansiModal({ isOpen, onClose, transaksiId }: KwitansiModalProps) {
  const [paper, setPaper] = useState<PaperSize>('a4');
  const [modeRangkap, setModeRangkap] = useState<boolean>(true); // Default 2 rangkap untuk A4/F4 (hemat kertas)

  const { data: kwitansi, isLoading } = useQuery({
    queryKey: ['kwitansi', transaksiId],
    queryFn: async () => {
      if (!transaksiId) return null;
      const res = await api.get<KwitansiData>(`/api/keuangan/pembayaran/${transaksiId}/kwitansi`);
      return res.data || null;
    },
    enabled: Boolean(transaksiId && isOpen),
  });

  const handlePrint = () => {
    triggerPrint({ paper, orientation: 'portrait', compact: true });
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kwitansi Pembayaran Resmi"
      size="4xl"
    >
      <div className="space-y-4">
        {/* Print Bar Pengaturan Kertas (A4 / F4 / A5) & Model Rangkap */}
        <PrintPaperBar
          paper={paper}
          onPaperChange={setPaper}
          allowedPapers={['a4', 'f4', 'a5']}
          disabled={!kwitansi}
          printLabel="Cetak Kwitansi (PDF)"
          onPrint={handlePrint}
          extraControls={
            paper !== 'a5' ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Model:
                </span>
                <div className="inline-flex bg-slate-800/90 p-0.5 rounded-xl border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setModeRangkap(false)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      !modeRangkap
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    1 Rangkap
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeRangkap(true)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      modeRangkap
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="Cetak 2 salinan (Siswa & Arsip TU) dalam 1 lembar kertas A4/F4"
                  >
                    <Copy className="w-3 h-3" />
                    2 Rangkap
                  </button>
                </div>
              </div>
            ) : null
          }
        />

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Memuat data kwitansi...
          </div>
        ) : !kwitansi ? (
          <div className="py-12 text-center text-rose-500 text-xs font-medium">
            Data kwitansi tidak ditemukan.
          </div>
        ) : (
          <div
            className={`print-area ${
              paper === 'f4'
                ? 'print-f4 sheet-preview-f4'
                : paper === 'a5'
                ? 'print-a5 sheet-preview-a5'
                : 'print-a4 sheet-preview-a4'
            } bg-white p-3 sm:p-5 rounded-2xl border border-slate-200/90 shadow-md print:border-none print:shadow-none print:p-0 text-slate-900 font-sans`}
          >
            {/* Jika Mode 2 Rangkap pada A4/F4 */}
            {modeRangkap && paper !== 'a5' ? (
              <div className="space-y-4">
                {/* Salinan 1: Untuk Siswa / Wali */}
                <KwitansiItemView
                  kwitansi={kwitansi}
                  copyLabel="LEMBAR 1: UNTUK SISWA / WALI SANTRI"
                  compact
                />

                {/* Garis Potong / Sobek Tengah */}
                <div className="print-cut-line py-1 print:my-2" />

                {/* Salinan 2: Arsip Keuangan Madrasah */}
                <KwitansiItemView
                  kwitansi={kwitansi}
                  copyLabel="LEMBAR 2: ARSIP KEUANGAN & BENDAHARA MADRASAH"
                  compact
                />
              </div>
            ) : (
              /* Mode 1 Lembar Tunggal */
              <KwitansiItemView kwitansi={kwitansi} />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
