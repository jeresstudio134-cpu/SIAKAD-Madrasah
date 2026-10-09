import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { Mapel, PaginatedResult } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { Plus, Edit2, Trash2, Search, BookOpen, Clock, Award } from 'lucide-react';

export function MapelPage() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const canCreate = hasPermission('mapel', 'tambah');
  const canEdit = hasPermission('mapel', 'ubah');
  const canDelete = hasPermission('mapel', 'hapus');

  // Filter & Pagination State
  const [kelompokFilter, setKelompokFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Mapel | null>(null);
  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    kelompok: 'PAI' as 'PAI' | 'Umum' | 'Muatan Lokal',
    kkm: 75,
    jam_pelajaran: 2,
    tingkat: 'Semua',
  });

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: mapelData, isLoading } = useQuery({
    queryKey: ['mapel', kelompokFilter, searchTerm, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (kelompokFilter) params.append('kelompok', kelompokFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get<PaginatedResult<Mapel>>(`/api/mapel?${params.toString()}`);
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/mapel', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapel'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Mata pelajaran berhasil ditambahkan.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menambahkan mata pelajaran.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      api.put(`/api/mapel/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapel'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Mata pelajaran berhasil diperbarui.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal memperbarui mata pelajaran.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/mapel/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapel'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Mata pelajaran berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus mata pelajaran.'),
  });

  const handleOpenModal = (item?: Mapel) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        kode: item.kode,
        nama: item.nama,
        kelompok: item.kelompok,
        kkm: item.kkm,
        jam_pelajaran: item.jam_pelajaran,
        tingkat: item.tingkat || 'Semua',
      });
    } else {
      setEditingItem(null);
      setFormData({
        kode: '',
        nama: '',
        kelompok: 'PAI',
        kkm: 75,
        jam_pelajaran: 2,
        tingkat: 'Semua',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.kode.trim() || !formData.nama.trim()) {
      error('Kode dan Nama mata pelajaran wajib diisi.');
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
          <h2 className="text-xl font-bold text-slate-800">Mata Pelajaran (Mapel)</h2>
          <p className="text-xs text-slate-500 mt-1">
            Struktur kurikulum madrasah meliputi rumpun PAI Kemenag dan kurikulum umum nasional.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Mata Pelajaran
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
            placeholder="Cari kode atau nama mapel..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={kelompokFilter}
            onChange={(e) => {
              setKelompokFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
          >
            <option value="">Semua Kelompok Mapel</option>
            <option value="PAI">PAI Kemenag (Al-Qur'an Hadis, Akidah Akhlak, dll)</option>
            <option value="Umum">Mata Pelajaran Umum</option>
            <option value="Muatan Lokal">Muatan Lokal</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : !mapelData || mapelData.data.length === 0 ? (
          <EmptyState
            title="Tidak Ada Mata Pelajaran"
            description="Belum ada data mata pelajaran yang cocok dengan filter."
            onAction={canCreate ? () => handleOpenModal() : undefined}
            actionText="Tambah Mata Pelajaran"
          />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Kode</th>
                    <th className="py-3.5 px-4">Nama Mata Pelajaran</th>
                    <th className="py-3.5 px-4">Kelompok</th>
                    <th className="py-3.5 px-4">KKM</th>
                    <th className="py-3.5 px-4">Beban Jam</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {mapelData.data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        {item.kode}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{item.nama}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                            item.kelompok === 'PAI'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : item.kelompok === 'Umum'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.kelompok === 'PAI' ? '🕌 PAI Madrasah' : item.kelompok}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          <Award className="w-3.5 h-3.5" />
                          <span>{item.kkm}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.jam_pelajaran} JP / minggu</span>
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
              currentPage={mapelData.page}
              totalPages={mapelData.totalPages}
              totalItems={mapelData.total}
              itemsPerPage={mapelData.limit}
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
        title={editingItem ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Mapel
              </label>
              <input
                type="text"
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                placeholder="Contoh: QH-01, MAT-01"
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kelompok Kurikulum
              </label>
              <select
                value={formData.kelompok}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    kelompok: e.target.value as 'PAI' | 'Umum' | 'Muatan Lokal',
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
                required
              >
                <option value="PAI">PAI Kemenag</option>
                <option value="Umum">Kurikulum Umum</option>
                <option value="Muatan Lokal">Muatan Lokal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Mata Pelajaran
            </label>
            <input
              type="text"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Contoh: Al-Qur'an Hadis, Fikih, Matematika"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nilai KKM (0 - 100)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.kkm}
                onChange={(e) => setFormData({ ...formData, kkm: Number(e.target.value) })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Beban Jam (JP / Minggu)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.jam_pelajaran}
                onChange={(e) =>
                  setFormData({ ...formData, jam_pelajaran: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
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
        title="Hapus Mata Pelajaran"
        message="Apakah Anda yakin ingin menghapus mata pelajaran ini?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
