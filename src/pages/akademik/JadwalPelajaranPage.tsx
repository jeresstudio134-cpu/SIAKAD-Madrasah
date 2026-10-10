import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { JadwalPelajaran, Kelas, Guru, Mapel, TahunAjaran } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  CalendarDays,
  Plus,
  Trash2,
  Edit2,
  Clock,
  Building2,
  User,
  AlertTriangle,
  BookOpen,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const;
const JAM_LIST = [
  { jam_ke: 1, waktu: '07:15 - 08:35' },
  { jam_ke: 2, waktu: '08:35 - 09:55' },
  { jam_ke: 3, waktu: '10:15 - 11:35' },
  { jam_ke: 4, waktu: '11:35 - 12:45' },
  { jam_ke: 5, waktu: '13:00 - 14:10' },
  { jam_ke: 6, waktu: '14:10 - 15:20' },
];

export function JadwalPelajaranPage() {
  const { hasPermission } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('akademik', 'ubah') || hasPermission('akademik', 'tambah');

  // Filter
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedGuruFilter, setSelectedGuruFilter] = useState<string>('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JadwalPelajaran | null>(null);
  const [formData, setFormData] = useState({
    hari: 'Senin' as typeof HARI_LIST[number],
    jam_ke: 1,
    jam_mulai: '07:15',
    jam_selesai: '08:35',
    kelas_id: '',
    mapel_id: '',
    guru_id: '',
    ruang: 'Ruang Kelas',
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Queries
  const { data: rawTaList = [], isLoading: isLoadingTa } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
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

  // Auto-select first class when kelasList loads
  useEffect(() => {
    if (kelasList.length > 0 && (!selectedKelasId || !kelasList.some((k) => String(k?.id) === selectedKelasId))) {
      setSelectedKelasId(String(kelasList[0]?.id));
    }
  }, [kelasList, selectedKelasId]);

  const { data: rawGuruList = [] } = useQuery({
    queryKey: ['guru-simple'],
    queryFn: async () => {
      const res = await api.get<any[]>('/api/guru/simple');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const guruList = Array.isArray(rawGuruList) ? rawGuruList : [];

  const { data: rawMapelList = [] } = useQuery({
    queryKey: ['mapel-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/mapel?limit=100');
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const mapelList = Array.isArray(rawMapelList) ? rawMapelList : [];

  // Query Jadwal
  const { data: rawJadwalList = [], isLoading } = useQuery({
    queryKey: ['jadwal', selectedKelasId, selectedGuruFilter, activeTa?.id],
    queryFn: async () => {
      if (!activeTa) return [];
      const params = new URLSearchParams();
      if (selectedKelasId) params.append('kelas_id', selectedKelasId);
      if (selectedGuruFilter) params.append('guru_id', selectedGuruFilter);
      params.append('tahun_ajaran_id', String(activeTa.id));

      const res = await api.get<JadwalPelajaran[]>(`/api/akademik/jadwal?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(activeTa),
  });

  const jadwalList = Array.isArray(rawJadwalList) ? rawJadwalList : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post('/api/akademik/jadwal', {
        ...data,
        tahun_ajaran_id: activeTa?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal'] });
      success('Jadwal pelajaran berhasil disimpan.');
      setModalOpen(false);
      setConflictWarning(null);
    },
    onError: (err: any) => {
      setConflictWarning(err.message);
      error(err.message || 'Gagal menyimpan jadwal (terdeteksi bentrok).');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/akademik/jadwal/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jadwal'] });
      success('Jadwal berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus jadwal.'),
  });

  const handleOpenAddModal = (hari?: typeof HARI_LIST[number], jam_ke?: number) => {
    const jamInfo = JAM_LIST.find((j) => j.jam_ke === (jam_ke || 1));
    const [start, end] = (jamInfo?.waktu || '07:15 - 08:35').split(' - ');

    setEditingItem(null);
    setFormData({
      hari: hari || 'Senin',
      jam_ke: jam_ke || 1,
      jam_mulai: start.trim(),
      jam_selesai: end.trim(),
      kelas_id: selectedKelasId || (kelasList[0]?.id ? String(kelasList[0].id) : ''),
      mapel_id: mapelList[0]?.id ? String(mapelList[0].id) : '',
      guru_id: guruList[0]?.id ? String(guruList[0].id) : '',
      ruang: 'Ruang Kelas',
    });
    setConflictWarning(null);
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kelas_id || !formData.mapel_id || !formData.guru_id) {
      error('Mohon pilih Kelas, Mata Pelajaran, dan Guru pengampu.');
      return;
    }
    createMutation.mutate(formData);
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
            Jadwal Pelajaran & Matriks KBM
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penataan jadwal Kegiatan Belajar Mengajar (KBM) mingguan dengan validasi bentrok guru pengampu dan ketersediaan ruang kelas.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Tambah Jadwal KBM
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Pilih Rombel / Kelas:</span>
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

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Filter Guru:</span>
            <select
              value={selectedGuruFilter}
              onChange={(e) => setSelectedGuruFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">Semua Guru</option>
              {guruList.map((g) => (
                <option key={g?.id} value={g?.id}>
                  {g?.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sistem mencegah bentrok guru & rombel secara otomatis</span>
        </div>
      </div>

      {/* Timetable Weekly Matrix Grid */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-emerald-600" />
            <span>
              Jadwal Kelas{' '}
              {kelasList.find((k) => String(k?.id) === selectedKelasId)?.nama || '-'} — TA{' '}
              {activeTa?.tahun || '-'} ({activeTa?.semester || '-'})
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={7} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 text-center font-bold">
                  <th className="py-3 px-3 w-28 border-r border-slate-200">Jam / Waktu</th>
                  {HARI_LIST.map((hari) => (
                    <th key={hari} className="py-3 px-3 min-w-[160px] border-r border-slate-200">
                      {hari}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {JAM_LIST.map((jam) => (
                  <tr key={jam.jam_ke} className="hover:bg-slate-50/50 transition-colors">
                    {/* Waktu Kolom */}
                    <td className="py-3 px-2 border-r border-slate-200 bg-slate-50 text-center">
                      <div className="font-extrabold text-slate-800">Ke-{jam.jam_ke}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{jam.waktu}</div>
                    </td>

                    {/* Hari Kolom */}
                    {HARI_LIST.map((hari) => {
                      const matchJadwal = jadwalList.find(
                        (j) => j?.hari === hari && j?.jam_ke === jam.jam_ke
                      );

                      return (
                        <td
                          key={hari}
                          className="py-2 px-2 border-r border-slate-200 align-top relative group"
                        >
                          {matchJadwal ? (
                            <div className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 shadow-2xs hover:shadow-sm transition-all text-left">
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-slate-900 text-xs line-clamp-1">
                                  {matchJadwal?.mapel?.nama || '-'}
                                </span>
                                {canEdit && (
                                  <button
                                    onClick={() => setDeleteId(matchJadwal.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 cursor-pointer opacity-0 group-hover:opacity-100"
                                    title="Hapus"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-emerald-800 font-medium mt-1 flex items-center gap-1 line-clamp-1">
                                <User className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{matchJadwal?.guru?.nama || '-'}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
                                <span className="font-mono">{matchJadwal?.mapel?.kode || '-'}</span>
                                <span>{matchJadwal?.ruang || 'Kelas'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-full min-h-[58px] flex items-center justify-center">
                              {canEdit ? (
                                <button
                                  onClick={() => handleOpenAddModal(hari, jam.jam_ke)}
                                  className="w-full h-full p-2 text-slate-300 hover:text-emerald-700 hover:bg-emerald-50/50 rounded-lg border border-dashed border-transparent hover:border-emerald-300 transition-all flex items-center justify-center cursor-pointer text-[10px] font-medium opacity-0 group-hover:opacity-100"
                                >
                                  + Isi
                                </button>
                              ) : (
                                <span className="text-slate-300 text-xs">-</span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Input Jadwal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Jadwal Pelajaran"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {conflictWarning && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Hari</label>
              <select
                value={formData.hari}
                onChange={(e) =>
                  setFormData({ ...formData, hari: e.target.value as typeof HARI_LIST[number] })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
                required
              >
                {HARI_LIST.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Ke</label>
              <select
                value={formData.jam_ke}
                onChange={(e) => {
                  const jKe = Number(e.target.value);
                  const jInfo = JAM_LIST.find((j) => j.jam_ke === jKe);
                  const [start, end] = (jInfo?.waktu || '07:15 - 08:35').split(' - ');
                  setFormData({
                    ...formData,
                    jam_ke: jKe,
                    jam_mulai: start.trim(),
                    jam_selesai: end.trim(),
                  });
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
                required
              >
                {JAM_LIST.map((j) => (
                  <option key={j.jam_ke} value={j.jam_ke}>
                    Jam Ke-{j.jam_ke} ({j.waktu})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas Rombel</label>
            <select
              value={formData.kelas_id}
              onChange={(e) => setFormData({ ...formData, kelas_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              required
            >
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map((k) => (
                <option key={k?.id} value={k?.id}>
                  Kelas {k?.nama} (Tingkat {k?.tingkat})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mata Pelajaran
            </label>
            <select
              value={formData.mapel_id}
              onChange={(e) => setFormData({ ...formData, mapel_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              required
            >
              <option value="">-- Pilih Mata Pelajaran --</option>
              {mapelList.map((m: any) => (
                <option key={m?.id} value={m?.id}>
                  {m?.nama} ({m?.kode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Guru Pengampu
            </label>
            <select
              value={formData.guru_id}
              onChange={(e) => setFormData({ ...formData, guru_id: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              required
            >
              <option value="">-- Pilih Guru --</option>
              {guruList.map((g) => (
                <option key={g?.id} value={g?.id}>
                  {g?.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ruangan</label>
            <input
              type="text"
              value={formData.ruang}
              onChange={(e) => setFormData({ ...formData, ruang: e.target.value })}
              placeholder="Contoh: Ruang 7-A, Lab IPA"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 rounded-xl transition-colors cursor-pointer"
            >
              {createMutation.isPending ? 'Memeriksa & Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Jadwal Pelajaran"
        message="Apakah Anda yakin ingin menghapus jadwal ini?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
