import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { Siswa, Kelas, PaginatedResult } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Pagination } from '../components/ui/Pagination';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Download,
  UploadCloud,
  FileSpreadsheet,
  GraduationCap,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

export function SiswaPage() {
  const { hasPermission } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const canCreate = hasPermission('siswa', 'tambah');
  const canEdit = hasPermission('siswa', 'ubah');
  const canDelete = hasPermission('siswa', 'hapus');

  // Filter & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState<Siswa | null>(null);
  const [editingItem, setEditingItem] = useState<Siswa | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nis: '',
    nisn: '',
    nama: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    tempat_lahir: '',
    tanggal_lahir: '',
    kelas_id: null as number | null,
    nama_ayah: '',
    nama_ibu: '',
    nama_wali: '',
    pekerjaan_ortu: '',
    telepon_ortu: '',
    alamat: '',
    status: 'aktif' as 'aktif' | 'lulus' | 'pindah',
    foto_url: '',
  });

  // Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    importedCount?: number;
    skippedCount?: number;
    errors?: string[];
  } | null>(null);

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: siswaData, isLoading } = useQuery({
    queryKey: ['siswa', searchTerm, kelasFilter, statusFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (kelasFilter) params.append('kelas_id', kelasFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get<PaginatedResult<Siswa>>(`/api/siswa?${params.toString()}`);
      return res.data;
    },
  });

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-simple'],
    queryFn: async () => {
      const res = await api.get<any[]>('/api/kelas/simple');
      return res.data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/siswa', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Data siswa berhasil ditambahkan.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menambahkan data siswa.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      api.put(`/api/siswa/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Data siswa berhasil diperbarui.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal memperbarui data siswa.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/siswa/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success('Data siswa berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus data siswa.'),
  });

  const handleOpenModal = (item?: Siswa) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nis: item.nis,
        nisn: item.nisn,
        nama: item.nama,
        jenis_kelamin: item.jenis_kelamin,
        tempat_lahir: item.tempat_lahir || '',
        tanggal_lahir: item.tanggal_lahir || '',
        kelas_id: item.kelas_id,
        nama_ayah: item.nama_ayah || '',
        nama_ibu: item.nama_ibu || '',
        nama_wali: item.nama_wali || '',
        pekerjaan_ortu: item.pekerjaan_ortu || '',
        telepon_ortu: item.telepon_ortu || '',
        alamat: item.alamat || '',
        status: item.status,
        foto_url: item.foto_url || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        nis: '',
        nisn: '',
        nama: '',
        jenis_kelamin: 'L',
        tempat_lahir: '',
        tanggal_lahir: '',
        kelas_id: kelasList[0]?.id || null,
        nama_ayah: '',
        nama_ibu: '',
        nama_wali: '',
        pekerjaan_ortu: '',
        telepon_ortu: '',
        alamat: '',
        status: 'aktif',
        foto_url: '',
      });
    }
    setModalOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (!formData.nis.trim() || !formData.nisn.trim() || !formData.nama.trim()) {
      error('NIS, NISN, dan Nama Siswa wajib diisi.');
      return;
    }
    if (formData.nisn.length !== 10) {
      error('NISN harus 10 digit angka.');
      return;
    }
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Export to Excel Download
  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (kelasFilter) params.append('kelas_id', kelasFilter);
    if (statusFilter) params.append('status', statusFilter);

    const token = localStorage.getItem('siakad_token');
    const url = `/api/siswa/export?${params.toString()}`;

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Data_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Memulai unduh file Excel data siswa...');
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/api/siswa/template';
    link.setAttribute('download', 'Template_Impor_Siswa.xlsx');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Template impor Excel berhasil diunduh.');
  };

  // Process Excel / CSV Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      warning('Silakan pilih berkas Excel (.xlsx) atau CSV.');
      return;
    }

    try {
      setIsImporting(true);
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet);

      if (jsonRows.length === 0) {
        error('Berkas Excel tidak memiliki data baris siswa.');
        setIsImporting(false);
        return;
      }

      const res = await api.post('/api/siswa/import', { rows: jsonRows });
      if (res.success) {
        setImportResult(res.data);
        queryClient.invalidateQueries({ queryKey: ['siswa'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        success(`Berhasil mengimpor ${res.data.importedCount} data siswa!`);
      }
    } catch (err: any) {
      error(err.message || 'Gagal memproses berkas impor.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Data Induk Siswa</h2>
          <p className="text-xs text-slate-500 mt-1">
            Data kesiswaan madrasah, NIS, NISN, rombel, orang tua/wali, serta status kesiswaan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export Button */}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Ekspor Excel
          </button>

          {/* Import Button */}
          {canCreate && (
            <button
              onClick={() => {
                setImportFile(null);
                setImportResult(null);
                setImportModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <UploadCloud className="w-4 h-4 text-amber-600" />
              Impor Excel/CSV
            </button>
          )}

          {/* Add Student Button */}
          {canCreate && (
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambah Siswa
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, NIS, atau NISN..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={kelasFilter}
            onChange={(e) => {
              setKelasFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
          >
            <option value="">Semua Kelas</option>
            {kelasList.map((k) => (
              <option key={k.id} value={k.id}>
                Kelas {k.nama}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
          >
            <option value="">Semua Status</option>
            <option value="aktif">Aktif</option>
            <option value="lulus">Lulus</option>
            <option value="pindah">Pindah</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={6} />
          </div>
        ) : !siswaData || siswaData.data.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Siswa"
            description="Belum ada data siswa yang cocok dengan filter atau kata kunci."
            onAction={canCreate ? () => handleOpenModal() : undefined}
            actionText="Tambah Siswa Baru"
          />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Nama Lengkap & Foto</th>
                    <th className="py-3.5 px-4">NIS / NISN</th>
                    <th className="py-3.5 px-4">Kelas</th>
                    <th className="py-3.5 px-4">L/P</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Kontak Ortu</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {siswaData.data.map((item) => (
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
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold text-xs">
                              {item.nama.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div
                              onClick={() => {
                                setSelectedSiswa(item);
                                setDetailModalOpen(true);
                              }}
                              className="font-bold text-slate-900 hover:text-emerald-700 cursor-pointer"
                            >
                              {item.nama}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {item.tempat_lahir || '-'}, {item.tanggal_lahir || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        <div className="font-semibold text-slate-900">{item.nis}</div>
                        <div className="text-[10px] text-slate-400">NISN: {item.nisn}</div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        {item.kelas ? (
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800">
                            Kelas {item.kelas.nama}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            item.jenis_kelamin === 'L'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            item.status === 'aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'lulus'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div>{item.telepon_ortu || '-'}</div>
                        <div className="text-[10px] text-slate-400">
                          Ayah: {item.nama_ayah || '-'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedSiswa(item);
                              setDetailModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
              currentPage={siswaData.page}
              totalPages={siswaData.totalPages}
              totalItems={siswaData.total}
              itemsPerPage={siswaData.limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>

      {/* Modal Detail Siswa */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Detail Biodata Siswa"
        maxWidth="lg"
      >
        {selectedSiswa && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
              {selectedSiswa.foto_url ? (
                <img
                  src={selectedSiswa.foto_url}
                  alt={selectedSiswa.nama}
                  className="w-16 h-16 rounded-2xl object-cover border"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-bold text-2xl">
                  {selectedSiswa.nama.charAt(0)}
                </div>
              )}
              <div>
                <h4 className="font-bold text-slate-900 text-base">{selectedSiswa.nama}</h4>
                <p className="text-xs text-slate-500">
                  NIS: {selectedSiswa.nis} • NISN: {selectedSiswa.nisn}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                    Status: {selectedSiswa.status}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-700">
                    Kelas: {selectedSiswa.kelas ? selectedSiswa.kelas.nama : 'Belum ditentukan'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Tempat, Tanggal Lahir</span>
                <span className="font-semibold text-slate-800">
                  {selectedSiswa.tempat_lahir || '-'}, {selectedSiswa.tanggal_lahir || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Jenis Kelamin</span>
                <span className="font-semibold text-slate-800">
                  {selectedSiswa.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Nama Ayah</span>
                <span className="font-semibold text-slate-800">{selectedSiswa.nama_ayah || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Nama Ibu</span>
                <span className="font-semibold text-slate-800">{selectedSiswa.nama_ibu || '-'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">No. HP / Telepon Ortu</span>
                <span className="font-semibold text-slate-800">
                  {selectedSiswa.telepon_ortu || '-'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Pekerjaan Orang Tua</span>
                <span className="font-semibold text-slate-800">
                  {selectedSiswa.pekerjaan_ortu || '-'}
                </span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-slate-50">
                <span className="text-slate-400 block text-[10px]">Alamat Domisili</span>
                <span className="font-semibold text-slate-800">{selectedSiswa.alamat || '-'}</span>
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

      {/* Modal Impor Excel/CSV */}
      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Impor Data Siswa dari Excel / CSV"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-3">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Format File Impor:</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                Pastikan file Excel memuat kolom header: <code>nis</code>, <code>nisn</code> (10 digit),{' '}
                <code>nama</code>, <code>jenis_kelamin</code> (L/P), dan <code>nama_kelas</code> (contoh: 7-A).
              </p>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="mt-2 text-xs font-bold text-emerald-700 underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Template Excel Contoh
              </button>
            </div>
          </div>

          <form onSubmit={handleImportSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pilih Berkas Excel (.xlsx, .xls, .csv)
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer border border-dashed border-slate-300 rounded-xl p-3"
                required
              />
            </div>

            {importResult && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Hasil Impor:</span>
                </div>
                <div className="text-slate-600">
                  Berhasil diimpor: <strong>{importResult.importedCount}</strong> siswa.
                  {importResult.skippedCount ? (
                    <span> Dilewati: {importResult.skippedCount} baris (duplikasi/format tidak cocok).</span>
                  ) : null}
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 text-rose-600 text-[11px] space-y-1">
                    <p className="font-semibold">Catatan baris:</p>
                    {importResult.errors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Tutup
              </button>
              <button
                type="submit"
                disabled={isImporting}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
              >
                {isImporting ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Proses Impor
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal Tambah / Ubah Siswa */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Ubah Data Siswa' : 'Tambah Siswa Baru'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIS (Nomor Induk Siswa)
              </label>
              <input
                type="text"
                value={formData.nis}
                onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                placeholder="Contoh: 242507001"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NISN (10 Digit Angka)
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.nisn}
                onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                placeholder="Contoh: 0091827364"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Lengkap Siswa
            </label>
            <input
              type="text"
              value={formData.nama}
              onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
              placeholder="Masukkan nama lengkap siswa"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Kelamin
              </label>
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rombel / Kelas
              </label>
              <select
                value={formData.kelas_id || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    kelas_id: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status Kesiswaan
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'aktif' | 'lulus' | 'pindah',
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="aktif">Aktif</option>
                <option value="lulus">Lulus</option>
                <option value="pindah">Pindah</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tempat Lahir
              </label>
              <input
                type="text"
                value={formData.tempat_lahir}
                onChange={(e) => setFormData({ ...formData, tempat_lahir: e.target.value })}
                placeholder="Contoh: Bogor"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Lahir
              </label>
              <input
                type="date"
                value={formData.tanggal_lahir}
                onChange={(e) => setFormData({ ...formData, tanggal_lahir: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Data Orang Tua */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Data Orang Tua / Wali</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Ayah</label>
                <input
                  type="text"
                  value={formData.nama_ayah}
                  onChange={(e) => setFormData({ ...formData, nama_ayah: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nama Ibu</label>
                <input
                  type="text"
                  value={formData.nama_ibu}
                  onChange={(e) => setFormData({ ...formData, nama_ibu: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  No HP Ortu / WA
                </label>
                <input
                  type="text"
                  value={formData.telepon_ortu}
                  onChange={(e) => setFormData({ ...formData, telepon_ortu: e.target.value })}
                  placeholder="0812..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Tinggal</label>
            <textarea
              rows={2}
              value={formData.alamat}
              onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
              placeholder="Alamat lengkap domisili siswa..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
            />
          </div>

          {/* Foto Siswa */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Foto Siswa</label>
            <div className="flex items-center gap-4">
              {formData.foto_url ? (
                <img
                  src={formData.foto_url}
                  alt="Preview"
                  className="w-12 h-12 rounded-xl object-cover border"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
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
              {editingItem ? 'Simpan Perubahan' : 'Tambah Siswa'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Data Siswa"
        message="Apakah Anda yakin ingin menghapus data siswa ini?"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
