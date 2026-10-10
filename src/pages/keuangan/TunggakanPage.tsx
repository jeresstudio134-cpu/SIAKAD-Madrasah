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
import { PrintPaperBar } from '../../components/ui/PrintPaperBar';
import { PaperSize, PaperOrientation, triggerPrint } from '../../lib/print-utils';
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
  const [paper, setPaper] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<PaperOrientation>('landscape');

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
    triggerPrint({ paper, orientation });
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
            Monitoring tunggakan pembayaran per siswa dan per rombongan belajar tahun ajaran {activeTa?.tahun || '-'}.
          </p>
        </div>
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

        {/* Print Control Toolbar */}
        <PrintPaperBar
          paper={paper}
          onPaperChange={setPaper}
          orientation={orientation}
          onOrientationChange={setOrientation}
          allowedPapers={['a4', 'f4']}
          printLabel="Cetak Rekap Tunggakan"
          onPrint={handlePrint}
        />
      </div>

      {/* Printable Sheet View for Printing (A4/F4 Landscape/Portrait) */}
      <div
        className={`print-area ${
          paper === 'f4'
            ? orientation === 'landscape'
              ? 'print-f4-landscape sheet-preview-f4-landscape'
              : 'print-f4 sheet-preview-f4'
            : orientation === 'landscape'
            ? 'print-a4-landscape sheet-preview-a4-landscape'
            : 'print-a4 sheet-preview-a4'
        } print:block hidden mb-6 text-slate-900`}
      >
        <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
          <p className="text-[10px] font-bold tracking-widest text-slate-700 uppercase">
            KEMENTERIAN AGAMA REPUBLIK INDONESIA
          </p>
          <h1 className="text-base font-extrabold uppercase tracking-wider text-slate-900">
            LAPORAN REKAPITULASI TUNGGAKAN PEMBAYARAN SISWA
          </h1>
          <p className="text-xs text-slate-600">
            Tahun Ajaran {activeTa?.tahun || '-'} ({activeTa?.semester || '-'}) • Dicetak pada {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </p>
        </div>

        {activeTab === 'per-siswa' ? (
          <div>
            <table className="w-full text-xs border border-slate-400 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold">
                  <th className="py-1.5 px-2 text-center w-8 border-r border-slate-400">No</th>
                  <th className="py-1.5 px-2 text-center w-20 border-r border-slate-400">NIS</th>
                  <th className="py-1.5 px-3 text-left border-r border-slate-400">Nama Siswa</th>
                  <th className="py-1.5 px-2 text-center w-16 border-r border-slate-400">Kelas</th>
                  <th className="py-1.5 px-3 text-left border-r border-slate-400">Rincian Pos Tunggakan</th>
                  <th className="py-1.5 px-3 text-right w-28 border-r border-slate-400 font-mono">Total (Rp)</th>
                  <th className="py-1.5 px-2 text-left w-28">No. HP Orang Tua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {tunggakanSiswaList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-500 italic">
                      Tidak ada siswa yang memiliki tunggakan pembayaran.
                    </td>
                  </tr>
                ) : (
                  tunggakanSiswaList.map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-1.5 px-2 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                      <td className="py-1.5 px-2 text-center font-mono border-r border-slate-300">{item.siswa?.nis || '-'}</td>
                      <td className="py-1.5 px-3 font-semibold border-r border-slate-300">{item.siswa?.nama || '-'}</td>
                      <td className="py-1.5 px-2 text-center border-r border-slate-300">{item.kelas?.nama || '-'}</td>
                      <td className="py-1.5 px-3 border-r border-slate-300">
                        {item.itemTunggakan.map((sub) => `${sub.namaPembayaran}${sub.bulan ? ` (${sub.bulan})` : ''}: Rp ${Number(sub.sisa).toLocaleString('id-ID')}`).join('; ')}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold border-r border-slate-300 text-slate-900">
                        Rp {Number(item.totalTunggakan).toLocaleString('id-ID')}
                      </td>
                      <td className="py-1.5 px-2 text-slate-700 font-mono text-[11px]">{item.siswa?.telepon_ortu || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-400">
                  <td colSpan={5} className="py-2 px-3 text-right">TOTAL KESELURUHAN TUNGGAKAN:</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-900 font-black">
                    Rp {Number(totalAkumulasiTunggakan).toLocaleString('id-ID')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div>
            <table className="w-full text-xs border border-slate-400 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-400 text-slate-800 font-bold">
                  <th className="py-1.5 px-2 text-center w-8 border-r border-slate-400">No</th>
                  <th className="py-1.5 px-3 text-left border-r border-slate-400">Kelas / Rombel</th>
                  <th className="py-1.5 px-3 text-left border-r border-slate-400">Wali Kelas</th>
                  <th className="py-1.5 px-2 text-center border-r border-slate-400">Total Siswa</th>
                  <th className="py-1.5 px-3 text-right border-r border-slate-400 font-mono">Total Tagihan</th>
                  <th className="py-1.5 px-3 text-right border-r border-slate-400 font-mono">Terbayar</th>
                  <th className="py-1.5 px-3 text-right border-r border-slate-400 font-mono">Tunggakan</th>
                  <th className="py-1.5 px-2 text-center">Menunggak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {tunggakanKelasList.map((k, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 px-2 text-center font-mono border-r border-slate-300">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-semibold border-r border-slate-300">Kelas {k.kelas_nama}</td>
                    <td className="py-1.5 px-3 border-r border-slate-300">{k.wali_kelas_nama}</td>
                    <td className="py-1.5 px-2 text-center border-r border-slate-300">{k.totalSiswa} Siswa</td>
                    <td className="py-1.5 px-3 text-right font-mono border-r border-slate-300">Rp {Number(k.totalTagihan).toLocaleString('id-ID')}</td>
                    <td className="py-1.5 px-3 text-right font-mono border-r border-slate-300">Rp {Number(k.totalTerbayar).toLocaleString('id-ID')}</td>
                    <td className="py-1.5 px-3 text-right font-mono font-bold border-r border-slate-300">Rp {Number(k.totalTunggakan).toLocaleString('id-ID')}</td>
                    <td className="py-1.5 px-2 text-center font-bold">{k.siswaMenunggakCount} Siswa</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Lembar Tanda Tangan */}
        <div className="grid grid-cols-2 gap-8 text-center text-xs mt-8 pt-4 print-avoid-break">
          <div>
            <p className="text-slate-500">Mengetahui,</p>
            <p className="font-semibold text-slate-800">Kepala Madrasah</p>
            <div className="h-16" />
            <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-8">
              ( ..................................... )
            </p>
          </div>
          <div>
            <p className="text-slate-500">
              Dicetak tanggal {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-semibold text-slate-800">Bendahara / Bagian Keuangan</p>
            <div className="h-16" />
            <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-8">
              ( ..................................... )
            </p>
          </div>
        </div>
      </div>

      {/* TAB 1: RINCIAN PER SISWA (Screen only) */}
      {activeTab === 'per-siswa' && (
        <div className="space-y-4 print:hidden">
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
              {tunggakanSiswaList.map((item, idx) => (
                <div
                  key={item.siswa?.id ?? (item as any)?.siswa_id ?? idx}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {item.siswa?.nama || '-'}
                        </h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          Kelas {item.kelas?.nama || '-'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        NIS: {item.siswa?.nis || '-'} • Orang Tua/Wali: {item.siswa?.nama_ayah || item.siswa?.nama_ibu || '-'} ({item.siswa?.telepon_ortu || '-'})
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
                          navigate(`/keuangan/pembayaran?siswaId=${item.siswa?.id ?? (item as any)?.siswa_id}`)
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
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:hidden">
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
