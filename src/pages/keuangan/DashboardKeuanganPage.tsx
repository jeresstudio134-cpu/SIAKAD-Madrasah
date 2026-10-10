import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { DashboardKeuanganStats, TahunAjaran } from '../../types';
import { KwitansiModal } from '../../components/keuangan/KwitansiModal';
import {
  Wallet,
  CalendarCheck,
  AlertCircle,
  TrendingUp,
  FileText,
  CreditCard,
  Layers,
  ArrowRight,
  Printer,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';

export function DashboardKeuanganPage() {
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

  // Queries
  const { data: taList = [] } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });

  const activeTa = taList.find((t) => t.is_active) || taList[0];

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-keuangan', activeTa?.id],
    queryFn: async () => {
      const res = await api.get<DashboardKeuanganStats>(
        `/api/keuangan/dashboard?tahun_ajaran_id=${activeTa?.id || ''}`
      );
      return res.data;
    },
    enabled: Boolean(activeTa),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Dashboard Keuangan Madrasah
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pantau arus kas, realisasi penerimaan SPP & infaq, dan rekapitulasi tunggakan tahun ajaran {activeTa?.tahun || '-'} ({activeTa?.semester || '-'}).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/keuangan/pembayaran"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Catat Pembayaran
          </Link>
          <Link
            to="/keuangan/tagihan"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            Generate Tagihan
          </Link>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Pemasukan Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pemasukan Bulan Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              Rp {(stats?.pemasukanBulanIni || 0).toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Realisasi kas masuk bulan berjalan
            </p>
          </div>
        </div>

        {/* 2. Pemasukan Hari Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Pemasukan Hari Ini
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
              Rp {(stats?.pemasukanHariIni || 0).toLocaleString('id-ID')}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              Total transaksi kasir hari ini
            </p>
          </div>
        </div>

        {/* 3. Total Tunggakan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Tunggakan
            </span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-extrabold text-rose-600 font-mono tracking-tight">
              Rp {(stats?.totalTunggakan || 0).toLocaleString('id-ID')}
            </h3>
            <Link
              to="/keuangan/tunggakan"
              className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold mt-1 inline-flex items-center gap-1"
            >
              Lihat rincian tunggakan &rarr;
            </Link>
          </div>
        </div>

        {/* 4. Persentase Pelunasan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Tingkat Pelunasan
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <h3 className="text-2xl font-extrabold text-slate-900 font-mono tracking-tight">
                {stats?.persentasePelunasan || 0}%
              </h3>
              <span className="text-[11px] text-slate-500">
                dari Rp {(stats?.totalTagihanTahunIni || 0).toLocaleString('id-ID')}
              </span>
            </div>
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats?.persentasePelunasan || 0)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid 2 Kolom: Realisasi per Jenis Pembayaran & Transaksi Terbaru */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Breakdown per Jenis Pembayaran */}
        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Realisasi Pos Pembayaran
            </h3>
            <Link
              to="/keuangan/jenis"
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
            >
              Kelola Pos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {stats?.breakdownJenis?.map((item) => {
              const pct =
                item.totalTagihan > 0
                  ? Math.round((item.totalMasuk / item.totalTagihan) * 100)
                  : 0;

              return (
                <div
                  key={item.jenis_id}
                  className="p-3 bg-slate-50/70 border border-slate-200/60 rounded-xl space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.nama}</p>
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        Tipe: {item.tipe ? (item.tipe === 'bulanan' ? 'Bulanan' : 'Bebas / Sekali Bayar') : 'Pos Biaya'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {pct}%
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600 pt-0.5">
                    <span>Masuk: Rp {item.totalMasuk.toLocaleString('id-ID')}</span>
                    <span className="text-rose-600 font-medium">
                      Sisa: Rp {item.totalTunggakan.toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom Kanan: Transaksi Terbaru */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Riwayat Transaksi Terbaru
              </h3>
              <p className="text-[11px] text-slate-500">
                Pembayaran kasir terakhir yang tercatat dalam sistem
              </p>
            </div>
            <Link
              to="/keuangan/laporan"
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
            >
              Lihat Semua Laporan <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/60">
                  <th className="py-2.5 px-3">No. Kwitansi</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Siswa</th>
                  <th className="py-2.5 px-3">Pembayaran</th>
                  <th className="py-2.5 px-3">Nominal</th>
                  <th className="py-2.5 px-3 text-center">Metode</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentTransactions?.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {tx.nomor_transaksi}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {tx.tanggal_bayar}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-900">
                      {tx.siswa?.nama || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {tx.tagihan?.jenisPembayaran?.nama || 'Tagihan'}{' '}
                      {tx.tagihan?.bulan && `(${tx.tagihan.bulan})`}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                      Rp {Number(tx.jumlah_bayar).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.metode === 'Tunai'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {tx.metode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedTxId(tx.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
                        title="Cetak Kwitansi"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Kwitansi
                      </button>
                    </td>
                  </tr>
                ))}
                {(!stats?.recentTransactions || stats.recentTransactions.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Belum ada transaksi pembayaran yang tercatat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Kwitansi Modal */}
      <KwitansiModal
        isOpen={selectedTxId !== null}
        onClose={() => setSelectedTxId(null)}
        transaksiId={selectedTxId}
      />
    </div>
  );
}
