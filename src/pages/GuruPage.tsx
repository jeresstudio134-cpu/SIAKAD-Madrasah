import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { Guru, PaginatedResult } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import { Plus, Edit2, Trash2, Search, Upload, User, Mail, Phone, CheckCircle2 } from 'lucide-react';

export function GuruPage() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const canCreate = hasPermission('guru', 'tambah');
  const canEdit = hasPermission('guru', 'ubah');
  const canDelete = hasPermission('guru', 'hapus');

  // Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedGuru, setSelectedGuru] = useState<Guru | null>(null);
  const [editingItem, setEditingItem] = useState<Guru | null>(null);

  const [formData, setFormData] = useState({
    nip: '',
    nuptk: '',
    nama: '',
    gelar_depan: '',
    gelar_belakang: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    tempat_lahir: '',
    tanggal_lahir: '',
    jabatan: 'Guru Mapel',
    pendidikan_terakhir: 'S1',
    jurusan: '',
    telepon: '',
    email: '',
    status_kepegawaian: 'PNS',
    foto_url: '',
    is_active: true,
  });

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: guruData, isLoading } = useQuery({
    queryKey: ['guru', searchTerm, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get<PaginatedResult<Guru>>(`/api/guru?${params.toString()}`);
      return res.data;
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/guru', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Data guru berhasil ditambahkan.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menambahkan data guru.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      api.put(`/api/guru/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Data guru berhasil diperbarui.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal memperbarui data guru.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/guru/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guru'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Data guru berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus data guru.'),
  });

  const handleOpenModal = (item?: Guru) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nip: item.nip || '',
        nuptk: item.nuptk || '',
        nama: item.nama,
        gelar_depan: item.gelar_depan || '',
        gelar_belakang: item.gelar_belakang || '',
        jenis_kelamin: item.jenis_kelamin,
        tempat_lahir: item.tempat_lahir || '',
        tanggal_lahir: item.tanggal_lahir || '',
        jabatan: item.jabatan,
        pendidikan_terakhir: item.pendidikan_terakhir || 'S1',
        jurusan: item.jurusan || '',
        telepon: item.telepon || '',
        email: item.email || '',
        status_kepegawaian: item.status_kepegawaian,
        foto_url: item.foto_url || '',
        is_active: item.is_active,
      });
    } else {
      setEditingItem(null);
      setFormData({
        nip: '',
        nuptk: '',
        nama: '',
        gelar_depan: '',
        gelar_belakang: '',
        jenis_kelamin: 'L',
        tempat_lahir: '',
        tanggal_lahir: '',
        jabatan: 'Guru Mapel',
        pendidikan_terakhir: 'S1',
        jurusan: '',
        telepon: '',
        email: '',
        status_kepegawaian: 'PNS',
        foto_url: '',
        is_active: true,
      });
    }
    setModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, foto_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      error('Nama guru wajib diisi.');
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
          <h2 className="text-xl font-bold text-slate-800">Guru & Tenaga Kependidikan</h2>
          <p className="text-xs text-slate-500 mt-1">
            Data profil pendidik madrasah, status kepegawaian ASN/GTY, dan jabatan.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambah Guru / Pegawai
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, NIP, atau NUPTK..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full sm:w-auto px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Guru Aktif</option>
            <option value="nonaktif">Non-Aktif</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : !guruData || guruData.data.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Guru"
            description="Belum ada data guru atau tenaga kependidikan yang sesuai dengan pencarian."
            onAction={canCreate ? () => handleOpenModal() : undefined}
            actionText="Tambah Guru Baru"
          />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Nama Lengkap & Foto</th>
                    <th className="py-3.5 px-4">NIP / NUPTK</th>
                    <th className="py-3.5 px-4">Jabatan</th>
                    <th className="py-3.5 px-4">Status Kepegawaian</th>
                    <th className="py-3.5 px-4">Kontak</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {guruData.data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {item.foto_url ? (
                            <img
                              src={item.foto_url}
                              alt={item.nama}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                              {item.nama.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div
                              onClick={() => {
                                setSelectedGuru(item);
                                setDetailModalOpen(true);
                              }}
                              className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                            >
                              {item.gelar_depan ? `${item.gelar_depan} ` : ''}
                              {item.nama}
                              {item.gelar_belakang ? `, ${item.gelar_belakang}` : ''}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} •{' '}
                              {item.pendidikan_terakhir || 'S1'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {item.nip ? (
                          <div>
                            <span className="text-[10px] text-slate-400">NIP: </span>
                            {item.nip}
                          </div>
                        ) : item.nuptk ? (
                          <div>
                            <span className="text-[10px] text-slate-400">NUPTK: </span>
                            {item.nuptk}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-800">{item.jabatan}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                            item.status_kepegawaian === 'PNS'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : item.status_kepegawaian === 'PPPK'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {item.status_kepegawaian}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div>{item.telepon || '-'}</div>
                        <div className="text-[10px] text-slate-400">{item.email || ''}</div>
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
              currentPage={guruData.page}
              totalPages={guruData.totalPages}
              totalItems={guruData.total}
              itemsPerPage={guruData.limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal Detail Guru */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Detail Biodata Guru"
        maxWidth="md"
      >
        {selectedGuru && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              {selectedGuru.foto_url ? (
                <img
                  src={selectedGuru.foto_url}
                  alt={selectedGuru.nama}
                  className="w-16 h-16 rounded-2xl object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-xl">
                  {selectedGuru.nama.charAt(0)}
                </div>
              )}
              <div>
                <h4 className="font-bold text-slate-900 text-base">
                  {selectedGuru.gelar_depan ? `${selectedGuru.gelar_depan} ` : ''}
                  {selectedGuru.nama}
                  {selectedGuru.gelar_belakang ? `, ${selectedGuru.gelar_belakang}` : ''}
                </h4>
                <p className="text-xs text-slate-500">{selectedGuru.jabatan}</p>
                <div className="mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Status: {selectedGuru.status_kepegawaian}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">NIP</span>
                <span className="font-semibold text-slate-800">{selectedGuru.nip || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">NUPTK</span>
                <span className="font-semibold text-slate-800">{selectedGuru.nuptk || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Pendidikan Terakhir</span>
                <span className="font-semibold text-slate-800">
                  {selectedGuru.pendidikan_terakhir || '-'} ({selectedGuru.jurusan || '-'})
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Tempat, Tanggal Lahir</span>
                <span className="font-semibold text-slate-800">
                  {selectedGuru.tempat_lahir || '-'}, {selectedGuru.tanggal_lahir || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Nomor Telepon</span>
                <span className="font-semibold text-slate-800">{selectedGuru.telepon || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Email</span>
                <span className="font-semibold text-slate-800">{selectedGuru.email || '-'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Ubah Data Guru' : 'Tambah Guru / Tenaga Pendidik'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gelar Depan (Opsional)
              </label>
              <input
                type="text"
                value={formData.gelar_depan}
                onChange={(e) => setFormData({ ...formData, gelar_depan: e.target.value })}
                placeholder="Contoh: Ust., Drs., Hj."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Nama tanpa gelar"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gelar Belakang (Opsional)
              </label>
              <input
                type="text"
                value={formData.gelar_belakang}
                onChange={(e) => setFormData({ ...formData, gelar_belakang: e.target.value })}
                placeholder="Contoh: M.Pd.I, S.Pd"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NIP (PNS)</label>
              <input
                type="text"
                value={formData.nip}
                onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                placeholder="18 digit NIP"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">NUPTK</label>
              <input
                type="text"
                value={formData.nuptk}
                onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                placeholder="16 digit NUPTK"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={formData.jenis_kelamin}
                onChange={(e) =>
                  setFormData({ ...formData, jenis_kelamin: e.target.value as 'L' | 'P' })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan</label>
              <input
                type="text"
                value={formData.jabatan}
                onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                placeholder="Guru Mapel / Wali Kelas"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Kepegawaian
              </label>
              <select
                value={formData.status_kepegawaian}
                onChange={(e) => setFormData({ ...formData, status_kepegawaian: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="PNS">PNS / ASN</option>
                <option value="PPPK">PPPK</option>
                <option value="GTY">Guru Tetap Yayasan (GTY)</option>
                <option value="GTT">Guru Tidak Tetap (GTT)</option>
                <option value="Honor">Tenaga Honorer</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pendidikan Terakhir
              </label>
              <select
                value={formData.pendidikan_terakhir}
                onChange={(e) => setFormData({ ...formData, pendidikan_terakhir: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="S1">S1 / Sarjana</option>
                <option value="S2">S2 / Magister</option>
                <option value="S3">S3 / Doktoral</option>
                <option value="D3">D3 / Diploma</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">No. Telepon / WhatsApp</label>
              <input
                type="text"
                value={formData.telepon}
                onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                placeholder="Contoh: 08123456789"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="guru@madrasah.sch.id"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Foto Upload & Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Foto Profil Guru
            </label>
            <div className="flex items-center gap-4">
              {formData.foto_url ? (
                <img
                  src={formData.foto_url}
                  alt="Preview"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <User className="w-6 h-6" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Format JPG, PNG atau WebP maksimal 2MB.
                </p>
              </div>
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
              {editingItem ? 'Simpan Perubahan' : 'Tambah Guru'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Data Guru"
        message="Apakah Anda yakin ingin menghapus data guru ini?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
