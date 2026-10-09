import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Bell,
  Plus,
  Pin,
  Calendar,
  Users,
  Tag,
  Edit2,
  Trash2,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Pengumuman } from '../../types';

export function PengumumanPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedKategori, setSelectedKategori] = useState('semua');
  const [selectedAudiens, setSelectedAudiens] = useState('semua');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Pengumuman | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form State
  const [form, setForm] = useState({
    judul: '',
    konten: '',
    kategori: 'Umum' as 'Umum' | 'Akademik' | 'Keuangan' | 'Kegiatan' | 'Penting',
    target_audiens: 'Semua' as 'Semua' | 'Guru' | 'Siswa' | 'Staf',
    is_pinned: false,
    is_published: true,
  });

  const canManage =
    user?.role === 'admin' ||
    user?.role === 'staf' ||
    Boolean(user?.permissions?.some((p) => p.module === 'pengumuman' && p.can_create));

  // Query Pengumuman
  const { data: pengumumanList = [], isLoading } = useQuery({
    queryKey: ['pengumuman-list', search, selectedKategori, selectedAudiens],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedKategori !== 'semua') params.append('kategori', selectedKategori);
      if (selectedAudiens !== 'semua') params.append('target_audiens', selectedAudiens);

      const res = await api.get<Pengumuman[]>(`/api/pengumuman?${params.toString()}`);
      return res.data || [];
    },
  });

  // Mutation Create / Update
  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
      if (editingItem) {
        return api.put(`/api/pengumuman/${editingItem.id}`, data);
      }
      return api.post('/api/pengumuman', data);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['pengumuman-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success(res.message || 'Pengumuman berhasil disimpan.');
      setIsModalOpen(false);
      setEditingItem(null);
    },
    onError: (err: any) => toastError(err.message || 'Gagal menyimpan pengumuman.'),
  });

  // Mutation Delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/pengumuman/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengumuman-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Pengumuman berhasil dihapus.');
      setDeletingId(null);
    },
    onError: (err: any) => toastError(err.message || 'Gagal menghapus pengumuman.'),
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      judul: '',
      konten: '',
      kategori: 'Umum',
      target_audiens: 'Semua',
      is_pinned: false,
      is_published: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Pengumuman) => {
    setEditingItem(item);
    setForm({
      judul: item.judul,
      konten: item.konten,
      kategori: item.kategori,
      target_audiens: item.target_audiens,
      is_pinned: item.is_pinned,
      is_published: item.is_published,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul.trim() || !form.konten.trim()) {
      toastError('Judul dan konten pengumuman wajib diisi.');
      return;
    }
    saveMutation.mutate(form);
  };

  const getKategoriBadge = (kategori: string) => {
    switch (kategori) {
      case 'Penting':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Akademik':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Keuangan':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Kegiatan':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <Bell className="w-4 h-4" />
            <span>Pusat Informasi & Edaran</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
            Pengumuman Madrasah
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Publikasi agenda penting, surat edaran, dan pengumuman resmi sivitas akademika madrasah.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Terbitkan Pengumuman
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari judul pengumuman atau kata kunci..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedKategori}
            onChange={(e) => setSelectedKategori(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
          >
            <option value="semua">Semua Kategori</option>
            <option value="Penting">Penting</option>
            <option value="Akademik">Akademik</option>
            <option value="Keuangan">Keuangan</option>
            <option value="Kegiatan">Kegiatan</option>
            <option value="Umum">Umum</option>
          </select>

          <select
            value={selectedAudiens}
            onChange={(e) => setSelectedAudiens(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
          >
            <option value="semua">Semua Target</option>
            <option value="Semua">Untuk Semua</option>
            <option value="Guru">Khusus Guru</option>
            <option value="Siswa">Siswa & Wali</option>
            <option value="Staf">Internal Staf</option>
          </select>
        </div>
      </div>

      {/* Cards List */}
      {isLoading ? (
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <TableSkeleton rows={4} cols={3} />
        </div>
      ) : pengumumanList.length === 0 ? (
        <EmptyState
          title="Belum Ada Pengumuman"
          description="Tidak ada pengumuman yang sesuai dengan kriteria filter saat ini."
          actionText={canManage ? 'Terbitkan Pengumuman' : undefined}
          onAction={canManage ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pengumumanList.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                item.is_pinned ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200' : 'border-slate-200/80'
              }`}
            >
              <div>
                {/* Meta Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getKategoriBadge(
                        item.kategori
                      )}`}
                    >
                      {item.kategori}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                      Target: {item.target_audiens}
                    </span>
                  </div>

                  {item.is_pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">
                      <Pin className="w-3 h-3 fill-amber-700" /> Disematkan
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {item.judul}
                </h3>

                <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-line">
                  {item.konten}
                </p>
              </div>

              {/* Bottom Footer Info & Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Baru saja'}
                  </span>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-700 transition-colors cursor-pointer"
                      title="Edit Pengumuman"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingId(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Hapus Pengumuman"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Tambah / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Pengumuman' : 'Terbitkan Pengumuman Baru'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Judul Pengumuman <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Jadwal Libur Awal Ramadhan 1446 H"
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kategori</label>
              <select
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
              >
                <option value="Umum">Umum</option>
                <option value="Penting">Penting</option>
                <option value="Akademik">Akademik</option>
                <option value="Keuangan">Keuangan</option>
                <option value="Kegiatan">Kegiatan</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Audiens</label>
              <select
                value={form.target_audiens}
                onChange={(e) => setForm({ ...form, target_audiens: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
              >
                <option value="Semua">Semua (Publik & Warga Madrasah)</option>
                <option value="Guru">Khusus Guru / Pendidik</option>
                <option value="Siswa">Khusus Siswa & Orang Tua</option>
                <option value="Staf">Khusus Staf Administrasi</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Isi Konten Pengumuman <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={5}
              required
              placeholder="Tuliskan isi pengumuman atau instruksi dengan jelas..."
              value={form.konten}
              onChange={(e) => setForm({ ...form, konten: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 leading-relaxed"
            />
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Sematkan di Atas (Pin)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Terbitkan Langsung</span>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-xl font-bold shadow-md cursor-pointer"
            >
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Pengumuman'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog Hapus */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Hapus Pengumuman"
        message="Apakah Anda yakin ingin menghapus pengumuman ini? Tindakan ini tidak dapat dibatalkan."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
