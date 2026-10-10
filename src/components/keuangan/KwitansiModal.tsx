import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { KwitansiData } from '../../types';
import { Modal } from '../ui/Modal';
import { Printer, School, CheckCircle, AlertTriangle } from 'lucide-react';

interface KwitansiModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksiId: number | null;
}

export function KwitansiModal({ isOpen, onClose, transaksiId }: KwitansiModalProps) {
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
    window.print();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Kwitansi Pembayaran Resmi"
      size="2xl"
    >
      <div className="space-y-6">
        {/* Print Button Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
          <div className="text-xs text-slate-500">
            Nomor Transaksi:{' '}
            <span className="font-mono font-bold text-slate-800">
              {kwitansi?.transaksi?.nomor_transaksi || '-'}
            </span>
          </div>
          <button
            onClick={handlePrint}
            disabled={!kwitansi}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Memuat data kwitansi...
          </div>
        ) : !kwitansi ? (
          <div className="py-12 text-center text-rose-500 text-xs font-medium">
            Data kwitansi tidak ditemukan.
          </div>
        ) : (
          <div className="print-area print-a5 bg-white p-6 sm:p-8 rounded-xl border border-slate-200/90 shadow-xs print:border-none print:shadow-none print:p-0 text-slate-900 font-sans">
            {/* Status Dibatalkan Watermark */}
            {kwitansi.transaksi.status === 'dibatalkan' && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                TRANSAKSI INI TELAH DIBATALKAN (VOID). Alasan: {kwitansi.transaksi.alasan_batal || '-'}
              </div>
            )}

            {/* 1. KOP SURAT MADRASAH */}
            <div className="border-b-2 border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 flex items-center justify-center border border-emerald-800 rounded-full bg-emerald-50 shrink-0">
                  {kwitansi.madrasah.logo_url ? (
                    <img
                      src={kwitansi.madrasah.logo_url}
                      alt="Logo"
                      className="w-12 h-12 object-contain"
                    />
                  ) : (
                    <School className="w-8 h-8 text-emerald-800" />
                  )}
                </div>
                <div className="flex-1 text-center">
                  <p className="text-[10px] font-bold tracking-widest text-slate-700 uppercase">
                    KEMENTERIAN AGAMA REPUBLIK INDONESIA
                  </p>
                  <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                    {kwitansi.madrasah.nama}
                  </h2>
                  <p className="text-[10px] text-slate-600">
                    NSM: {kwitansi.madrasah.nsm || '-'} • NPSN: {kwitansi.madrasah.npsn || '-'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {kwitansi.madrasah.alamat || 'Alamat Madrasah'} • Telp: {kwitansi.madrasah.telepon || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Judul Kwitansi */}
            <div className="text-center mb-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 underline decoration-1">
                BUKTI KWITANSI PEMBAYARAN RESMI
              </h3>
              <p className="font-mono text-xs font-bold text-emerald-800 mt-0.5">
                NO: {kwitansi.transaksi.nomor_transaksi}
              </p>
            </div>

            {/* 2. RINCIAN DATA PEMBAYARAN */}
            <div className="space-y-2 text-xs border-y border-dashed border-slate-300 py-3 mb-4">
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
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Uang Sejumlah (Terbilang):
                  </span>
                  <span className="text-xs font-serif italic text-slate-800">
                    "{kwitansi.terbilang}"
                  </span>
                </div>
                <div className="bg-emerald-800 text-white px-4 py-2 rounded-lg text-center shrink-0">
                  <span className="text-[10px] block opacity-80 uppercase font-semibold">Nominal Bayar</span>
                  <span className="text-base font-extrabold font-mono">
                    Rp {Number(kwitansi.transaksi.jumlah_bayar).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. TANDA TANGAN PENERIMA */}
            <div className="grid grid-cols-2 gap-4 text-center text-xs mt-6 pt-2">
              <div>
                <p className="text-slate-500">Penyetor / Siswa</p>
                <div className="h-16" />
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
                <div className="h-16 flex items-center justify-center">
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle className="w-3 h-3" /> LUNAS / TERVERIFIKASI
                  </span>
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-300 inline-block px-4">
                  {kwitansi.kasirNama}
                </p>
              </div>
            </div>

            {/* Footer Nota */}
            <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
              * Kwitansi ini merupakan bukti pembayaran sah yang dikeluarkan oleh Sistem Informasi Akademik & Keuangan Madrasah.
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
