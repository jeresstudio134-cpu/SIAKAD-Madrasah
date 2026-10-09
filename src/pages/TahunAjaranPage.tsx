import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { TahunAjaran } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Plus, Edit2, Trash2, CheckCircle2, Calendar, ShieldCheck } from 'lucide-react';

export function TahunAjaranPage() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const canCreate = hasPermission('tahun_ajaran', 'tambah');
  const canEdit = hasPermission('tahun_ajaran', 'ubah');
  const canDelete = hasPermission('tahun_ajaran', 'hapus');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TahunAjaran | null>(null);
  const [formData, setFormData] = useState({
    tahun: '2024/2025',
    semester: 'Ganjil' as 'Ganjil' | 'Genap',
    is_active: false,
    tanggal_mulai: '',
    tanggal_selesai: '',
  });

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: list = [], isLoading } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/tahun-ajaran', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tahun-ajaran'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Tahun ajaran berhasil ditambahkan.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menambahkan tahun ajaran.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      api.put(`/api/tahun-ajaran/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tahun-ajaran'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Tahun ajaran berhasil diperbarui.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal memperbarui tahun ajaran.'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/tahun-ajaran/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tahun-ajaran'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Tahun ajaran aktif berhasil diubah.');
    },
    onError: (err: any) => error(err.message || 'Gagal mengaktifkan tahun ajaran.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/tahun-ajaran/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tahun-ajaran'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Tahun ajaran berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus tahun ajaran.'),
  });

  const handleOpenModal = (item?: TahunAjaran) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        tahun: item.tahun,
        semester: item.semester,
        is_active: item.is_active,
        tanggal_mulai: item.tanggal_mulai || '',
        tanggal_selesai: item.tanggal_selesai || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        tahun: '2025/2026',
        semester: 'Ganjil',
        is_active: false,
        tanggal_mulai: '',
        tanggal_selesai: '',
      });
    }
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Tahun Ajaran & Semester</h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola periode akademik madrasah. Hanya satu periode yang dapat berstatus aktif.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Tahun Ajaran
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title="Belum Ada Tahun Ajaran"
            description="Tambahkan tahun ajaran baru untuk mengaktifkan periode pembelajaran."
            onAction={canCreate ? () => handleOpenModal() : undefined}
            actionText="Tambah Tahun Ajaran"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Tahun Ajaran</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4">Rentang Tanggal</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.tahun}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                        Semester {item.semester}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {item.tanggal_mulai && item.tanggal_selesai
                        ? `${item.tanggal_mulai} s.d. ${item.tanggal_selesai}`
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs text-slate-500 bg-slate-100">
                          Non-Aktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!item.is_active && canEdit && (
                          <button
                            onClick={() => activateMutation.mutate(item.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                            title="Aktifkan tahun ajaran ini"
                          >
                            Set Aktif
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Ubah"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && !item.is_active && (
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
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Ubah Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tahun Ajaran (Format: YYYY/YYYY)
            </label>
            <input
              type="text"
              value={formData.tahun}
              onChange={(e) => setFormData({ ...formData, tahun: e.target.value })}
              placeholder="Contoh: 2024/2025"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Semester</label>
            <select
              value={formData.semester}
              onChange={(e) =>
                setFormData({ ...formData, semester: e.target.value as 'Ganjil' | 'Genap' })
              }
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="Ganjil">Semester Ganjil</option>
              <option value="Genap">Semester Genap</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Mulai (Opsional)
              </label>
              <input
                type="date"
                value={formData.tanggal_mulai}
                onChange={(e) => setFormData({ ...formData, tanggal_mulai: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Selesai (Opsional)
              </label>
              <input
                type="date"
                value={formData.tanggal_selesai}
                onChange={(e) => setFormData({ ...formData, tanggal_selesai: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="is_active_checkbox" className="text-xs text-slate-700 cursor-pointer">
              Jadikan sebagai tahun ajaran aktif sekarang
            </label>
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Tahun Ajaran"
        message="Apakah Anda yakin ingin menghapus tahun ajaran ini? Tindakan ini tidak dapat dibatalkan."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
