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
  CalendarDays,
  Plus,
  Calendar,
  Clock,
  Sparkles,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  Tag,
} from 'lucide-react';
import { KalenderAkademik, TahunAjaran } from '../../types';

export function KalenderAkademikPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedBulan, setSelectedBulan] = useState('semua');
  const [selectedTipe, setSelectedTipe] = useState('semua');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KalenderAkademik | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form State
  const [form, setForm] = useState({
    judul_kegiatan: '',
    deskripsi: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    tipe_kegiatan: 'KBM' as KalenderAkademik['tipe_kegiatan'],
    warna: 'emerald',
    tahun_ajaran_id: 1,
  });

  const canManage =
    user?.role === 'admin' ||
    user?.role === 'staf' ||
    Boolean(user?.permissions?.some((p) => p.module === 'kalender' && p.can_create));

  // Query Tahun Ajaran Aktif
  const { data: taList = [] } = useQuery({
    queryKey: ['ta-list-calendar'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });
  const activeTa = taList.find((t) => t.is_active) || taList[0];

  // Query Kalender
  const { data: rawKalenderList = [], isLoading } = useQuery({
    queryKey: ['kalender-list', search, activeTa?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (activeTa?.id) params.append('tahun_ajaran_id', String(activeTa.id));

      const res = await api.get<KalenderAkademik[]>(`/api/kalender?${params.toString()}`);
      return res.data || [];
    },
  });

  // Filter bulanan & tipe
  const kalenderList = rawKalenderList.filter((k) => {
    if (selectedBulan !== 'semua') {
      const monthStr = k.tanggal_mulai.slice(5, 7);
      if (monthStr !== selectedBulan) return false;
    }
    if (selectedTipe !== 'semua' && k.tipe_kegiatan !== selectedTipe) {
      return false;
    }
    return true;
  });

  // Mutation Save
  const saveMutation = useMutation({
    mutationFn: (data: typeof form) => {
      if (editingItem) {
        return api.put(`/api/kalender/${editingItem.id}`, data);
      }
      return api.post('/api/kalender', data);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['kalender-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success(res.message || 'Agenda kalender akademik berhasil disimpan.');
      setIsModalOpen(false);
      setEditingItem(null);
    },
    onError: (err: any) => toastError(err.message || 'Gagal menyimpan agenda.'),
  });

  // Mutation Delete
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/kalender/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kalender-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Agenda kalender berhasil dihapus.');
      setDeletingId(null);
    },
    onError: (err: any) => toastError(err.message || 'Gagal menghapus agenda.'),
  });

  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      judul_kegiatan: '',
      deskripsi: '',
      tanggal_mulai: new Date().toISOString().slice(0, 10),
      tanggal_selesai: new Date().toISOString().slice(0, 10),
      tipe_kegiatan: 'KBM',
      warna: 'emerald',
      tahun_ajaran_id: activeTa?.id || 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: KalenderAkademik) => {
    setEditingItem(item);
    setForm({
      judul_kegiatan: item.judul_kegiatan,
      deskripsi: item.deskripsi || '',
      tanggal_mulai: item.tanggal_mulai,
      tanggal_selesai: item.tanggal_selesai,
      tipe_kegiatan: item.tipe_kegiatan,
      warna: item.warna,
      tahun_ajaran_id: item.tahun_ajaran_id,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.judul_kegiatan.trim() || !form.tanggal_mulai) {
      toastError('Judul kegiatan dan tanggal mulai wajib diisi.');
      return;
    }
    saveMutation.mutate(form);
  };

  const getTipeBadgeClass = (tipe: string) => {
    switch (tipe) {
      case 'Libur Nasional':
      case 'Libur Semester':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Ujian':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'PPDB':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'Ekstrakurikuler':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Rapat':
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
            <CalendarDays className="w-4 h-4" />
            <span>Manajemen Jadwal & Agenda</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
            Kalender Akademik Madrasah
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Jadwal kegiatan pembelajaran, penilaian (PTS/PAS), hari libur nasional, dan agenda madrasah tahun ajaran {activeTa?.tahun || '-'}.
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" /> Tambah Agenda Kegiatan
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama kegiatan atau agenda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 focus:outline-emerald-600 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedBulan}
            onChange={(e) => setSelectedBulan(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
          >
            <option value="semua">Semua Bulan</option>
            <option value="07">Juli</option>
            <option value="08">Agustus</option>
            <option value="09">September</option>
            <option value="10">Oktober</option>
            <option value="11">November</option>
            <option value="12">Desember</option>
            <option value="01">Januari</option>
            <option value="02">Februari</option>
            <option value="03">Maret</option>
            <option value="04">April</option>
            <option value="05">Mei</option>
            <option value="06">Juni</option>
          </select>

          <select
            value={selectedTipe}
            onChange={(e) => setSelectedTipe(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
          >
            <option value="semua">Semua Tipe Kegiatan</option>
            <option value="KBM">KBM / Pembelajaran</option>
            <option value="Ujian">Ujian (PTS / PAS / Asesmen)</option>
            <option value="Libur Nasional">Libur Nasional</option>
            <option value="PPDB">PPDB (Admisi Santri)</option>
            <option value="Rapat">Rapat / Penerimaan Rapor</option>
            <option value="Ekstrakurikuler">Ekstrakurikuler / Hari Santri</option>
          </select>
        </div>
      </div>

      {/* Events Timeline / List */}
      {isLoading ? (
        <div className="p-6 bg-white rounded-2xl border border-slate-200">
          <TableSkeleton rows={4} cols={4} />
        </div>
      ) : kalenderList.length === 0 ? (
        <EmptyState
          title="Tidak Ada Agenda Kegiatan"
          description="Belum ada agenda kalender akademik yang terdaftar untuk filter ini."
          actionText={canManage ? 'Tambah Agenda Baru' : undefined}
          onAction={canManage ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kalenderList.map((item) => {
            const startD = new Date(item.tanggal_mulai);
            const dayNum = startD.getDate();
            const monthName = startD.toLocaleDateString('id-ID', { month: 'short' });
            const isRange = item.tanggal_selesai && item.tanggal_selesai !== item.tanggal_mulai;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-start gap-4 hover:shadow-md transition-shadow"
              >
                {/* Date Block */}
                <div className="flex flex-col items-center justify-center w-14 h-16 rounded-2xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 shrink-0">
                  <span className="text-xs font-bold uppercase">{monthName}</span>
                  <span className="text-xl font-black">{dayNum}</span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTipeBadgeClass(
                        item.tipe_kegiatan
                      )}`}
                    >
                      {item.tipe_kegiatan}
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingId(item.id)}
                          className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm leading-tight truncate">
                    {item.judul_kegiatan}
                  </h3>

                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      {item.tanggal_mulai}
                      {isRange ? ` s.d. ${item.tanggal_selesai}` : ''}
                    </span>
                  </div>

                  {item.deskripsi && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {item.deskripsi}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form Tambah / Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Agenda Kalender' : 'Tambah Agenda Kalender Akademik'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nama Kegiatan / Agenda <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Penilaian Akhir Semester (PAS) Ganjil"
              value={form.judul_kegiatan}
              onChange={(e) => setForm({ ...form, judul_kegiatan: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.tanggal_mulai}
                onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal Selesai</label>
              <input
                type="date"
                value={form.tanggal_selesai}
                onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tipe Kegiatan</label>
              <select
                value={form.tipe_kegiatan}
                onChange={(e) => setForm({ ...form, tipe_kegiatan: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
              >
                <option value="KBM">KBM / Pembelajaran</option>
                <option value="Ujian">Ujian (PTS/PAS/Asesmen)</option>
                <option value="Libur Nasional">Libur Nasional</option>
                <option value="Libur Semester">Libur Semester</option>
                <option value="PPDB">PPDB (Admisi Santri)</option>
                <option value="Rapat">Rapat / Penerimaan Rapor</option>
                <option value="Ekstrakurikuler">Ekstrakurikuler</option>
                <option value="Lainnya">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Aksen Warna Badge</label>
              <select
                value={form.warna}
                onChange={(e) => setForm({ ...form, warna: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 font-semibold"
              >
                <option value="emerald">Hijau (KBM/Rutin)</option>
                <option value="rose">Merah (Libur)</option>
                <option value="amber">Kuning (Ujian)</option>
                <option value="blue">Biru (Kegiatan)</option>
                <option value="purple">Ungu (Rapat)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Keterangan / Deskripsi</label>
            <textarea
              rows={3}
              placeholder="Rincian agenda atau catatan pelaksanaan..."
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 leading-relaxed"
            />
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
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Agenda'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog Hapus */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={() => deletingId && deleteMutation.mutate(deletingId)}
        title="Hapus Agenda Kalender"
        message="Apakah Anda yakin ingin menghapus agenda kegiatan ini?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
