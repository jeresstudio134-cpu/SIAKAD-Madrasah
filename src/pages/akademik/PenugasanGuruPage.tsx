import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { PengajaranGuru, Guru, Kelas, Mapel, TahunAjaran } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  Users2,
  BookOpen,
  Building2,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

export function PenugasanGuruPage() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('akademik', 'ubah') || hasPermission('akademik', 'tambah');

  // Filter
  const [filterGuruId, setFilterGuruId] = useState('');
  const [filterKelasId, setFilterKelasId] = useState('');

  // Modal Penugasan Ajar
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    guru_id: '',
    mapel_id: '',
    kelas_id: '',
    beban_jp: 2,
  });

  // Modal Wali Kelas
  const [waliModalOpen, setWaliModalOpen] = useState(false);
  const [waliData, setWaliData] = useState({
    kelas_id: '',
    guru_id: '',
  });

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

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

  const { data: rawGuruList = [] } = useQuery({
    queryKey: ['guru-simple'],
    queryFn: async () => {
      const res = await api.get<any[]>('/api/guru/simple');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const guruList = Array.isArray(rawGuruList) ? rawGuruList : [];

  const { data: rawKelasList = [] } = useQuery({
    queryKey: ['kelas-simple'],
    queryFn: async () => {
      const res = await api.get<Kelas[]>('/api/kelas/simple');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const kelasList = Array.isArray(rawKelasList) ? rawKelasList : [];

  const { data: rawMapelList = [] } = useQuery({
    queryKey: ['mapel-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/mapel?limit=100');
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
  });

  const mapelList = Array.isArray(rawMapelList) ? rawMapelList : [];

  const { data: rawPengajaranList = [], isLoading } = useQuery({
    queryKey: ['pengajaran', filterGuruId, filterKelasId, activeTa?.id],
    queryFn: async () => {
      if (!activeTa) return [];
      const params = new URLSearchParams();
      if (filterGuruId) params.append('guru_id', filterGuruId);
      if (filterKelasId) params.append('kelas_id', filterKelasId);
      params.append('tahun_ajaran_id', String(activeTa.id));

      const res = await api.get<PengajaranGuru[]>(`/api/akademik/pengajaran?${params.toString()}`);
      return Array.isArray(res.data) ? res.data : [];
    },
    enabled: Boolean(activeTa),
  });

  const pengajaranList = Array.isArray(rawPengajaranList) ? rawPengajaranList : [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.post('/api/akademik/pengajaran', {
        ...data,
        tahun_ajaran_id: activeTa?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajaran'] });
      success('Penugasan guru berhasil ditambahkan.');
      setModalOpen(false);
      setFormData({ guru_id: '', mapel_id: '', kelas_id: '', beban_jp: 2 });
    },
    onError: (err: any) => error(err.message || 'Gagal menambahkan penugasan.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/akademik/pengajaran/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengajaran'] });
      success('Penugasan guru berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus penugasan.'),
  });

  const setWaliMutation = useMutation({
    mutationFn: (data: typeof waliData) =>
      api.post('/api/akademik/wali-kelas', {
        kelas_id: Number(data.kelas_id),
        guru_id: data.guru_id ? Number(data.guru_id) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      queryClient.invalidateQueries({ queryKey: ['kelas-simple'] });
      success('Wali kelas berhasil ditetapkan.');
      setWaliModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menetapkan wali kelas.'),
  });

  const handleSubmitPengajaran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guru_id || !formData.mapel_id || !formData.kelas_id) {
      error('Mohon lengkapi seluruh isian formulir penugasan.');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleSubmitWali = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waliData.kelas_id) {
      error('Pilih kelas terlebih dahulu.');
      return;
    }
    setWaliMutation.mutate(waliData);
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
            Penugasan Mengajar & Penetapan Wali Kelas
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penugasan pendidik madrasah mengampu mata pelajaran di setiap rombel serta penetapan wali kelas tahun ajaran {activeTa?.tahun || '-'}.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWaliModalOpen(true)}
              className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              Tetapkan Wali Kelas
            </button>

            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Penugasan Ajar
            </button>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-60">
            <select
              value={filterGuruId}
              onChange={(e) => setFilterGuruId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">Semua Guru Pengampu</option>
              {guruList.map((g) => (
                <option key={g?.id} value={g?.id}>
                  {g?.nama}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full sm:w-52">
            <select
              value={filterKelasId}
              onChange={(e) => setFilterKelasId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k?.id} value={k?.id}>
                  Kelas {k?.nama} (Tingkat {k?.tingkat})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Total <strong>{pengajaranList.length}</strong> jadwal penugasan
        </div>
      </div>

      {/* Table Penugasan */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : pengajaranList.length === 0 ? (
          <EmptyState
            title="Belum Ada Penugasan Guru"
            description="Tambahkan penugasan guru untuk mata pelajaran dan kelas di tahun ajaran aktif."
            onAction={canEdit ? () => setModalOpen(true) : undefined}
            actionText="Tambah Penugasan Ajar"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Nama Guru Pendidik</th>
                  <th className="py-3.5 px-4">Mata Pelajaran</th>
                  <th className="py-3.5 px-4">Kelas / Rombel</th>
                  <th className="py-3.5 px-4">Beban Jam</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pengajaranList.map((item) => (
                  <tr key={item?.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item?.guru?.nama || '-'}</div>
                      <div className="text-[11px] text-slate-400">{item?.guru?.jabatan || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{item?.mapel?.nama || '-'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{item?.mapel?.kode || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-semibold">
                        Kelas {item?.kelas?.nama || '-'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-semibold">
                      {item?.beban_jp ?? 0} JP / minggu
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {canEdit && (
                        <button
                          onClick={() => setDeleteId(item?.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Penugasan"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Penugasan Ajar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tambah Penugasan Guru Mengajar"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitPengajaran} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Guru Pendidik
            </label>
            <select
              value={formData.guru_id}
              onChange={(e) => setFormData((p) => ({ ...p, guru_id: e.target.value }))}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">-- Pilih Guru --</option>
              {guruList.map((g) => (
                <option key={g?.id} value={g?.id}>
                  {g?.nama} ({g?.jabatan})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mata Pelajaran
              </label>
              <select
                value={formData.mapel_id}
                onChange={(e) => setFormData((p) => ({ ...p, mapel_id: e.target.value }))}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="">-- Pilih Mapel --</option>
                {mapelList.map((m: any) => (
                  <option key={m?.id} value={m?.id}>
                    {m?.nama} ({m?.kode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kelas / Rombel
              </label>
              <select
                value={formData.kelas_id}
                onChange={(e) => setFormData((p) => ({ ...p, kelas_id: e.target.value }))}
                required
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map((k) => (
                  <option key={k?.id} value={k?.id}>
                    Kelas {k?.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Beban Jam Pelajaran (JP / Minggu)
            </label>
            <input
              type="number"
              min={1}
              max={40}
              value={formData.beban_jp}
              onChange={(e) =>
                setFormData((p) => ({ ...p, beban_jp: Number(e.target.value) || 1 }))
              }
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan Penugasan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Tetapkan Wali Kelas */}
      <Modal
        isOpen={waliModalOpen}
        onClose={() => setWaliModalOpen(false)}
        title="Tetapkan Wali Kelas Rombel"
        maxWidth="md"
      >
        <form onSubmit={handleSubmitWali} className="space-y-4">
          <p className="text-xs text-slate-500">
            Wali kelas bertanggung jawab penuh atas catatan pembinaan, pengisian rapor sikap spiritual & sosial, dan pengesahan rapor.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Rombongan Belajar (Kelas)
            </label>
            <select
              value={waliData.kelas_id}
              onChange={(e) => {
                const kId = e.target.value;
                const found = kelasList.find((k) => String(k?.id) === kId);
                setWaliData({
                  kelas_id: kId,
                  guru_id: found?.wali_kelas_id ? String(found.wali_kelas_id) : '',
                });
              }}
              required
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
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
              Pilih Guru sebagai Wali Kelas
            </label>
            <select
              value={waliData.guru_id}
              onChange={(e) => setWaliData((p) => ({ ...p, guru_id: e.target.value }))}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">-- Kosongkan / Belum Ditetapkan --</option>
              {guruList.map((g) => (
                <option key={g?.id} value={g?.id}>
                  {g?.nama} ({g?.jabatan})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setWaliModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={setWaliMutation.isPending}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              {setWaliMutation.isPending ? 'Menyimpan...' : 'Simpan Wali Kelas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Penugasan */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        title="Hapus Penugasan Mengajar?"
        message="Penugasan guru untuk mata pelajaran dan rombel ini akan dihapus dari jadwal."
        confirmText="Hapus"
        isDestructive
      />
    </div>
  );
}
