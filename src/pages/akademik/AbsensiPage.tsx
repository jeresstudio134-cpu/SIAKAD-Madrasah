import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Kelas, TahunAjaran, RekapAbsensiSiswa } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  CalendarCheck,
  Save,
  CheckCircle,
  FileText,
  BarChart3,
  Calendar,
  AlertCircle,
  Users,
} from 'lucide-react';

export function AbsensiPage() {
  const { hasPermission } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('akademik', 'ubah') || hasPermission('akademik', 'tambah');

  // Filter
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedTanggal, setSelectedTanggal] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [activeTab, setActiveTab] = useState<'harian' | 'bulanan' | 'semester'>('harian');

  // Rekap filter
  const [rekapBulan, setRekapBulan] = useState<number>(new Date().getMonth() + 1);
  const [rekapTahun, setRekapTahun] = useState<number>(new Date().getFullYear());

  // Local Attendance State for Input
  const [attendanceState, setAttendanceState] = useState<
    Record<number, { status: 'H' | 'I' | 'S' | 'A'; catatan: string }>
  >({});

  // Queries
  const { data: rawTaList = [], isLoading: isLoadingTa } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran/simple');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const taList = Array.isArray(rawTaList) ? rawTaList : [];
  const activeTa = taList.find((t) => t?.is_active) || taList[0];

  const { data: guruScope } = useQuery({
    queryKey: ['guru-scope'],
    queryFn: async () => {
      const res = await api.get<any>('/api/akademik/guru-scope');
      return res.data;
    },
  });

  const { data: rawKelasList = [] } = useQuery({
    queryKey: ['kelas-simple'],
    queryFn: async () => {
      const res = await api.get<Kelas[]>('/api/kelas/simple');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  // Filter kelas berdasarkan scope jika login sebagai guru
  const validRawKelas = Array.isArray(rawKelasList) ? rawKelasList : [];
  const kelasList = guruScope?.isGuru
    ? validRawKelas.filter((k) => guruScope.allowedKelasIds?.includes(k?.id))
    : validRawKelas;

  // Auto-select first class when kelasList loads
  useEffect(() => {
    if (kelasList.length > 0 && (!selectedKelasId || !kelasList.some((k) => String(k?.id) === selectedKelasId))) {
      setSelectedKelasId(String(kelasList[0]?.id));
    }
  }, [kelasList, selectedKelasId]);

  // Query Absensi Harian
  const { data: rawHarianList = [], isLoading: isLoadingHarian } = useQuery({
    queryKey: ['absensi-harian', selectedKelasId, selectedTanggal, activeTa?.id],
    queryFn: async () => {
      if (!selectedKelasId || !activeTa) return [];
      const res = await api.get<Array<{ siswa?: any; siswa_id?: number; nama?: string; nis?: string; status: 'H' | 'I' | 'S' | 'A'; catatan: string }>>(
        `/api/akademik/absensi?kelas_id=${selectedKelasId}&tanggal=${selectedTanggal}&tahun_ajaran_id=${activeTa?.id}`
      );
      const list = Array.isArray(res.data) ? res.data : [];

      // Update local state
      const stateMap: Record<number, { status: 'H' | 'I' | 'S' | 'A'; catatan: string }> = {};
      list.forEach((item) => {
        const sId = item?.siswa?.id ?? item?.siswa_id;
        if (sId) {
          stateMap[sId] = { status: item?.status || 'H', catatan: item?.catatan || '' };
        }
      });
      setAttendanceState(stateMap);

      return list;
    },
    enabled: Boolean(selectedKelasId && activeTa),
  });

  const harianList = Array.isArray(rawHarianList) ? rawHarianList : [];

  // Query Rekap Bulanan / Semester
  const { data: rawRekapList = [], isLoading: isLoadingRekap } = useQuery({
    queryKey: ['absensi-rekap', selectedKelasId, activeTab, rekapBulan, rekapTahun, activeTa?.id],
    queryFn: async () => {
      if (!selectedKelasId || !activeTa) return [];
      const params = new URLSearchParams({
        kelas_id: selectedKelasId,
        tahun_ajaran_id: String(activeTa.id),
      });

      if (activeTab === 'bulanan') {
        params.append('bulan', String(rekapBulan));
        params.append('tahun', String(rekapTahun));
      }

      const res = await api.get<RekapAbsensiSiswa[]>(`/api/akademik/absensi/rekap?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(selectedKelasId && activeTa && (activeTab === 'bulanan' || activeTab === 'semester')),
  });

  const rekapList = Array.isArray(rawRekapList) ? rawRekapList : [];

  // Save Absensi Mutation
  const saveMutation = useMutation({
    mutationFn: (items: any[]) =>
      api.post('/api/akademik/absensi/batch', {
        kelas_id: Number(selectedKelasId),
        tanggal: selectedTanggal,
        tahun_ajaran_id: activeTa?.id,
        items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absensi-harian'] });
      queryClient.invalidateQueries({ queryKey: ['absensi-rekap'] });
      success('Data absensi harian berhasil disimpan.');
    },
    onError: (err: any) => error(err.message || 'Gagal menyimpan absensi.'),
  });

  const handleStatusChange = (siswaId: number, status: 'H' | 'I' | 'S' | 'A') => {
    setAttendanceState((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        status,
      },
    }));
  };

  const handleCatatanChange = (siswaId: number, catatan: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [siswaId]: {
        ...prev[siswaId],
        catatan,
      },
    }));
  };

  const handleHadirSemua = () => {
    const updated: Record<number, { status: 'H' | 'I' | 'S' | 'A'; catatan: string }> = {};
    harianList.forEach((item) => {
      const sId = item?.siswa?.id ?? item?.siswa_id;
      if (sId) {
        updated[sId] = {
          status: 'H',
          catatan: attendanceState[sId]?.catatan || '',
        };
      }
    });
    setAttendanceState(updated);
  };

  const handleSaveAll = () => {
    if (harianList.length === 0) {
      warning('Tidak ada siswa untuk disimpan absensinya.');
      return;
    }

    const items = harianList.map((item) => {
      const sId = item?.siswa?.id ?? item?.siswa_id;
      return {
        siswa_id: sId,
        status: attendanceState[sId]?.status || item?.status || 'H',
        catatan: attendanceState[sId]?.catatan || item?.catatan || '',
      };
    });

    saveMutation.mutate(items);
  };

  if (isLoadingTa) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs">
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }

  if (!activeTa) {
    return (
      <EmptyState
        title="Belum Ada Tahun Ajaran Aktif"
        description="Belum ada tahun ajaran aktif, atur di menu Tahun Ajaran."
        icon={<AlertCircle className="w-8 h-8 text-amber-600" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Presensi & Rekap Absensi Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pencatatan kehadiran harian siswa per rombel, rekap bulanan persentase kehadiran, dan akumulasi kehadiran semester untuk buku rapor.
          </p>
        </div>

        {canEdit && activeTab === 'harian' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleHadirSemua}
              disabled={harianList.length === 0}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Hadirkan Semua
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saveMutation.isPending || harianList.length === 0}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Absensi'}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('harian')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'harian'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Input Absensi Harian
        </button>

        <button
          onClick={() => setActiveTab('bulanan')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'bulanan'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Rekap Kehadiran Bulanan
        </button>

        <button
          onClick={() => setActiveTab('semester')}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'semester'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Rekap Semester (Untuk Rapor)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Kelas:</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white font-semibold text-emerald-800"
            >
              {kelasList.length === 0 ? (
                <option value="">-- Belum Ada Kelas --</option>
              ) : (
                kelasList.map((k) => (
                  <option key={k?.id} value={k?.id}>
                    Kelas {k?.nama} (Tingkat {k?.tingkat})
                  </option>
                ))
              )}
            </select>
          </div>

          {activeTab === 'harian' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Tanggal:</span>
              <input
                type="date"
                value={selectedTanggal}
                onChange={(e) => setSelectedTanggal(e.target.value)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              />
            </div>
          )}

          {activeTab === 'bulanan' && (
            <div className="flex items-center gap-2">
              <select
                value={rekapBulan}
                onChange={(e) => setRekapBulan(Number(e.target.value))}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                {[
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
                ].map((b, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    Bulan {b}
                  </option>
                ))}
              </select>
              <select
                value={rekapTahun}
                onChange={(e) => setRekapTahun(Number(e.target.value))}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                {[2024, 2025, 2026].map((th) => (
                  <option key={th} value={th}>
                    {th}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {guruScope?.isGuru && (
          <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            Akses Guru Pengampu / Wali Kelas Aktif
          </div>
        )}
      </div>

      {/* TAB 1: INPUT HARIAN */}
      {activeTab === 'harian' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isLoadingHarian ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={5} />
            </div>
          ) : harianList.length === 0 ? (
            <EmptyState
              title="Belum Ada Siswa di Kelas Ini"
              description="Pastikan rombongan belajar telah diisi siswa melalui menu Penempatan Kelas."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4 text-center">Status Kehadiran</th>
                    <th className="py-3.5 px-4">Catatan Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {harianList.map((item, idx) => {
                    const sId = item?.siswa?.id ?? item?.siswa_id ?? idx;
                    const sNama = item?.siswa?.nama ?? item?.nama ?? '-';
                    const sNis = item?.siswa?.nis ?? item?.nis ?? '-';
                    const currentStatus = attendanceState[sId]?.status || item?.status || 'H';
                    const currentCatatan = attendanceState[sId]?.catatan ?? item?.catatan ?? '';

                    return (
                      <tr key={sId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{sNama}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{sNis}</td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1">
                            <button
                              type="button"
                              onClick={() => handleStatusChange(sId, 'H')}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                currentStatus === 'H'
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-emerald-700'
                              }`}
                              title="Hadir"
                            >
                              H
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(sId, 'I')}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                currentStatus === 'I'
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-blue-700'
                              }`}
                              title="Izin"
                            >
                              I
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(sId, 'S')}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                currentStatus === 'S'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-amber-700'
                              }`}
                              title="Sakit"
                            >
                              S
                            </button>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(sId, 'A')}
                              className={`px-3 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                                currentStatus === 'A'
                                  ? 'bg-rose-600 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-rose-700'
                              }`}
                              title="Alpa / Tanpa Keterangan"
                            >
                              A
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <input
                            type="text"
                            value={currentCatatan}
                            onChange={(e) => handleCatatanChange(sId, e.target.value)}
                            placeholder="Alasan izin / sakit..."
                            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-emerald-600"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2 & 3: REKAP BULANAN & SEMESTER */}
      {(activeTab === 'bulanan' || activeTab === 'semester') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {isLoadingRekap ? (
            <div className="p-6">
              <TableSkeleton rows={5} cols={7} />
            </div>
          ) : rekapList.length === 0 ? (
            <EmptyState
              title="Belum Ada Rekap Absensi"
              description="Catatan kehadiran belum terekam pada periode ini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-12 text-center">No</th>
                    <th className="py-3.5 px-4">Nama Siswa</th>
                    <th className="py-3.5 px-4">NIS</th>
                    <th className="py-3.5 px-4 text-center">Hadir (H)</th>
                    <th className="py-3.5 px-4 text-center">Izin (I)</th>
                    <th className="py-3.5 px-4 text-center">Sakit (S)</th>
                    <th className="py-3.5 px-4 text-center">Alpa (A)</th>
                    <th className="py-3.5 px-4 text-center">% Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rekapList.map((item, idx) => {
                    const persen = Number(item?.persentase) || 0;
                    return (
                      <tr key={item?.siswa_id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item?.nama || '-'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{item?.nis || '-'}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-700">
                          {item?.hadir ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-blue-700">
                          {item?.izin ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-amber-700">
                          {item?.sakit ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-rose-700">
                          {item?.alpa ?? 0}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                              persen >= 85
                                ? 'bg-emerald-100 text-emerald-800'
                                : persen >= 75
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {persen}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
