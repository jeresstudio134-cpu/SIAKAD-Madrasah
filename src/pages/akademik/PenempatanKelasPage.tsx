import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { PenempatanSiswa, Siswa, Kelas, TahunAjaran } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import {
  Users,
  UserPlus,
  ArrowUpRight,
  GraduationCap,
  CheckSquare,
  Square,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react';

export function PenempatanKelasPage() {
  const { hasPermission } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('akademik', 'ubah') || hasPermission('akademik', 'tambah');

  // Filter State
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'anggota' | 'unassigned' | 'kenaikan' | 'kelulusan'>('anggota');

  // Selection state for batch operations
  const [selectedSiswaIds, setSelectedSiswaIds] = useState<number[]>([]);

  // Modal / Action state
  const [targetKelasId, setTargetKelasId] = useState<string>('');
  const [kenaikanAksi, setKenaikanAksi] = useState<'naik' | 'tinggal'>('naik');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const { data: rawKelasList = [] } = useQuery({
    queryKey: ['kelas-simple'],
    queryFn: async () => {
      const res = await api.get<Kelas[]>('/api/kelas/simple');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const kelasList = Array.isArray(rawKelasList) ? rawKelasList : [];

  // Query Penempatan per kelas
  const { data: rawPenempatanList = [], isLoading: isLoadingPenempatan } = useQuery({
    queryKey: ['penempatan', selectedKelasId, activeTa?.id],
    queryFn: async () => {
      if (!activeTa) return [];
      const params = new URLSearchParams();
      if (selectedKelasId) params.append('kelas_id', selectedKelasId);
      params.append('tahun_ajaran_id', String(activeTa.id));
      const res = await api.get<PenempatanSiswa[]>(`/api/akademik/penempatan?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(activeTa),
  });

  const penempatanList = Array.isArray(rawPenempatanList) ? rawPenempatanList : [];

  // Query Siswa yang belum memiliki kelas di tahun ajaran ini
  const { data: rawUnassignedSiswa = [], isLoading: isLoadingUnassigned } = useQuery({
    queryKey: ['unassigned-siswa', activeTa?.id],
    queryFn: async () => {
      if (!activeTa) return [];
      const res = await api.get<Siswa[]>(`/api/akademik/penempatan/unassigned?tahun_ajaran_id=${activeTa.id}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(activeTa),
  });

  const unassignedSiswa = Array.isArray(rawUnassignedSiswa) ? rawUnassignedSiswa : [];

  // Toggle selection helper
  const toggleSelectSiswa = (id: number) => {
    setSelectedSiswaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = (ids: number[]) => {
    const validIds = ids.filter((id): id is number => typeof id === 'number' && !isNaN(id));
    if (selectedSiswaIds.length === validIds.length) {
      setSelectedSiswaIds([]);
    } else {
      setSelectedSiswaIds(validIds);
    }
  };

  // 1. Tempatkan siswa ke kelas
  const handleBatchPenempatan = async () => {
    if (selectedSiswaIds.length === 0 || !targetKelasId) {
      warning('Pilih minimal satu siswa dan kelas tujuan.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await api.post('/api/akademik/penempatan/batch', {
        siswa_ids: selectedSiswaIds,
        kelas_id: Number(targetKelasId),
        tahun_ajaran_id: activeTa?.id,
      });

      if (res.success) {
        success(res.message || 'Penempatan siswa berhasil.');
        setSelectedSiswaIds([]);
        setTargetKelasId('');
        queryClient.invalidateQueries({ queryKey: ['penempatan'] });
        queryClient.invalidateQueries({ queryKey: ['unassigned-siswa'] });
        queryClient.invalidateQueries({ queryKey: ['siswa'] });
      }
    } catch (err: any) {
      error(err.message || 'Gagal menempatkan siswa.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Kenaikan kelas massal
  const handleBatchKenaikan = async () => {
    if (selectedSiswaIds.length === 0 || !targetKelasId) {
      warning('Pilih siswa dan kelas tujuan kenaikan kelas.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await api.post('/api/akademik/penempatan/kenaikan-kelas', {
        siswa_ids: selectedSiswaIds,
        kelas_tujuan_id: Number(targetKelasId),
        tahun_ajaran_tujuan_id: activeTa?.id,
        aksi: kenaikanAksi,
      });

      if (res.success) {
        success(res.message || 'Proses kenaikan kelas berhasil.');
        setSelectedSiswaIds([]);
        setTargetKelasId('');
        queryClient.invalidateQueries({ queryKey: ['penempatan'] });
        queryClient.invalidateQueries({ queryKey: ['unassigned-siswa'] });
        queryClient.invalidateQueries({ queryKey: ['siswa'] });
      }
    } catch (err: any) {
      error(err.message || 'Gagal memproses kenaikan kelas.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Kelulusan massal
  const handleBatchKelulusan = async () => {
    if (selectedSiswaIds.length === 0) {
      warning('Pilih minimal satu siswa untuk dinyatakan lulus.');
      return;
    }

    try {
      setIsProcessing(true);
      const res = await api.post('/api/akademik/penempatan/kelulusan', {
        siswa_ids: selectedSiswaIds,
        tahun_ajaran_id: activeTa?.id,
      });

      if (res.success) {
        success(res.message || 'Penetapan kelulusan berhasil diproses.');
        setSelectedSiswaIds([]);
        queryClient.invalidateQueries({ queryKey: ['penempatan'] });
        queryClient.invalidateQueries({ queryKey: ['siswa'] });
      }
    } catch (err: any) {
      error(err.message || 'Gagal memproses kelulusan.');
    } finally {
      setIsProcessing(false);
    }
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
            Penempatan Siswa, Kenaikan Kelas & Kelulusan
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan rombel per tahun ajaran ({activeTa?.tahun || '-'} {activeTa?.semester || '-'}), kenaikan kelas berjenjang, dan penetapan status kelulusan massal.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('anggota');
            setSelectedSiswaIds([]);
          }}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'anggota'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Daftar Rombel & Anggota Kelas ({penempatanList.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('unassigned');
            setSelectedSiswaIds([]);
          }}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'unassigned'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Siswa Belum Ada Rombel ({unassignedSiswa.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('kenaikan');
            setSelectedSiswaIds([]);
          }}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'kenaikan'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Kenaikan Kelas Massal
        </button>

        <button
          onClick={() => {
            setActiveTab('kelulusan');
            setSelectedSiswaIds([]);
          }}
          className={`pb-3 px-4 border-b-2 flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'kelulusan'
              ? 'border-emerald-700 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Kelulusan Massal
        </button>
      </div>

      {/* TAB 1: ANGGOTA KELAS */}
      {activeTab === 'anggota' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Pilih Kelas / Rombel:
              </label>
              <select
                value={selectedKelasId}
                onChange={(e) => setSelectedKelasId(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="">Semua Rombel</option>
                {kelasList.map((k) => (
                  <option key={k?.id} value={k?.id}>
                    Kelas {k?.nama} (Tingkat {k?.tingkat})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-slate-500">
              Total {penempatanList.length} siswa ditempatkan
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isLoadingPenempatan ? (
              <div className="p-6">
                <TableSkeleton rows={4} cols={5} />
              </div>
            ) : penempatanList.length === 0 ? (
              <EmptyState
                title="Belum Ada Siswa di Kelas Ini"
                description="Gunakan tab 'Siswa Belum Ada Rombel' untuk menempatkan siswa baru ke kelas."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Nama Siswa</th>
                      <th className="py-3.5 px-4">NIS / NISN</th>
                      <th className="py-3.5 px-4">Kelas</th>
                      <th className="py-3.5 px-4">Status Rombel</th>
                      <th className="py-3.5 px-4">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {penempatanList.map((item) => (
                      <tr key={item?.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {item?.siswa?.nama || '-'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {item?.siswa?.nis || '-'} • NISN: {item?.siswa?.nisn || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold">
                            Kelas {item?.kelas?.nama || '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item?.status === 'aktif'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item?.status === 'naik_kelas'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item?.status ? item.status.replace('_', ' ') : '-'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{item?.catatan || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SISWA TANPA KELAS */}
      {activeTab === 'unassigned' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Terdapat <strong>{unassignedSiswa.length}</strong> siswa aktif yang belum ditempatkan ke kelas di tahun ajaran {activeTa?.tahun || '-'}.
              </span>
            </div>

            {canEdit && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={targetKelasId}
                  onChange={(e) => setTargetKelasId(e.target.value)}
                  className="px-3 py-2 text-xs border border-amber-300 rounded-xl focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Pilih Kelas Tujuan --</option>
                  {kelasList.map((k) => (
                    <option key={k?.id} value={k?.id}>
                      Kelas {k?.nama} (Tingkat {k?.tingkat})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleBatchPenempatan}
                  disabled={selectedSiswaIds.length === 0 || !targetKelasId || isProcessing}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isProcessing ? 'Menyimpan...' : `Tempatkan (${selectedSiswaIds.length})`}
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {isLoadingUnassigned ? (
              <div className="p-6">
                <TableSkeleton rows={4} cols={4} />
              </div>
            ) : unassignedSiswa.length === 0 ? (
              <EmptyState
                title="Semua Siswa Sudah Memiliki Kelas"
                description="Semua siswa aktif telah terdaftar dalam rombel tahun ajaran aktif."
                icon={<CheckCircle2 className="w-8 h-8 text-emerald-600" />}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 w-10">
                        <button
                          type="button"
                          onClick={() => selectAll(unassignedSiswa.map((s) => s?.id))}
                          className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                        >
                          {selectedSiswaIds.length > 0 && selectedSiswaIds.length === unassignedSiswa.length ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-4">Nama Siswa</th>
                      <th className="py-3.5 px-4">NIS / NISN</th>
                      <th className="py-3.5 px-4">L/P</th>
                      <th className="py-3.5 px-4">Kontak Ortu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {unassignedSiswa.map((s) => (
                      <tr
                        key={s?.id}
                        onClick={() => toggleSelectSiswa(s?.id)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          selectedSiswaIds.includes(s?.id) ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          {selectedSiswaIds.includes(s?.id) ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{s?.nama || '-'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {s?.nis || '-'} • NISN: {s?.nisn || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          {s?.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">{s?.telepon_ortu || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: KENAIKAN KELAS MASSAL */}
      {activeTab === 'kenaikan' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              Pengaturan Kenaikan Kelas Massal
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1. Pilih Rombel Asal:
                </label>
                <select
                  value={selectedKelasId}
                  onChange={(e) => {
                    setSelectedKelasId(e.target.value);
                    setSelectedSiswaIds([]);
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Pilih Rombel Asal --</option>
                  {kelasList.map((k) => (
                    <option key={k?.id} value={k?.id}>
                      Kelas {k?.nama} (Tingkat {k?.tingkat})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2. Pilih Aksi Kenaikan:
                </label>
                <select
                  value={kenaikanAksi}
                  onChange={(e) => setKenaikanAksi(e.target.value as 'naik' | 'tinggal')}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white font-semibold text-emerald-800"
                >
                  <option value="naik">Naik ke Tingkat Berikutnya</option>
                  <option value="tinggal">Tinggal di Kelas Ini</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Kelas Tujuan Baru:
                </label>
                <select
                  value={targetKelasId}
                  onChange={(e) => setTargetKelasId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Pilih Kelas Tujuan --</option>
                  {kelasList.map((k) => (
                    <option key={k?.id} value={k?.id}>
                      Kelas {k?.nama} (Tingkat {k?.tingkat})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Terpilih: <strong>{selectedSiswaIds.length}</strong> siswa
              </span>
              <button
                onClick={handleBatchKenaikan}
                disabled={selectedSiswaIds.length === 0 || !targetKelasId || isProcessing}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? 'Memproses...' : `Proses Kenaikan Kelas (${selectedSiswaIds.length} Siswa)`}
              </button>
            </div>
          </div>

          {/* Tabel checklist siswa di rombel asal */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {!selectedKelasId ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Silakan pilih Rombel Asal di atas untuk menampilkan daftar siswa.
              </div>
            ) : penempatanList.length === 0 ? (
              <EmptyState title="Tidak ada siswa di kelas ini" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 w-10">
                        <button
                          type="button"
                          onClick={() => selectAll(penempatanList.map((p) => p?.siswa_id))}
                          className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                        >
                          {selectedSiswaIds.length > 0 && selectedSiswaIds.length === penempatanList.length ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-4">Nama Siswa</th>
                      <th className="py-3.5 px-4">NIS / NISN</th>
                      <th className="py-3.5 px-4">Kelas Saat Ini</th>
                      <th className="py-3.5 px-4">Status Sekarang</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {penempatanList.map((item) => (
                      <tr
                        key={item?.id}
                        onClick={() => toggleSelectSiswa(item?.siswa_id)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          selectedSiswaIds.includes(item?.siswa_id) ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          {selectedSiswaIds.includes(item?.siswa_id) ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item?.siswa?.nama || '-'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {item?.siswa?.nis || '-'} • NISN: {item?.siswa?.nisn || '-'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-800">
                          Kelas {item?.kelas?.nama || '-'}
                        </td>
                        <td className="py-3.5 px-4 capitalize">
                          {item?.status ? item.status.replace('_', ' ') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: KELULUSAN MASSAL */}
      {activeTab === 'kelulusan' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-emerald-600" />
              Penetapan Kelulusan Massal Tingkat Akhir (Kelas 9 / 12)
            </h3>
            <p className="text-xs text-slate-500">
              Pilih kelas tingkat akhir, tandai siswa yang telah menyelesaikan seluruh program studi madrasah dan nyatakan lulus secara massal.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                  Pilih Kelas Tingkat Akhir:
                </label>
                <select
                  value={selectedKelasId}
                  onChange={(e) => {
                    setSelectedKelasId(e.target.value);
                    setSelectedSiswaIds([]);
                  }}
                  className="px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
                >
                  <option value="">-- Pilih Kelas --</option>
                  {kelasList.map((k) => (
                    <option key={k?.id} value={k?.id}>
                      Kelas {k?.nama} (Tingkat {k?.tingkat})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleBatchKelulusan}
                disabled={selectedSiswaIds.length === 0 || isProcessing}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? 'Memproses...' : `Nyatakan Lulus (${selectedSiswaIds.length} Siswa)`}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {!selectedKelasId ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Silakan pilih kelas tingkat akhir di atas untuk menampilkan daftar siswa.
              </div>
            ) : penempatanList.length === 0 ? (
              <EmptyState title="Tidak ada siswa di kelas ini" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4 w-10">
                        <button
                          type="button"
                          onClick={() => selectAll(penempatanList.map((p) => p?.siswa_id))}
                          className="text-slate-400 hover:text-emerald-700 cursor-pointer"
                        >
                          {selectedSiswaIds.length > 0 && selectedSiswaIds.length === penempatanList.length ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3.5 px-4">Nama Lengkap</th>
                      <th className="py-3.5 px-4">NIS / NISN</th>
                      <th className="py-3.5 px-4">Status Siswa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {penempatanList.map((item) => (
                      <tr
                        key={item?.id}
                        onClick={() => toggleSelectSiswa(item?.siswa_id)}
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          selectedSiswaIds.includes(item?.siswa_id) ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          {selectedSiswaIds.includes(item?.siswa_id) ? (
                            <CheckSquare className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{item?.siswa?.nama || '-'}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {item?.siswa?.nis || '-'} • NISN: {item?.siswa?.nisn || '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              item?.siswa?.status === 'lulus'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {item?.siswa?.status || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
