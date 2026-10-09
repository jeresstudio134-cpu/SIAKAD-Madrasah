import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { JenisPembayaran, Kelas, TahunAjaran } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Layers,
  Banknote,
  Tag,
} from 'lucide-react';

export function JenisPembayaranPage() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('keuangan', 'ubah') || hasPermission('keuangan', 'tambah');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<JenisPembayaran | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    tipe: 'bulanan' as 'bulanan' | 'bebas',
    deskripsi: '',
    tahun_ajaran_id: '1',
    is_active: true,
    tarifTingkat: {
      '7': 250000,
      '8': 250000,
      '9': 275000,
      'Semua': 0,
    },
  });

  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: taList = [] } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });

  const activeTa = taList.find((t) => t.is_active) || taList[0];

  const { data: jenisList = [], isLoading } = useQuery({
    queryKey: ['jenis-pembayaran', activeTa?.id],
    queryFn: async () => {
      const res = await api.get<JenisPembayaran[]>(
        `/api/keuangan/jenis?tahun_ajaran_id=${activeTa?.id || ''}`
      );
      return res.data || [];
    },
    enabled: Boolean(activeTa),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/keuangan/jenis', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jenis-pembayaran'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-keuangan'] });
      success('Jenis pembayaran berhasil ditambahkan.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menambahkan jenis pembayaran.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.put(`/api/keuangan/jenis/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jenis-pembayaran'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-keuangan'] });
      success('Jenis pembayaran berhasil diperbarui.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal memperbarui jenis pembayaran.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/keuangan/jenis/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jenis-pembayaran'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-keuangan'] });
      success('Jenis pembayaran berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus jenis pembayaran.'),
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      nama: '',
      tipe: 'bulanan',
      deskripsi: '',
      tahun_ajaran_id: String(activeTa?.id || '1'),
      is_active: true,
      tarifTingkat: {
        '7': 250000,
        '8': 250000,
        '9': 275000,
        'Semua': 0,
      },
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (item: JenisPembayaran) => {
    setEditingItem(item);
    const existingTarif: any = { '7': 0, '8': 0, '9': 0, 'Semua': 0 };
    if (item.tarifList) {
      item.tarifList.forEach((t) => {
        if (t.tingkat) existingTarif[t.tingkat] = Number(t.nominal);
      });
    }
    setFormData({
      nama: item.nama,
      tipe: item.tipe,
      deskripsi: item.deskripsi || '',
      tahun_ajaran_id: String(item.tahun_ajaran_id),
      is_active: item.is_active,
      tarifTingkat: existingTarif,
    });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      error('Nama jenis pembayaran wajib diisi.');
      return;
    }

    const tarifListPayload = [
      { tingkat: '7', kelas_id: null, nominal: Number(formData.tarifTingkat['7']) || 0 },
      { tingkat: '8', kelas_id: null, nominal: Number(formData.tarifTingkat['8']) || 0 },
      { tingkat: '9', kelas_id: null, nominal: Number(formData.tarifTingkat['9']) || 0 },
    ];

    if (formData.tarifTingkat['Semua'] > 0) {
      tarifListPayload.push({
        tingkat: 'Semua',
        kelas_id: null,
        nominal: Number(formData.tarifTingkat['Semua']) || 0,
      });
    }

    const payload = {
      nama: formData.nama.trim(),
      tipe: formData.tipe,
      deskripsi: formData.deskripsi.trim() || null,
      tahun_ajaran_id: Number(formData.tahun_ajaran_id),
      is_active: formData.is_active,
      tarifList: tarifListPayload,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Pos & Jenis Pembayaran Madrasah
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi pos pembayaran (SPP bulanan, uang gedung, seragam) beserta tarif baku per jenjang kelas.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Jenis Pembayaran
          </button>
        )}
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={5} />
          </div>
        ) : jenisList.length === 0 ? (
          <EmptyState
            title="Belum Ada Jenis Pembayaran"
            description="Tambahkan jenis pembayaran baru untuk mulai membuat tagihan siswa."
            actionLabel={canEdit ? 'Tambah Sekarang' : undefined}
            onAction={canEdit ? handleOpenAdd : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                  <th className="py-3 px-4">Nama Pos Pembayaran</th>
                  <th className="py-3 px-4">Tipe Pembayaran</th>
                  <th className="py-3 px-4">Tarif per Tingkat</th>
                  <th className="py-3 px-4">Deskripsi / Keterangan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jenisList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                          <Banknote className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{item.nama}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: #{item.id}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          item.tipe === 'bulanan'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {item.tipe === 'bulanan' ? 'Bulanan (SPP)' : 'Bebas / Sekali Bayar'}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="space-y-1 font-mono text-[11px]">
                        {item.tarifList && item.tarifList.length > 0 ? (
                          item.tarifList.map((t, idx) => (
                            <div key={idx} className="text-slate-700">
                              <span className="text-slate-400 font-sans">
                                Tingkat {t.tingkat}:{' '}
                              </span>
                              <span className="font-semibold text-slate-900">
                                Rp {Number(t.nominal).toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Belum diatur</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-600 max-w-xs">
                      {item.deskripsi || '-'}
                    </td>

                    <td className="py-3 px-4 text-center">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                          <CheckCircle className="w-3 h-3" /> Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          <XCircle className="w-3 h-3" /> Nonaktif
                        </span>
                      )}
                    </td>

                    {canEdit && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Jenis & Tarif"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Form Tambah / Edit */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Pos & Tarif Pembayaran' : 'Tambah Jenis Pembayaran Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Pos Pembayaran <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: SPP Bulanan, Uang Gedung, Seragam"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipe Pembayaran
              </label>
              <select
                value={formData.tipe}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipe: e.target.value as 'bulanan' | 'bebas',
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="bulanan">Bulanan (SPP per bulan)</option>
                <option value="bebas">Bebas / Sekali Bayar (bisa cicil)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tahun Ajaran
              </label>
              <select
                value={formData.tahun_ajaran_id}
                onChange={(e) => setFormData({ ...formData, tahun_ajaran_id: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                {taList.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.tahun} ({t.semester}) {t.is_active ? '— Aktif' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Keterangan / Deskripsi
            </label>
            <textarea
              rows={2}
              placeholder="Rincian pos keuangan..."
              value={formData.deskripsi}
              onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          {/* Pengaturan Tarif per Tingkat */}
          <div className="pt-2 border-t border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              Pengaturan Tarif Baku (Rupiah)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Tingkat 7 (Kelas 7)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.tarifTingkat['7']}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tarifTingkat: {
                        ...formData.tarifTingkat,
                        '7': Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Tingkat 8 (Kelas 8)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.tarifTingkat['8']}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tarifTingkat: {
                        ...formData.tarifTingkat,
                        '8': Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-600 mb-1">
                  Tingkat 9 (Kelas 9)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.tarifTingkat['9']}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tarifTingkat: {
                        ...formData.tarifTingkat,
                        '9': Number(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="isActiveCheck" className="text-xs font-semibold text-slate-700">
              Pos Pembayaran Aktif Digunakan
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {editingItem ? 'Simpan Perubahan' : 'Tambahkan Pos'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Jenis Pembayaran"
        message="Apakah Anda yakin ingin menghapus pos pembayaran ini? Tindakan ini hanya dapat dilakukan jika belum ada tagihan yang diterbitkan."
        confirmLabel="Hapus Pos"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
