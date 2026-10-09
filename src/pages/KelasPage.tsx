import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { Kelas, Guru, TahunAjaran, PaginatedResult } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { Plus, Edit2, Trash2, Search, Building2, Users } from 'lucide-react';

export function KelasPage() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const canCreate = hasPermission('kelas', 'tambah');
  const canEdit = hasPermission('kelas', 'ubah');
  const canDelete = hasPermission('kelas', 'hapus');

  // Filter & Pagination State
  const [tingkatFilter, setTingkatFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Kelas | null>(null);
  const [formData, setFormData] = useState({
    tingkat: '7',
    nama: '',
    tahun_ajaran_id: 1,
    wali_kelas_id: null as number | null,
    kapasitas: 32,
  });

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: kelasData, isLoading } = useQuery({
    queryKey: ['kelas', tingkatFilter, searchTerm, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (tingkatFilter) params.append('tingkat', tingkatFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get<PaginatedResult<Kelas>>(`/api/kelas?${params.toString()}`);
      return res.data;
    },
  });

  const { data: guruSimple = [] } = useQuery({
    queryKey: ['guru-simple'],
    queryFn: async () => {
      const res = await api.get<any[]>('/api/guru/simple');
      return res.data || [];
    },
  });

  const { data: taList = [] } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/kelas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Kelas berhasil ditambahkan.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menambahkan kelas.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      api.put(`/api/kelas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Kelas berhasil diperbarui.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal memperbarui kelas.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/kelas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kelas'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Kelas berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus kelas.'),
  });

  const handleOpenModal = (item?: Kelas) => {
    const activeTa = taList.find((t) => t.is_active) || taList[0];
    if (item) {
      setEditingItem(item);
      setFormData({
        tingkat: item.tingkat,
        nama: item.nama,
        tahun_ajaran_id: item.tahun_ajaran_id,
        wali_kelas_id: item.wali_kelas_id,
        kapasitas: item.kapasitas,
      });
    } else {
      setEditingItem(null);
      setFormData({
        tingkat: '7',
        nama: '',
        tahun_ajaran_id: activeTa ? activeTa.id : 1,
        wali_kelas_id: null,
        kapasitas: 32,
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      error('Nama kelas wajib diisi.');
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Kelas & Rombongan Belajar</h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan rombel madrasah, penugasan wali kelas, dan kuota siswa.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Kelas
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama kelas..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={tingkatFilter}
            onChange={(e) => {
              setTingkatFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
          >
            <option value="">Semua Tingkat</option>
            <option value="7">Tingkat 7 (MTs)</option>
            <option value="8">Tingkat 8 (MTs)</option>
            <option value="9">Tingkat 9 (MTs)</option>
            <option value="10">Tingkat 10 (MA)</option>
            <option value="11">Tingkat 11 (MA)</option>
            <option value="12">Tingkat 12 (MA)</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={6} />
          </div>
        ) : !kelasData || kelasData.data.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Kelas"
            description="Belum ada data rombongan belajar yang sesuai dengan kriteria pencarian."
            onAction={canCreate ? () => handleOpenModal() : undefined}
            actionText="Tambah Kelas Baru"
          />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Nama Kelas</th>
                    <th className="py-3.5 px-4">Tingkat</th>
                    <th className="py-3.5 px-4">Wali Kelas</th>
                    <th className="py-3.5 px-4">Tahun Ajaran</th>
                    <th className="py-3.5 px-4">Siswa / Kapasitas</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {kelasData.data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{item.nama}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold">
                          Kelas {item.tingkat}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">
                        {item.wali_kelas ? (
                          <span>
                            {item.wali_kelas.gelar_depan ? `${item.wali_kelas.gelar_depan} ` : ''}
                            {item.wali_kelas.nama}
                            {item.wali_kelas.gelar_belakang ? `, ${item.wali_kelas.gelar_belakang}` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {item.tahun_ajaran ? `${item.tahun_ajaran.tahun} (${item.tahun_ajaran.semester})` : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {item.total_siswa || 0}
                          </span>
                          <span className="text-slate-400">/ {item.kapasitas} siswa</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <button
                              onClick={() => handleOpenModal(item)}
                              className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Ubah"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeleteId(item.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={kelasData.page}
              totalPages={kelasData.totalPages}
              totalItems={kelasData.total}
              itemsPerPage={kelasData.limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Ubah Rombongan Belajar' : 'Tambah Rombongan Belajar Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tingkat Kelas
              </label>
              <select
                value={formData.tingkat}
                onChange={(e) => setFormData({ ...formData, tingkat: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
                required
              >
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
                <option value="10">Kelas 10</option>
                <option value="11">Kelas 11</option>
                <option value="12">Kelas 12</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kelas / Rombel
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Contoh: 7-A, 10-MIPA-1"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun Ajaran
            </label>
            <select
              value={formData.tahun_ajaran_id}
              onChange={(e) =>
                setFormData({ ...formData, tahun_ajaran_id: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              required
            >
              {taList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tahun} ({t.semester}) {t.is_active ? '— [AKTIF]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wali Kelas (Opsional)
            </label>
            <select
              value={formData.wali_kelas_id || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  wali_kelas_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">-- Pilih Guru Wali Kelas --</option>
              {guruSimple.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nama} ({g.jabatan})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kapasitas Maksimal Siswa
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={formData.kapasitas}
              onChange={(e) => setFormData({ ...formData, kapasitas: Number(e.target.value) })}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
              required
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 rounded-xl transition-colors cursor-pointer"
            >
              {editingItem ? 'Simpan Perubahan' : 'Tambah'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Rombel Kelas"
        message="Apakah Anda yakin ingin menghapus kelas ini? Kelas yang masih memiliki siswa tidak dapat dihapus."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
