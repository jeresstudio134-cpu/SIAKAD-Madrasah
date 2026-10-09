import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { api } from '../../lib/api';
import { TransaksiPembayaran, JenisPembayaran, Kelas, TahunAjaran } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { KwitansiModal } from '../../components/keuangan/KwitansiModal';
import {
  FileSpreadsheet,
  Filter,
  Search,
  Calendar,
  Wallet,
  Printer,
  CheckCircle2,
  Ban,
  Download,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

export function LaporanKeuanganPage() {
  // Date range defaults: first day of this month to today
  const today = new Date().toISOString().slice(0, 10);
  const firstDayOfMonth = today.slice(0, 7) + '-01';

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedStatus, setSelectedStatus] = useState<string>('valid');
  const [selectedMetode, setSelectedMetode] = useState<string>('semua');
  const [selectedJenisId, setSelectedJenisId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
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

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-simple'],
    queryFn: async () => {
      const res = await api.get<Kelas[]>('/api/kelas/simple');
      return res.data || [];
    },
  });

  const { data: jenisList = [] } = useQuery({
    queryKey: ['jenis-pembayaran'],
    queryFn: async () => {
      const res = await api.get<JenisPembayaran[]>('/api/keuangan/jenis');
      return res.data || [];
    },
  });

  // Query Laporan Transaksi
  const { data: laporanResponse, isLoading } = useQuery({
    queryKey: [
      'laporan-keuangan',
      startDate,
      endDate,
      selectedStatus,
      selectedMetode,
      selectedJenisId,
      selectedKelasId,
      search,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedStatus && selectedStatus !== 'semua') params.append('status', selectedStatus);
      if (selectedMetode && selectedMetode !== 'semua') params.append('metode', selectedMetode);
      if (selectedJenisId) params.append('jenis_id', selectedJenisId);
      if (selectedKelasId) params.append('kelas_id', selectedKelasId);
      if (search) params.append('search', search);
      params.append('limit', '500'); // Muat hingga 500 baris untuk laporan

      const res = await api.get<any>(`/api/keuangan/pembayaran?${params.toString()}`);
      return res;
    },
  });

  const transaksiList: TransaksiPembayaran[] = laporanResponse?.data || [];
  const summary = laporanResponse?.summary || { totalNominalValid: 0, totalNominalBatal: 0 };

  // Export Excel menggunakan SheetJS (xlsx)
  const handleExportExcel = () => {
    if (transaksiList.length === 0) return;

    const exportData = transaksiList.map((tx, idx) => ({
      No: idx + 1,
      'No. Kwitansi': tx.nomor_transaksi,
      Tanggal: tx.tanggal_bayar,
      'Nama Siswa': tx.siswa?.nama || '-',
      NIS: tx.siswa?.nis || '-',
      Kelas: tx.tagihan?.kelas_id ? `Kelas ${tx.siswa?.kelas_id}` : '-',
      'Pos Pembayaran': tx.tagihan?.jenisPembayaran?.nama || 'Tagihan',
      Bulan: tx.tagihan?.bulan || '-',
      'Nominal (Rp)': Number(tx.jumlah_bayar),
      Metode: tx.metode,
      Petugas: tx.createdByUser?.nama_lengkap || 'Kasir',
      Status: tx.status === 'valid' ? 'Sah / Valid' : `Dibatalkan (${tx.alasan_batal || ''})`,
      Catatan: tx.catatan || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Pembayaran');

    const fileName = `Laporan_Keuangan_Madrasah_${startDate}_sd_${endDate}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Laporan Keuangan & Kasir
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Rekapitulasi transaksi pembayaran harian & bulanan madrasah serta ekspor dokumen Excel (.xlsx).
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          disabled={transaksiList.length === 0}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Ekspor ke Excel (.xlsx)
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Total Kas Diterima (Valid)
          </span>
          <h3 className="text-2xl font-extrabold font-mono text-emerald-700 mt-1">
            Rp {Number(summary.totalNominalValid).toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Dari {transaksiList.filter((t) => t.status === 'valid').length} transaksi berhasil
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Total Transaksi Dibatalkan (Void)
          </span>
          <h3 className="text-2xl font-extrabold font-mono text-rose-600 mt-1">
            Rp {Number(summary.totalNominalBatal).toLocaleString('id-ID')}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {transaksiList.filter((t) => t.status === 'dibatalkan').length} transaksi di-void
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">
            Periode Laporan
          </span>
          <h3 className="text-sm font-bold text-slate-800 mt-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" />
            {startDate} s.d. {endDate}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Tahun Ajaran {activeTa?.tahun}
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Dari Tanggal */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          {/* Status Transaksi */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status Transaksi
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="semua">Semua Transaksi</option>
              <option value="valid">Sah / Valid Saja</option>
              <option value="dibatalkan">Dibatalkan (Void) Saja</option>
            </select>
          </div>

          {/* Metode Bayar */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Metode Pembayaran
            </label>
            <select
              value={selectedMetode}
              onChange={(e) => setSelectedMetode(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="semua">Semua Metode</option>
              <option value="Tunai">Tunai / Cash</option>
              <option value="Transfer">Transfer Bank</option>
            </select>
          </div>

          {/* Pos Pembayaran */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Pos Pembayaran
            </label>
            <select
              value={selectedJenisId}
              onChange={(e) => setSelectedJenisId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">Semua Pos</option>
              {jenisList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Cari Kata Kunci */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cari Siswa / Kwitansi
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nama / NIS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabel Data Laporan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={8} />
          </div>
        ) : transaksiList.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Transaksi"
            description="Tidak ditemukan riwayat pembayaran pada rentang tanggal dan kriteria filter ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-3 px-3">No. Kwitansi</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Nama Siswa</th>
                  <th className="py-3 px-3">Pos Pembayaran</th>
                  <th className="py-3 px-3">Bulan</th>
                  <th className="py-3 px-3 font-mono">Jumlah Bayar</th>
                  <th className="py-3 px-3 text-center">Metode</th>
                  <th className="py-3 px-3">Kasir / Penerima</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transaksiList.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                      {tx.nomor_transaksi}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                      {tx.tanggal_bayar}
                    </td>

                    <td className="py-2.5 px-3">
                      <div>
                        <p className="font-bold text-slate-900">{tx.siswa?.nama}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          NIS: {tx.siswa?.nis}
                        </span>
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {tx.tagihan?.jenisPembayaran?.nama || 'Pos Pembayaran'}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {tx.tagihan?.bulan || '-'}
                    </td>

                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                      Rp {Number(tx.jumlah_bayar).toLocaleString('id-ID')}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {tx.metode}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">
                      {tx.createdByUser?.nama_lengkap || 'Kasir'}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      {tx.status === 'valid' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Sah
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full cursor-help"
                          title={`Dibatalkan: ${tx.alasan_batal || '-'}`}
                        >
                          <Ban className="w-3 h-3" /> Batal
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedTxId(tx.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                        title="Cetak Kwitansi Resmi"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Kwitansi
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
