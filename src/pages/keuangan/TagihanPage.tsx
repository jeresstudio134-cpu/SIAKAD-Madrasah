import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { TagihanSiswa, JenisPembayaran, Kelas, TahunAjaran, PaginatedResult } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import {
  FileText,
  PlusCircle,
  Filter,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  Sparkles,
  Calendar,
  Layers,
} from 'lucide-react';

const BULAN_LIST = [
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
];

export function TagihanPage() {
  const { hasPermission } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const canEdit = hasPermission('keuangan', 'ubah') || hasPermission('keuangan', 'tambah');

  // Filters
  const [selectedTaId, setSelectedTaId] = useState<string>('');
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedJenisId, setSelectedJenisId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('semua');
  const [selectedBulan, setSelectedBulan] = useState<string>('semua');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Modal Generate Massal State
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    jenis_pembayaran_id: '',
    tahun_ajaran_id: '',
    bulan: 'Juli',
    tingkat: 'Semua',
    kelas_id: '',
    jatuh_tempo: new Date().toISOString().slice(0, 10),
  });

  // Queries
  const { data: taList = [] } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });

  const activeTa = taList.find((t) => t.is_active) || taList[0];
  const currentTaId = selectedTaId || String(activeTa?.id || '1');

  const { data: kelasList = [] } = useQuery({
    queryKey: ['kelas-simple'],
    queryFn: async () => {
      const res = await api.get<Kelas[]>('/api/kelas/simple');
      return res.data || [];
    },
  });

  const { data: jenisList = [] } = useQuery({
    queryKey: ['jenis-pembayaran', currentTaId],
    queryFn: async () => {
      const res = await api.get<JenisPembayaran[]>(
        `/api/keuangan/jenis?tahun_ajaran_id=${currentTaId}`
      );
      return res.data || [];
    },
    enabled: Boolean(currentTaId),
  });

  // Query Tagihan
  const { data: tagihanData, isLoading } = useQuery({
    queryKey: [
      'tagihan-list',
      currentTaId,
      selectedKelasId,
      selectedJenisId,
      selectedStatus,
      selectedBulan,
      search,
      page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentTaId) params.append('tahun_ajaran_id', currentTaId);
      if (selectedKelasId) params.append('kelas_id', selectedKelasId);
      if (selectedJenisId) params.append('jenis_pembayaran_id', selectedJenisId);
      if (selectedStatus && selectedStatus !== 'semua') params.append('status', selectedStatus);
      if (selectedBulan && selectedBulan !== 'semua') params.append('bulan', selectedBulan);
      if (search) params.append('search', search);
      params.append('page', String(page));
      params.append('limit', '15');

      const res = await api.get<TagihanSiswa[]>(`/api/keuangan/tagihan?${params.toString()}`);
      return res;
    },
    enabled: Boolean(currentTaId),
  });

  // Mutation Generate Massal
  const generateMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/keuangan/tagihan/generate-massal', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['tagihan-list'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-keuangan'] });
      queryClient.invalidateQueries({ queryKey: ['tunggakan'] });
      success(res.message || 'Tagihan massal berhasil diterbitkan.');
      setGenerateModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal generate tagihan massal.'),
  });

  const handleOpenGenerate = () => {
    setGenerateForm({
      jenis_pembayaran_id: jenisList[0] ? String(jenisList[0].id) : '',
      tahun_ajaran_id: String(activeTa?.id || '1'),
      bulan: 'Juli',
      tingkat: 'Semua',
      kelas_id: '',
      jatuh_tempo: new Date().toISOString().slice(0, 10),
    });
    setGenerateModalOpen(true);
  };

  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateForm.jenis_pembayaran_id) {
      error('Pilih jenis pembayaran.');
      return;
    }

    generateMutation.mutate({
      ...generateForm,
      jenis_pembayaran_id: Number(generateForm.jenis_pembayaran_id),
      tahun_ajaran_id: Number(generateForm.tahun_ajaran_id),
      kelas_id: generateForm.kelas_id ? Number(generateForm.kelas_id) : undefined,
    });
  };

  const selectedJenisObj = jenisList.find(
    (j) => String(j.id) === generateForm.jenis_pembayaran_id
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Daftar Tagihan Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pengelolaan tagihan SPP bulanan dan pos pembayaran siswa per tahun ajaran {activeTa?.tahun}.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenGenerate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Generate Tagihan Massal
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filter TA */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Tahun Ajaran
            </label>
            <select
              value={currentTaId}
              onChange={(e) => {
                setSelectedTaId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              {taList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tahun} ({t.semester})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Rombel / Kelas
            </label>
            <select
              value={selectedKelasId}
              onChange={(e) => {
                setSelectedKelasId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">Semua Kelas</option>
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Pos Pembayaran */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Jenis Pembayaran
            </label>
            <select
              value={selectedJenisId}
              onChange={(e) => {
                setSelectedJenisId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="">Semua Pos Pembayaran</option>
              {jenisList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama} ({j.tipe === 'bulanan' ? 'Bulanan' : 'Bebas'})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Bulan */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Bulan (SPP)
            </label>
            <select
              value={selectedBulan}
              onChange={(e) => {
                setSelectedBulan(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="semua">Semua Bulan</option>
              {BULAN_LIST.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Status Bayar
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              <option value="semua">Semua Status</option>
              <option value="belum_bayar">Belum Bayar</option>
              <option value="sebagian">Sebagian (Dicicil)</option>
              <option value="lunas">Lunas</option>
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama siswa atau NIS..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={8} cols={7} />
          </div>
        ) : !tagihanData?.data || tagihanData.data.length === 0 ? (
          <EmptyState
            title="Tidak Ada Tagihan Ditemukan"
            description="Coba ubah kriteria filter pencarian atau buat tagihan massal baru."
            actionLabel={canEdit ? 'Generate Tagihan Massal' : undefined}
            onAction={canEdit ? handleOpenGenerate : undefined}
          />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                    <th className="py-3 px-4">Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Jenis Tagihan</th>
                    <th className="py-3 px-4">Bulan</th>
                    <th className="py-3 px-4 font-mono">Nominal</th>
                    <th className="py-3 px-4 font-mono">Terbayar</th>
                    <th className="py-3 px-4 font-mono">Sisa Tagihan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tagihanData.data.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-slate-900">{t.siswa?.nama}</p>
                          <span className="text-[10px] text-slate-400 font-mono">
                            NIS: {t.siswa?.nis}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        Kelas {t.kelas?.nama || '-'}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-800">
                        {t.jenisPembayaran?.nama || 'Pos Pembayaran'}
                      </td>

                      <td className="py-3 px-4">
                        {t.bulan ? (
                          <span className="font-semibold text-slate-700">{t.bulan}</span>
                        ) : (
                          <span className="text-slate-400 italic">-</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        Rp {Number(t.nominal).toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-4 font-mono font-semibold text-emerald-700">
                        Rp {Number(t.terbayar).toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-rose-600">
                        Rp {Number(t.sisa).toLocaleString('id-ID')}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {t.status === 'lunas' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" /> Lunas
                          </span>
                        ) : t.status === 'sebagian' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" /> Dicicil
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" /> Belum Bayar
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {t.status !== 'lunas' ? (
                          <button
                            onClick={() =>
                              navigate(`/keuangan/pembayaran?siswaId=${t.siswa_id}&tagihanId=${t.id}`)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Bayar
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Lunas</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {Boolean(tagihanData?.totalPages && tagihanData.totalPages > 1) && (
              <div className="p-4 border-t border-slate-100">
                <Pagination
                  currentPage={tagihanData?.page || 1}
                  totalPages={tagihanData?.totalPages || 1}
                  totalItems={tagihanData?.total}
                  itemsPerPage={15}
                  onPageChange={setPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Wizard Generate Tagihan Massal */}
      <Modal
        isOpen={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        title="Generate Tagihan Siswa Massal"
        size="lg"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            Sistem akan otomatis menghitung nominal sesuai konfigurasi tarif baku per rombel/tingkat kelas. Siswa yang sudah memiliki tagihan ini pada periode yang sama akan dilewati secara otomatis (tidak duplikat).
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Pilih Pos Pembayaran <span className="text-rose-500">*</span>
            </label>
            <select
              required
              value={generateForm.jenis_pembayaran_id}
              onChange={(e) =>
                setGenerateForm({
                  ...generateForm,
                  jenis_pembayaran_id: e.target.value,
                })
              }
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
            >
              {jenisList.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.nama} ({j.tipe === 'bulanan' ? 'Bulanan/SPP' : 'Bebas/Sekali Bayar'})
                </option>
              ))}
            </select>
          </div>

          {selectedJenisObj?.tipe === 'bulanan' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bulan Tagihan SPP <span className="text-rose-500">*</span>
              </label>
              <select
                value={generateForm.bulan}
                onChange={(e) => setGenerateForm({ ...generateForm, bulan: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                {BULAN_LIST.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tingkat Sasaran
              </label>
              <select
                value={generateForm.tingkat}
                onChange={(e) =>
                  setGenerateForm({
                    ...generateForm,
                    tingkat: e.target.value,
                    kelas_id: '',
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="Semua">Semua Jenjang (Tingkat 7, 8, 9)</option>
                <option value="7">Hanya Tingkat 7</option>
                <option value="8">Hanya Tingkat 8</option>
                <option value="9">Hanya Tingkat 9</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Atau Khusus Rombel / Kelas Tertentu
              </label>
              <select
                value={generateForm.kelas_id}
                onChange={(e) => setGenerateForm({ ...generateForm, kelas_id: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="">Semua Rombel pada Jenjang Terpilih</option>
                {kelasList.map((k) => (
                  <option key={k.id} value={k.id}>
                    Kelas {k.nama} (Tingkat {k.tingkat})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tanggal Batas Jatuh Tempo
            </label>
            <input
              type="date"
              value={generateForm.jatuh_tempo}
              onChange={(e) => setGenerateForm({ ...generateForm, jatuh_tempo: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setGenerateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={generateMutation.isPending}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {generateMutation.isPending ? 'Memproses Tagihan...' : 'Terbitkan Tagihan Sekarang'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
