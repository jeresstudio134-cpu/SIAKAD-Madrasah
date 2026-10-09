import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import {
  TahunAjaran,
  Kelas,
  TunggakanSiswaSummary,
  TunggakanKelasSummary,
} from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  AlertCircle,
  Building2,
  Users,
  Search,
  Printer,
  CreditCard,
  Layers,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

export function TunggakanPage() {
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'per-siswa' | 'per-kelas'>('per-siswa');

  // Filters
  const [selectedTaId, setSelectedTaId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  // Queries
  const { data: taList = [] } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });

  const activeTa = taList.find((t) => t.is_active) || taList[0];
  const currentTaId = selectedTaId || String(activeTa?.id || '1');

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-simple'],
    queryFn: async () => {
      const res = await api.get<Kelas[]>('/api/kelas/simple');
      return res.data || [];
    },
  });

  // Query Tunggakan Siswa
  const { data: tunggakanSiswaList = [], isLoading: isLoadingSiswa } = useQuery({
    queryKey: ['tunggakan-siswa', currentTaId, selectedKelasId, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentTaId) params.append('tahun_ajaran_id', currentTaId);
      if (selectedKelasId) params.append('kelas_id', selectedKelasId);
      if (search) params.append('search', search);

      const res = await api.get<TunggakanSiswaSummary[]>(`/api/keuangan/tunggakan?${params.toString()}`);
      return res.data || [];
    },
    enabled: Boolean(currentTaId),
  });

  // Query Tunggakan Rekap Kelas
  const { data: tunggakanKelasList = [], isLoading: isLoadingKelas } = useQuery({
    queryKey: ['tunggakan-kelas', currentTaId],
    queryFn: async () => {
      const res = await api.get<TunggakanKelasSummary[]>(
        `/api/keuangan/tunggakan/rekap-kelas?tahun_ajaran_id=${currentTaId}`
      );
      return res.data || [];
    },
    enabled: Boolean(currentTaId),
  });

  const handlePrint = () => {
    window.print();
  };

  const totalAkumulasiTunggakan = tunggakanSiswaList.reduce(
    (sum, s) => sum + Number(s.totalTunggakan),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header - Hidden on Print */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Daftar & Rekapitulasi Tunggakan Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring tunggakan pembayaran per siswa dan per rombongan belajar tahun ajaran {activeTa?.tahun}.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          Cetak Rekap / Surat Tagihan
        </button>
      </div>

      {/* Tabs & Filter Bar - Hidden on Print */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('per-siswa')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'per-siswa'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rincian Siswa Menunggak ({tunggakanSiswaList.length})
            </button>
            <button
              onClick={() => setActiveTab('per-kelas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'per-kelas'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rekapitulasi per Rombel / Kelas
            </button>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Total Tunggakan Aktif
            </span>
            <span className="text-sm font-mono font-extrabold text-rose-600">
              Rp {totalAkumulasiTunggakan.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Filter Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tahun Ajaran
            </label>
            <select
              value={currentTaId}
              onChange={(e) => setSelectedTaId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              {taList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tahun} ({t.semester})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Filter Rombel / Kelas
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Cari Nama atau NIS
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Cari siswa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Printable Sheet View for Printing */}
      <div className="print:block hidden mb-6 text-center border-b pb-4">
        <h1 className="text-lg font-bold uppercase tracking-wider">
          DAFTAR TUNGGAKAN PEMBAYARAN SISWA
        </h1>
        <p className="text-xs text-slate-600">
          Tahun Ajaran {activeTa?.tahun} — Dicetak pada {new Date().toLocaleDateString('id-ID')}
        </p>
      </div>

      {/* TAB 1: RINCIAN PER SISWA */}
      {activeTab === 'per-siswa' && (
        <div className="space-y-4">
          {isLoadingSiswa ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
              <TableSkeleton rows={5} cols={6} />
            </div>
          ) : tunggakanSiswaList.length === 0 ? (
            <EmptyState
              title="Tidak Ada Siswa Menunggak"
              description="Seluruh siswa pada kriteria filter ini telah melunasi kewajiban pembayaran mereka."
            />
          ) : (
            <div className="space-y-3">
              {tunggakanSiswaList.map((item) => (
                <div
                  key={item.siswa.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.siswa.nama}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          Kelas {item.kelas?.nama || '-'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        NIS: {item.siswa.nis} • Orang Tua/Wali: {item.siswa.nama_ayah || item.siswa.nama_ibu || '-'} ({item.siswa.telepon_ortu || '-'})
                      </p>
                    </div>

                    <div className="flex items-center gap-4 sm:text-right">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                          Total Tunggakan:
                        </span>
                        <span className="text-base font-bold font-mono text-rose-600">
                          Rp {Number(item.totalTunggakan).toLocaleString('id-ID')}
                        </span>
                      </div>

                      <button
                        onClick={() =>
                          navigate(`/keuangan/pembayaran?siswaId=${item.siswa.id}`)
                        }
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer print:hidden shrink-0"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Bayar
                      </button>
                    </div>
                  </div>

                  {/* Rincian Pos Tagihan yang Menunggak */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-600 block">
                      Rincian Tagihan Belum Lunas ({item.jumlahItemTunggakan} Item):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {item.itemTunggakan.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 bg-rose-50/50 border border-rose-100 rounded-xl text-xs space-y-1"
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-semibold text-slate-800">
                              {sub.namaPembayaran} {sub.bulan ? `(${sub.bulan})` : ''}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded font-bold text-rose-700 bg-rose-100">
                              {sub.status === 'sebagian' ? 'Kurang' : 'Belum Bayar'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-rose-100/60 font-mono">
                            <span className="text-slate-500">Sisa:</span>
                            <span className="font-bold text-rose-700">
                              Rp {Number(sub.sisa).toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REKAPITULASI PER KELAS */}
      {activeTab === 'per-kelas' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isLoadingKelas ? (
            <div className="p-6">
              <TableSkeleton rows={4} cols={7} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                    <th className="py-3 px-4">Rombel / Kelas</th>
                    <th className="py-3 px-4">Wali Kelas</th>
                    <th className="py-3 px-4 text-center">Total Siswa</th>
                    <th className="py-3 px-4 font-mono">Total Tagihan</th>
                    <th className="py-3 px-4 font-mono">Telah Terbayar</th>
                    <th className="py-3 px-4 font-mono">Total Tunggakan</th>
                    <th className="py-3 px-4 text-center">Siswa Menunggak</th>
                    <th className="py-3 px-4 text-center">Persentase Lunas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tunggakanKelasList.map((k) => (
                    <tr key={k.kelas_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          Kelas {k.kelas_nama}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Tingkat {k.tingkat}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {k.wali_kelas_nama}
                      </td>

                      <td className="py-3 px-4 text-center text-slate-800 font-semibold">
                        {k.totalSiswa} Siswa
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        Rp {Number(k.totalTagihan).toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                        Rp {Number(k.totalTerbayar).toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-rose-600">
                        Rp {Number(k.totalTunggakan).toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            k.siswaMenunggakCount > 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {k.siswaMenunggakCount} Siswa
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${k.persentaseLunas}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-800">
                            {k.persentaseLunas}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
