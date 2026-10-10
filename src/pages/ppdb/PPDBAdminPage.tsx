import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import {
  Users2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  Eye,
  UserCheck,
  UserPlus,
  ArrowRight,
  ExternalLink,
  Sparkles,
  FileText,
  School,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { PPDBPendaftar, PPDBStatus, Kelas } from '../../types';
import { PrintPaperBar } from '../../components/ui/PrintPaperBar';
import { PaperSize, PaperOrientation, triggerPrint } from '../../lib/print-utils';

export function PPDBAdminPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('semua');
  const [selectedJalur, setSelectedJalur] = useState<string>('semua');
  const [paper, setPaper] = useState<PaperSize>('a4');
  const [orientation, setOrientation] = useState<PaperOrientation>('landscape');

  // Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [konversiModalOpen, setKonversiModalOpen] = useState(false);
  const [selectedPendaftar, setSelectedPendaftar] = useState<PPDBPendaftar | null>(null);

  // Verifikasi Form State
  const [verifikasiStatus, setVerifikasiStatus] = useState<PPDBStatus>('terverifikasi');
  const [catatanVerifikasi, setCatatanVerifikasi] = useState('');

  // Konversi Form State
  const [targetKelasId, setTargetKelasId] = useState('');
  const [customNis, setCustomNis] = useState('');

  // Query Stats
  const { data: statsData } = useQuery({
    queryKey: ['ppdb-stats'],
    queryFn: async () => {
      const res = await api.get('/api/ppdb/stats');
      return res.data;
    },
  });

  // Query Kelas (untuk pilihan rombel saat konversi)
  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-list-simple'],
    queryFn: async () => {
      const res = await api.get<Kelas[]>('/api/kelas/simple');
      return res.data || [];
    },
  });

  // Query List Pendaftar
  const { data: pendaftarData, isLoading } = useQuery({
    queryKey: ['ppdb-admin-list', page, search, selectedStatus, selectedJalur],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (selectedStatus !== 'semua') params.append('status', selectedStatus);
      if (selectedJalur !== 'semua') params.append('jalur', selectedJalur);

      const res = await api.get<PPDBPendaftar[]>(`/api/ppdb/pendaftar?${params.toString()}`);
      return res;
    },
  });

  // Mutation Verifikasi
  const verifikasiMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.put(`/api/ppdb/pendaftar/${id}/verifikasi`, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['ppdb-admin-list'] });
      queryClient.invalidateQueries({ queryKey: ['ppdb-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      success(res.message || 'Verifikasi pendaftar berhasil diperbarui.');
      setDetailModalOpen(false);
    },
    onError: (err: any) => toastError(err.message || 'Gagal memverifikasi pendaftar.'),
  });

  // Mutation Konversi Santri Aktif
  const konversiMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      api.post(`/api/ppdb/pendaftar/${id}/konversi`, data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['ppdb-admin-list'] });
      queryClient.invalidateQueries({ queryKey: ['ppdb-stats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['siswa-list'] });
      success(res.message || 'Santri berhasil dikonversi menjadi siswa aktif!');
      setKonversiModalOpen(false);
    },
    onError: (err: any) => toastError(err.message || 'Gagal mengonversi calon santri.'),
  });

  const handleOpenDetail = (p: PPDBPendaftar) => {
    setSelectedPendaftar(p);
    setVerifikasiStatus(p.status);
    setCatatanVerifikasi(p.catatan_verifikasi || '');
    setDetailModalOpen(true);
  };

  const handleOpenKonversi = (p: PPDBPendaftar) => {
    setSelectedPendaftar(p);
    setTargetKelasId(kelasList[0] ? String(kelasList[0].id) : '1');
    setCustomNis('');
    setKonversiModalOpen(true);
  };

  const handleSaveVerifikasi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendaftar) return;

    verifikasiMutation.mutate({
      id: selectedPendaftar.id,
      data: {
        status: verifikasiStatus,
        catatan_verifikasi: catatanVerifikasi,
      },
    });
  };

  const handleSaveKonversi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendaftar) return;

    konversiMutation.mutate({
      id: selectedPendaftar.id,
      data: {
        kelas_id: Number(targetKelasId),
        nis: customNis || undefined,
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'diterima':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Diterima
          </span>
        );
      case 'terverifikasi':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <CheckCircle2 className="w-3 h-3" /> Terverifikasi
          </span>
        );
      case 'cadangan':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <Clock className="w-3 h-3" /> Cadangan
          </span>
        );
      case 'ditolak':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3" /> Ditolak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3" /> Menunggu
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs print:hidden">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
            <Users2 className="w-4 h-4" />
            <span>Kesiswaan & Admisi Madrasah</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 mt-1">
            Verifikasi & Seleksi PPDB Online
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola pendaftaran santri baru, verifikasi keabsahan dokumen, dan konversi santri lulus ke kelas aktif.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/ppdb"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Buka Portal Publik PPDB
          </a>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 print:hidden">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Pendaftar</span>
          <div className="text-2xl font-black text-slate-800 mt-1">{statsData?.totalPendaftar || 0}</div>
          <span className="text-[10px] text-slate-500">Kuota: {statsData?.targetKuota || 120}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Menunggu Verifikasi</span>
          <div className="text-2xl font-black text-amber-700 mt-1">{statsData?.menungguVerifikasi || 0}</div>
          <span className="text-[10px] text-amber-600">Butuh tinjauan berkas</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Terverifikasi</span>
          <div className="text-2xl font-black text-blue-700 mt-1">{statsData?.terverifikasi || 0}</div>
          <span className="text-[10px] text-blue-600">Lolos berkas adm</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Diterima (Lulus)</span>
          <div className="text-2xl font-black text-emerald-700 mt-1">{statsData?.diterima || 0}</div>
          <span className="text-[10px] text-emerald-600">Siap daftar ulang</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Sudah Dikonversi</span>
          <div className="text-2xl font-black text-purple-700 mt-1">{statsData?.sudahKonversi || 0}</div>
          <span className="text-[10px] text-purple-600">Masuk rombel aktif</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-xs">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Ditolak</span>
          <div className="text-2xl font-black text-rose-700 mt-1">{statsData?.ditolak || 0}</div>
          <span className="text-[10px] text-rose-600">Tidak memenuhi syarat</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari nama calon santri, nomor pendaftaran, NISN, atau sekolah..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 text-xs font-semibold"
            >
              <option value="semua">Semua Status</option>
              <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
              <option value="terverifikasi">Terverifikasi</option>
              <option value="diterima">Diterima</option>
              <option value="cadangan">Cadangan</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>

          <select
            value={selectedJalur}
            onChange={(e) => {
              setSelectedJalur(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-emerald-600 text-xs font-semibold"
          >
            <option value="semua">Semua Jalur</option>
            <option value="Reguler">Jalur Reguler</option>
            <option value="Prestasi">Jalur Prestasi</option>
            <option value="Tahfidz">Jalur Tahfidz</option>
            <option value="Afirmasi">Jalur Afirmasi</option>
          </select>
        </div>
      </div>

      {/* Print Paper Toolbar */}
      <PrintPaperBar
        paper={paper}
        onPaperChange={setPaper}
        orientation={orientation}
        onOrientationChange={setOrientation}
        allowedPapers={['a4', 'f4']}
        disabled={!pendaftarData?.data || pendaftarData.data.length === 0}
        printLabel="Cetak Rekapitulasi PPDB"
        onPrint={() => triggerPrint({ paper, orientation })}
      />

      {/* Table Content & Printable Container */}
      <div
        className={`print-area ${
          paper === 'f4'
            ? orientation === 'landscape'
              ? 'print-f4-landscape sheet-preview-f4-landscape'
              : 'print-f4 sheet-preview-f4'
            : orientation === 'landscape'
            ? 'print-a4-landscape sheet-preview-a4-landscape'
            : 'print-a4 sheet-preview-a4'
        } bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden p-4 sm:p-6 print:border-none print:shadow-none print:p-0 text-slate-900`}
      >
        {/* Kop Surat Panitia PPDB (Print Only) */}
        <div className="kop-surat border-b-2 border-slate-800 pb-3 mb-3 text-center print:block hidden">
          <p className="text-[10px] font-bold tracking-widest text-slate-700 uppercase">
            PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB) MADRASAH
          </p>
          <h1 className="text-base font-extrabold uppercase tracking-wider text-slate-900">
            REKAPITULASI DATA PENDAFTARAN SANTRI BARU
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Filter Status: {selectedStatus.toUpperCase()} • Jalur: {selectedJalur} • Dicetak pada {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
          </p>
        </div>
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={6} />
          </div>
        ) : !pendaftarData?.data || pendaftarData.data.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Pendaftar"
            description="Belum ada pendaftaran PPDB yang cocok dengan kriteria filter saat ini."
          />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                    <th className="py-2.5 px-3">No. Pendaftaran</th>
                    <th className="py-2.5 px-3">Calon Santri</th>
                    <th className="py-2.5 px-3">Jalur & Asal Sekolah</th>
                    <th className="py-2.5 px-3">Kontak Wali</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-center print:hidden">Konversi Siswa</th>
                    <th className="py-2.5 px-3 text-right print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendaftarData.data.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2 px-3 font-mono font-bold text-slate-800">
                        {p.nomor_pendaftaran}
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {p.berkas_foto_url ? (
                            <img
                              src={p.berkas_foto_url}
                              alt={p.nama_lengkap}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0 print:hidden"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 print:hidden">
                              {p.nama_lengkap.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-900">{p.nama_lengkap}</p>
                            <span className="text-[10px] text-slate-400">
                              {p.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'} • NISN: {p.nisn || '-'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px]">
                          {p.jalur_pendaftaran}
                        </span>
                        <p className="text-[11px] text-slate-600 mt-0.5">{p.sekolah_asal || '-'}</p>
                      </td>

                      <td className="py-2 px-3">
                        <p className="font-medium text-slate-800">{p.nama_ayah || p.nama_ibu || '-'}</p>
                        <span className="text-[11px] text-slate-500 font-mono">{p.telepon_ortu || '-'}</span>
                      </td>

                      <td className="py-2 px-3 text-center">{getStatusBadge(p.status)}</td>

                      <td className="py-2 px-3 text-center print:hidden">
                        {p.is_converted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Aktif
                          </span>
                        ) : p.status === 'diterima' ? (
                          <button
                            onClick={() => handleOpenKonversi(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition-colors"
                          >
                            <UserPlus className="w-3 h-3" /> Konversi
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-2 px-3 text-right print:hidden">
                        <button
                          onClick={() => handleOpenDetail(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {Boolean(pendaftarData?.totalPages && pendaftarData.totalPages > 1) && (
              <div className="p-4 border-t border-slate-100 print:hidden">
                <Pagination
                  currentPage={pendaftarData?.page || 1}
                  totalPages={pendaftarData?.totalPages || 1}
                  totalItems={pendaftarData?.total}
                  itemsPerPage={10}
                  onPageChange={setPage}
                />
              </div>
            )}

            {/* Lembar Tanda Tangan Cetak Rekap PPDB */}
            <div className="signature-block print-avoid-break print:grid hidden grid-cols-2 gap-8 text-center text-xs mt-6 pt-3">
              <div>
                <p className="text-slate-500">Mengetahui,</p>
                <p className="font-semibold text-slate-800">Kepala Madrasah</p>
                <div className="h-14" />
                <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-8">
                  ( ..................................... )
                </p>
              </div>
              <div>
                <p className="text-slate-500">
                  Dicetak tanggal {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="font-semibold text-slate-800">Ketua Panitia PPDB</p>
                <div className="h-14" />
                <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-8">
                  ( ..................................... )
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal 1: Detail & Verifikasi Berkas */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Detail Berkas & Verifikasi PPDB"
        size="2xl"
      >
        {selectedPendaftar && (
          <div className="space-y-6 text-xs">
            {/* Header Santri */}
            <div className="flex items-start justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center gap-3">
                {selectedPendaftar.berkas_foto_url ? (
                  <img
                    src={selectedPendaftar.berkas_foto_url}
                    alt={selectedPendaftar.nama_lengkap}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-300"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
                    {selectedPendaftar.nama_lengkap.charAt(0)}
                  </div>
                )}
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-800">
                    {selectedPendaftar.nomor_pendaftaran}
                  </span>
                  <h4 className="text-base font-extrabold text-slate-900 mt-0.5">
                    {selectedPendaftar.nama_lengkap}
                  </h4>
                  <p className="text-slate-500">
                    Jalur: {selectedPendaftar.jalur_pendaftaran} • Asal: {selectedPendaftar.sekolah_asal}
                  </p>
                </div>
              </div>
              <div>{getStatusBadge(selectedPendaftar.status)}</div>
            </div>

            {/* Berkas Lampiran Upload */}
            <div>
              <h5 className="font-bold text-slate-800 mb-2">Berkas Pendukung Calon Santri:</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Pas Foto 3x4', url: selectedPendaftar.berkas_foto_url },
                  { label: 'Scan Ijazah / SKL', url: selectedPendaftar.berkas_ijazah_url },
                  { label: 'Scan Akta Lahir', url: selectedPendaftar.berkas_akta_url },
                  { label: 'Scan Kartu Keluarga', url: selectedPendaftar.berkas_kk_url },
                ].map((berkas, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
                  >
                    <span className="font-semibold text-slate-700">{berkas.label}</span>
                    <div className="mt-2">
                      {berkas.url ? (
                        <a
                          href={berkas.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
                        >
                          <ExternalLink className="w-3 h-3" /> Lihat Berkas
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Belum diunggah</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Ubah Verifikasi */}
            <form onSubmit={handleSaveVerifikasi} className="space-y-4 pt-4 border-t border-slate-200">
              <h5 className="font-bold text-slate-800">Perbarui Hasil Keputusan Panitia:</h5>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Keputusan Status Verifikasi
                  </label>
                  <select
                    value={verifikasiStatus}
                    onChange={(e) => setVerifikasiStatus(e.target.value as PPDBStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-semibold"
                  >
                    <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
                    <option value="terverifikasi">Berkas Terverifikasi (Lolos Adm)</option>
                    <option value="diterima">Diterima / Lulus Seleksi</option>
                    <option value="cadangan">Cadangan</option>
                    <option value="ditolak">Ditolak / Tidak Lulus</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Catatan Verifikasi / Alasan (Dapat dilihat calon santri)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Berkas sah, nilai rata-rata memenuhi syarat."
                    value={catatanVerifikasi}
                    onChange={(e) => setCatatanVerifikasi(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  disabled={verifikasiMutation.isPending}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-xl font-bold shadow-xs cursor-pointer"
                >
                  {verifikasiMutation.isPending ? 'Menyimpan...' : 'Simpan Keputusan'}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Modal 2: Konversi Calon Siswa Menjadi Siswa Aktif */}
      <Modal
        isOpen={konversiModalOpen}
        onClose={() => setKonversiModalOpen(false)}
        title="Konversi Calon Siswa Menjadi Siswa Aktif"
        size="lg"
      >
        {selectedPendaftar && (
          <form onSubmit={handleSaveKonversi} className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 leading-relaxed">
              Santri <strong className="font-bold">{selectedPendaftar.nama_lengkap}</strong> akan didaftarkan ke dalam database <strong>Siswa Aktif</strong> dan langsung ditempatkan pada rombel/kelas tujuan yang dipilih.
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Pilih Kelas / Rombel Tujuan <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={targetKelasId}
                onChange={(e) => setTargetKelasId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 bg-white font-semibold text-sm"
              >
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama} (Tingkat {k.tingkat}) - Kapasitas: {k.kapasitas}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nomor Induk Siswa (NIS) <span className="text-slate-400 font-normal">(Opsional - Kosongkan untuk generate otomatis)</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: 242507010 (Otomatis jika kosong)"
                value={customNis}
                onChange={(e) => setCustomNis(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setKonversiModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={konversiMutation.isPending}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {konversiMutation.isPending ? 'Memproses...' : 'Konversi Sekarang'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
