import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Siswa, TagihanSiswa, TransaksiPembayaran, TahunAjaran } from '../../types';
import { KwitansiModal } from '../../components/keuangan/KwitansiModal';
import { Modal } from '../../components/ui/Modal';
import { TableSkeleton } from '../../components/ui/Skeleton';
import {
  CreditCard,
  Search,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  Ban,
  Wallet,
  ArrowRight,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

export function PembayaranPage() {
  const [searchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('keuangan', 'ubah') || hasPermission('keuangan', 'tambah');

  // Search Siswa State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSiswaId, setSelectedSiswaId] = useState<number | null>(null);

  // Kwitansi Modal State
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

  // Form Bayar Modal State
  const [bayarModalOpen, setBayarModalOpen] = useState(false);
  const [selectedTagihan, setSelectedTagihan] = useState<TagihanSiswa | null>(null);
  const [bayarForm, setBayarForm] = useState({
    jumlah_bayar: 0,
    metode: 'Tunai' as 'Tunai' | 'Transfer',
    tanggal_bayar: new Date().toISOString().slice(0, 10),
    catatan: '',
  });

  // Void Modal State
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [voidTx, setVoidTx] = useState<TransaksiPembayaran | null>(null);
  const [alasanBatal, setAlasanBatal] = useState('');

  // Handle URL search params on mount
  useEffect(() => {
    const sId = searchParams.get('siswaId');
    if (sId) {
      setSelectedSiswaId(Number(sId));
    }
  }, [searchParams]);

  // Queries
  const { data: taList = [] } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });

  const activeTa = taList.find((t) => t.is_active) || taList[0];

  // Query search siswa
  const { data: searchResults = [] } = useQuery({
    queryKey: ['search-siswa-keuangan', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.trim().length < 2) return [];
      const res = await api.get<any>(`/api/siswa?search=${encodeURIComponent(searchQuery)}&limit=10`);
      return res.data?.data || [];
    },
    enabled: Boolean(searchQuery && searchQuery.trim().length >= 2),
  });

  // Query Data Siswa Terpilih
  const { data: selectedSiswa } = useQuery({
    queryKey: ['siswa-detail', selectedSiswaId],
    queryFn: async () => {
      if (!selectedSiswaId) return null;
      const res = await api.get<Siswa>(`/api/siswa/${selectedSiswaId}`);
      return res.data || null;
    },
    enabled: Boolean(selectedSiswaId),
  });

  // Query Tagihan Siswa Terpilih
  const { data: tagihanList = [], isLoading: isLoadingTagihan } = useQuery({
    queryKey: ['tagihan-siswa-aktif', selectedSiswaId, activeTa?.id],
    queryFn: async () => {
      if (!selectedSiswaId) return [];
      const res = await api.get<TagihanSiswa[]>(
        `/api/keuangan/tagihan/siswa/${selectedSiswaId}?tahun_ajaran_id=${activeTa?.id || ''}`
      );
      return res.data || [];
    },
    enabled: Boolean(selectedSiswaId),
  });

  // Query Riwayat Pembayaran Siswa Terpilih
  const { data: riwayatTransaksi = [], isLoading: isLoadingRiwayat } = useQuery({
    queryKey: ['riwayat-pembayaran-siswa', selectedSiswaId],
    queryFn: async () => {
      if (!selectedSiswaId) return [];
      const res = await api.get<any>(`/api/keuangan/pembayaran?search=${selectedSiswa?.nis || ''}&limit=50`);
      return res.data || [];
    },
    enabled: Boolean(selectedSiswaId && selectedSiswa),
  });

  // Mutations
  const bayarMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/keuangan/pembayaran', data),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['tagihan-siswa-aktif'] });
      queryClient.invalidateQueries({ queryKey: ['riwayat-pembayaran-siswa'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-keuangan'] });
      queryClient.invalidateQueries({ queryKey: ['tagihan-list'] });
      queryClient.invalidateQueries({ queryKey: ['tunggakan'] });
      success(res.message || 'Pembayaran berhasil dicatat.');
      setBayarModalOpen(false);
      if (res.data?.transaksi?.id) {
        setSelectedTxId(res.data.transaksi.id); // Tampilkan langsung kwitansi
      }
    },
    onError: (err: any) => error(err.message || 'Gagal memproses pembayaran.'),
  });

  const voidMutation = useMutation({
    mutationFn: ({ id, alasan }: { id: number; alasan: string }) =>
      api.post(`/api/keuangan/pembayaran/${id}/batal`, { alasan_batal: alasan }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['tagihan-siswa-aktif'] });
      queryClient.invalidateQueries({ queryKey: ['riwayat-pembayaran-siswa'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-keuangan'] });
      queryClient.invalidateQueries({ queryKey: ['tagihan-list'] });
      queryClient.invalidateQueries({ queryKey: ['tunggakan'] });
      warning(res.message || 'Pembayaran berhasil dibatalkan (void).');
      setVoidModalOpen(false);
      setVoidTx(null);
      setAlasanBatal('');
    },
    onError: (err: any) => error(err.message || 'Gagal membatalkan transaksi.'),
  });

  const handleOpenBayar = (tagihan: TagihanSiswa) => {
    setSelectedTagihan(tagihan);
    setBayarForm({
      jumlah_bayar: Number(tagihan.sisa), // Default lunas, tapi user bisa ubah untuk cicilan
      metode: 'Tunai',
      tanggal_bayar: new Date().toISOString().slice(0, 10),
      catatan: '',
    });
    setBayarModalOpen(true);
  };

  const handleBayarSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTagihan || !selectedSiswaId) return;

    if (bayarForm.jumlah_bayar <= 0) {
      error('Jumlah pembayaran harus lebih dari 0.');
      return;
    }

    if (bayarForm.jumlah_bayar > Number(selectedTagihan.sisa)) {
      error(`Jumlah pembayaran tidak boleh melebihi sisa tagihan (Rp ${selectedTagihan.sisa.toLocaleString('id-ID')}).`);
      return;
    }

    bayarMutation.mutate({
      tagihan_id: selectedTagihan.id,
      siswa_id: selectedSiswaId,
      jumlah_bayar: bayarForm.jumlah_bayar,
      metode: bayarForm.metode,
      tanggal_bayar: bayarForm.tanggal_bayar,
      catatan: bayarForm.catatan,
    });
  };

  const handleOpenVoid = (tx: TransaksiPembayaran) => {
    setVoidTx(tx);
    setAlasanBatal('');
    setVoidModalOpen(true);
  };

  const handleVoidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTx) return;
    if (!alasanBatal.trim()) {
      error('Alasan pembatalan wajib diisi.');
      return;
    }
    voidMutation.mutate({ id: voidTx.id, alasan: alasanBatal.trim() });
  };

  // Kalkulasi Ringkasan Tagihan Siswa
  const totalTagihanSiswa = tagihanList.reduce((acc, t) => acc + Number(t.nominal), 0);
  const totalTerbayarSiswa = tagihanList.reduce((acc, t) => acc + Number(t.terbayar), 0);
  const totalSisaSiswa = tagihanList.reduce((acc, t) => acc + Number(t.sisa), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Kasir & Pencatatan Pembayaran Siswa
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Cari siswa untuk melihat status tagihan, mencatat pembayaran tunai/transfer, mendukung sistem cicilan, dan menerbitkan kwitansi resmi.
        </p>
      </div>

      {/* Pencarian Siswa */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <label className="block text-xs font-bold text-slate-700">
          Pencarian Siswa (Ketik Nama atau NIS):
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Ketik minimal 2 huruf, misal: Fatih, Aisyah, atau 242507001..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-slate-50/50"
          />
        </div>

        {/* Dropdown Auto-Suggest Results */}
        {searchResults.length > 0 && (
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-lg">
            {searchResults.map((s: Siswa) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSelectedSiswaId(s.id);
                  setSearchQuery('');
                }}
                className="w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-emerald-50/60 transition-colors cursor-pointer"
              >
                <div>
                  <span className="font-bold text-xs text-slate-800">{s.nama}</span>
                  <span className="text-[11px] text-slate-500 ml-2 font-mono">
                    NIS: {s.nis} • Kelas: {s.kelas?.nama || '-'}
                  </span>
                </div>
                <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                  Pilih <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panel Siswa Terpilih & Tagihan */}
      {selectedSiswa ? (
        <div className="space-y-6">
          {/* Header Profil Siswa & Ringkasan Saldo */}
          <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-white shrink-0">
                <User className="w-7 h-7" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                  Data Siswa Terpilih
                </span>
                <h3 className="text-lg font-bold">{selectedSiswa.nama}</h3>
                <p className="text-xs text-emerald-100 mt-0.5 font-mono">
                  NIS: {selectedSiswa.nis} • NISN: {selectedSiswa.nisn || '-'} • Kelas:{' '}
                  {selectedSiswa.kelas?.nama || '-'}
                </p>
              </div>
            </div>

            {/* Statistik Saldo */}
            <div className="grid grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-white/20 pt-4 md:pt-0 md:pl-6 text-center">
              <div>
                <span className="text-[10px] text-emerald-200 block uppercase font-medium">
                  Total Tagihan
                </span>
                <span className="text-sm font-extrabold font-mono">
                  Rp {totalTagihanSiswa.toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-200 block uppercase font-medium">
                  Telah Dibayar
                </span>
                <span className="text-sm font-extrabold font-mono text-emerald-300">
                  Rp {totalTerbayarSiswa.toLocaleString('id-ID')}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-rose-300 block uppercase font-bold">
                  Sisa Tunggakan
                </span>
                <span className="text-sm font-extrabold font-mono text-rose-300">
                  Rp {totalSisaSiswa.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Tabel Tagihan Siswa */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3 p-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Daftar Tagihan Siswa (Tahun Ajaran {activeTa?.tahun})
              </h4>
              <span className="text-xs text-slate-500 font-medium">
                {tagihanList.length} Pos Tagihan
              </span>
            </div>

            {isLoadingTagihan ? (
              <TableSkeleton rows={4} cols={6} />
            ) : tagihanList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Siswa ini belum memiliki tagihan pada tahun ajaran ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-2.5 px-3">Pos Pembayaran</th>
                      <th className="py-2.5 px-3">Bulan</th>
                      <th className="py-2.5 px-3 font-mono">Nominal</th>
                      <th className="py-2.5 px-3 font-mono">Terbayar</th>
                      <th className="py-2.5 px-3 font-mono">Sisa Tagihan</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      {canEdit && <th className="py-2.5 px-3 text-right">Aksi</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tagihanList.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          {t.jenisPembayaran?.nama || 'Pos Pembayaran'}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {t.bulan || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          Rp {Number(t.nominal).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-semibold text-emerald-700">
                          Rp {Number(t.terbayar).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-rose-600">
                          Rp {Number(t.sisa).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {t.status === 'lunas' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Lunas
                            </span>
                          ) : t.status === 'sebagian' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Dicicil
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" /> Belum Bayar
                            </span>
                          )}
                        </td>
                        {canEdit && (
                          <td className="py-2.5 px-3 text-right">
                            {t.status !== 'lunas' ? (
                              <button
                                onClick={() => handleOpenBayar(t)}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer shadow-2xs"
                              >
                                <Wallet className="w-3.5 h-3.5" />
                                Bayar / Cicil
                              </button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-semibold inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Tuntas
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tabel Riwayat Pembayaran Siswa */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3 p-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-800">
                  Riwayat Pembayaran & Kwitansi Siswa Ini
                </h4>
                <p className="text-[11px] text-slate-400">
                  Semua transaksi sah dan bukti pembayaran yang pernah dicatat
                </p>
              </div>
            </div>

            {isLoadingRiwayat ? (
              <TableSkeleton rows={3} cols={6} />
            ) : riwayatTransaksi.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Belum ada riwayat pembayaran yang tercatat untuk siswa ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/70">
                      <th className="py-2.5 px-3">No. Kwitansi</th>
                      <th className="py-2.5 px-3">Tanggal Bayar</th>
                      <th className="py-2.5 px-3">Pos Tagihan</th>
                      <th className="py-2.5 px-3 font-mono">Jumlah Bayar</th>
                      <th className="py-2.5 px-3">Metode</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riwayatTransaksi.map((tx: TransaksiPembayaran) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          {tx.nomor_transaksi}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {tx.tanggal_bayar}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          {tx.tagihan?.jenisPembayaran?.nama || 'Pos Tagihan'}{' '}
                          {tx.tagihan?.bulan && `(${tx.tagihan.bulan})`}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">
                          Rp {Number(tx.jumlah_bayar).toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {tx.metode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {tx.status === 'valid' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              <CheckCircle2 className="w-3 h-3" /> Sah / Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded cursor-help"
                              title={`Dibatalkan: ${tx.alasan_batal || '-'}`}
                            >
                              <Ban className="w-3 h-3" /> Dibatalkan
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedTxId(tx.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Cetak Kwitansi"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Kwitansi
                            </button>

                            {canEdit && tx.status === 'valid' && (
                              <button
                                onClick={() => handleOpenVoid(tx)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                                title="Batalkan Pembayaran (Void)"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                Batal
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
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Pilih Siswa untuk Memulai Pembayaran
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Gunakan kolom pencarian di atas dengan mengetikkan nama siswa atau NIS untuk melihat daftar tagihan dan mencatat pembayaran.
          </p>
        </div>
      )}

      {/* Modal Form Bayar Tagihan (Mendukung Cicilan) */}
      <Modal
        isOpen={bayarModalOpen}
        onClose={() => setBayarModalOpen(false)}
        title="Formulir Pembayaran Kasir"
        size="md"
      >
        <form onSubmit={handleBayarSubmit} className="space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Siswa:</span>
              <span className="font-bold text-slate-800">{selectedSiswa?.nama}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tagihan:</span>
              <span className="font-semibold text-slate-800">
                {selectedTagihan?.jenisPembayaran?.nama}{' '}
                {selectedTagihan?.bulan && `(${selectedTagihan.bulan})`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Total Tagihan:</span>
              <span className="font-mono text-slate-800">
                Rp {Number(selectedTagihan?.nominal || 0).toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-200">
              <span className="text-rose-600 font-bold">Sisa yang Harus Dibayar:</span>
              <span className="font-mono font-bold text-rose-600">
                Rp {Number(selectedTagihan?.sisa || 0).toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Jumlah Bayar (Rupiah) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={Number(selectedTagihan?.sisa || 0)}
              required
              value={bayarForm.jumlah_bayar}
              onChange={(e) =>
                setBayarForm({ ...bayarForm, jumlah_bayar: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-200 rounded-xl focus:outline-emerald-600"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * Masukkan nominal pelunasan penuh atau nominal cicilan sesuai uang yang diserahkan.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Metode Pembayaran
              </label>
              <select
                value={bayarForm.metode}
                onChange={(e) =>
                  setBayarForm({
                    ...bayarForm,
                    metode: e.target.value as 'Tunai' | 'Transfer',
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="Tunai">Tunai / Cash</option>
                <option value="Transfer">Transfer Bank</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tanggal Pembayaran
              </label>
              <input
                type="date"
                required
                value={bayarForm.tanggal_bayar}
                onChange={(e) =>
                  setBayarForm({ ...bayarForm, tanggal_bayar: e.target.value })
                }
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Catatan Transaksi (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: No. Ref Transfer, titipan wali santri, dll"
              value={bayarForm.catatan}
              onChange={(e) => setBayarForm({ ...bayarForm, catatan: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setBayarModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={bayarMutation.isPending}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {bayarMutation.isPending ? 'Menyimpan...' : 'Simpan & Cetak Kwitansi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Batalkan Pembayaran (VOID dengan Alasan Wajib) */}
      <Modal
        isOpen={voidModalOpen}
        onClose={() => setVoidModalOpen(false)}
        title="Batalkan Pembayaran (Void)"
        size="md"
      >
        <form onSubmit={handleVoidSubmit} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold">Perhatian: Transaksi Tidak Dapat Dihapus!</p>
              <p className="mt-0.5 text-[11px] text-rose-700">
                Sesuai standar audit keuangan madrasah, transaksi yang sudah terjadi hanya dapat dibatalkan (void) dengan menyertakan alasan yang sah. Nominal tagihan akan dikembalikan ke saldo siswa secara otomatis.
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs font-mono">
            <div>No. Kwitansi: <span className="font-bold text-slate-900">{voidTx?.nomor_transaksi}</span></div>
            <div>Jumlah: <span className="font-bold text-emerald-700">Rp {Number(voidTx?.jumlah_bayar || 0).toLocaleString('id-ID')}</span></div>
            <div>Tanggal: <span className="text-slate-700">{voidTx?.tanggal_bayar}</span></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Alasan Pembatalan <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Contoh: Kesalahan input nominal oleh kasir, cek/transfer ditolak bank, salah pilih siswa, dll..."
              value={alasanBatal}
              onChange={(e) => setAlasanBatal(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setVoidModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Kembali
            </button>
            <button
              type="submit"
              disabled={voidMutation.isPending}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {voidMutation.isPending ? 'Membatalkan...' : 'Konfirmasi Batalkan Transaksi'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Kwitansi Printable Modal */}
      <KwitansiModal
        isOpen={selectedTxId !== null}
        onClose={() => setSelectedTxId(null)}
        transaksiId={selectedTxId}
      />
    </div>
  );
}
