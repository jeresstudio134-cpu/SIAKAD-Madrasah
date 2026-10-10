import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Kelas, TahunAjaran, CatatanRaporSiswa } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  HeartHandshake,
  BookMarked,
  Save,
  Award,
  Sparkles,
  UserCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export function SikapTahfidzPage() {
  const { hasPermission } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('akademik', 'ubah') || hasPermission('akademik', 'tambah');

  // Filter
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');

  // Local state for batch editing
  const [catatanState, setCatatanState] = useState<
    Array<{
      siswa_id: number;
      nama: string;
      nis: string;
      sikap_spiritual: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
      deskripsi_spiritual: string;
      sikap_sosial: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
      deskripsi_sosial: string;
      juz_hafalan: string;
      surah_terakhir: string;
      predikat_tahfidz: 'Mutqin' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul';
      catatan_wali_kelas: string;
      status_akhir: 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus' | 'Belum Ditentukan';
      naik_ke_kelas: string;
    }>
  >([]);

  // Queries
  const { data: rawTaList = [], isLoading: isLoadingTa } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran/simple');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const taList = Array.isArray(rawTaList) ? rawTaList : [];
  const activeTa = taList.find((t) => t?.is_active) || taList[0];

  const { data: guruScope } = useQuery({
    queryKey: ['guru-scope'],
    queryFn: async () => {
      const res = await api.get<any>('/api/akademik/guru-scope');
      return res.data;
    },
  });

  const { data: rawKelasList = [] } = useQuery({
    queryKey: ['kelas-simple'],
    queryFn: async () => {
      const res = await api.get<Kelas[]>('/api/kelas/simple');
      return Array.isArray(res.data) ? res.data : [];
    },
  });

  const validRawKelas = Array.isArray(rawKelasList) ? rawKelasList : [];
  const kelasList = guruScope?.isGuru
    ? validRawKelas.filter((k) => guruScope.allowedKelasIds?.includes(k?.id))
    : validRawKelas;

  // Auto-select first class when kelasList loads
  useEffect(() => {
    if (kelasList.length > 0 && (!selectedKelasId || !kelasList.some((k) => String(k?.id) === selectedKelasId))) {
      setSelectedKelasId(String(kelasList[0]?.id));
    }
  }, [kelasList, selectedKelasId]);

  // Query Catatan Rapor
  const { data: serverCatatanList = [], isLoading } = useQuery({
    queryKey: ['catatan-rapor', selectedKelasId, activeTa?.id],
    queryFn: async () => {
      if (!selectedKelasId || !activeTa) return [];
      const res = await api.get<any[]>(
        `/api/akademik/catatan-rapor?kelas_id=${selectedKelasId}&tahun_ajaran_id=${activeTa.id}`
      );
      const items = res.data || [];
      return Array.isArray(items) ? items : [];
    },
    enabled: Boolean(selectedKelasId && activeTa),
  });

  useEffect(() => {
    if (Array.isArray(serverCatatanList) && serverCatatanList.length > 0) {
      setCatatanState(
        serverCatatanList.map((item) => {
          const sId = item?.siswa?.id ?? item?.siswa_id ?? 0;
          const sNama = item?.siswa?.nama ?? item?.nama ?? '-';
          const sNis = item?.siswa?.nis ?? item?.nis ?? '-';
          return {
            siswa_id: sId,
            nama: sNama,
            nis: sNis,
            sikap_spiritual: item?.sikap_spiritual || 'Baik',
            deskripsi_spiritual: item?.deskripsi_spiritual || '',
            sikap_sosial: item?.sikap_sosial || 'Baik',
            deskripsi_sosial: item?.deskripsi_sosial || '',
            juz_hafalan: item?.juz_hafalan || '',
            surah_terakhir: item?.surah_terakhir || '',
            predikat_tahfidz: item?.predikat_tahfidz || 'Jayyid',
            catatan_wali_kelas: item?.catatan_wali_kelas || '',
            status_akhir: item?.status_akhir || 'Belum Ditentukan',
            naik_ke_kelas: item?.naik_ke_kelas || '',
          };
        })
      );
    } else {
      setCatatanState([]);
    }
  }, [serverCatatanList]);

  const handleChange = (index: number, field: string, value: any) => {
    setCatatanState((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  // Mutation
  const saveMutation = useMutation({
    mutationFn: (items: any[]) =>
      api.post('/api/akademik/catatan-rapor/batch', {
        kelas_id: Number(selectedKelasId),
        tahun_ajaran_id: activeTa?.id,
        items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catatan-rapor'] });
      success('Catatan sikap, tahfidz, dan wali kelas berhasil disimpan.');
    },
    onError: (err: any) => error(err.message || 'Gagal menyimpan catatan.'),
  });

  const handleSaveAll = () => {
    if (catatanState.length === 0) {
      warning('Tidak ada data siswa untuk disimpan.');
      return;
    }
    saveMutation.mutate(catatanState);
  };

  if (isLoadingTa) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs">
        <TableSkeleton rows={6} cols={5} />
      </div>
    );
  }

  if (!activeTa) {
    return (
      <EmptyState
        title="Belum Ada Tahun Ajaran Aktif"
        description="Belum ada tahun ajaran aktif, atur di menu Tahun Ajaran."
        icon={<AlertCircle className="w-8 h-8 text-amber-600" />}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Penilaian Sikap, Akhlak & Catatan Tahfidz
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penilaian sikap spiritual dan sosial peserta didik, capaian hafalan Al-Qur'an (Tahfidz), serta rekomendasi wali kelas.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleSaveAll}
            disabled={saveMutation.isPending || catatanState.length === 0}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Seluruh Catatan'}
          </button>
        )}
      </div>

      {/* Filter Rombel */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700">Pilih Rombel / Kelas:</span>
          <select
            value={selectedKelasId}
            onChange={(e) => setSelectedKelasId(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white font-semibold text-emerald-800"
          >
            {kelasList.length === 0 ? (
              <option value="">-- Belum Ada Kelas --</option>
            ) : (
              kelasList.map((k) => (
                <option key={k?.id} value={k?.id}>
                  Kelas {k?.nama} (Tingkat {k?.tingkat})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Total <strong>{catatanState.length}</strong> siswa siap dinilai
        </div>
      </div>

      {/* List Kartu Siswa */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={4} />
          </div>
        ) : catatanState.length === 0 ? (
          <EmptyState
            title="Belum Ada Siswa di Kelas Ini"
            description="Silakan tempatkan siswa ke kelas ini terlebih dahulu."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {catatanState.map((row, idx) => (
              <div key={row.siswa_id || idx} className="p-5 hover:bg-slate-50/50 transition-colors">
                {/* Header Siswa */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{row.nama}</h4>
                      <div className="text-[11px] text-slate-400 font-mono">NIS: {row.nis}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600">
                      Keputusan Akhir Semester:
                    </span>
                    <select
                      disabled={!canEdit}
                      value={row.status_akhir}
                      onChange={(e) => handleChange(idx, 'status_akhir', e.target.value)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white focus:outline-emerald-600"
                    >
                      <option value="Belum Ditentukan">Belum Ditentukan</option>
                      <option value="Naik Kelas">Naik Kelas</option>
                      <option value="Tinggal Kelas">Tinggal Kelas</option>
                      <option value="Lulus">Lulus</option>
                    </select>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  {/* Kolom 1: Sikap Spiritual & Sosial */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <HeartHandshake className="w-4 h-4 text-emerald-600" />
                      <span>Sikap Spiritual & Sosial</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Predikat Sikap Spiritual
                      </label>
                      <select
                        disabled={!canEdit}
                        value={row.sikap_spiritual}
                        onChange={(e) => handleChange(idx, 'sikap_spiritual', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600"
                      >
                        <option value="Sangat Baik">Sangat Baik</option>
                        <option value="Baik">Baik</option>
                        <option value="Cukup">Cukup</option>
                        <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Deskripsi Sikap Spiritual
                      </label>
                      <textarea
                        rows={2}
                        disabled={!canEdit}
                        value={row.deskripsi_spiritual}
                        onChange={(e) => handleChange(idx, 'deskripsi_spiritual', e.target.value)}
                        placeholder="Contoh: Ketaatan beribadah dan doa sangat khusyuk..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Predikat Sikap Sosial
                      </label>
                      <select
                        disabled={!canEdit}
                        value={row.sikap_sosial}
                        onChange={(e) => handleChange(idx, 'sikap_sosial', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600"
                      >
                        <option value="Sangat Baik">Sangat Baik</option>
                        <option value="Baik">Baik</option>
                        <option value="Cukup">Cukup</option>
                        <option value="Perlu Bimbingan">Perlu Bimbingan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Deskripsi Sikap Sosial
                      </label>
                      <textarea
                        rows={2}
                        disabled={!canEdit}
                        value={row.deskripsi_sosial}
                        onChange={(e) => handleChange(idx, 'deskripsi_sosial', e.target.value)}
                        placeholder="Contoh: Sangat santun, jujur dan suka tolong menolong..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600 resize-none"
                      />
                    </div>
                  </div>

                  {/* Kolom 2: Capaian Tahfidz */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <BookMarked className="w-4 h-4 text-emerald-600" />
                      <span>Capaian Hafalan (Tahfidz)</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Target / Juz Capaian
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={row.juz_hafalan}
                        onChange={(e) => handleChange(idx, 'juz_hafalan', e.target.value)}
                        placeholder="Contoh: Juz 30 / Juz 29"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Surah Terakhir
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={row.surah_terakhir}
                        onChange={(e) => handleChange(idx, 'surah_terakhir', e.target.value)}
                        placeholder="Contoh: An-Naba s.d. An-Nas"
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Predikat Tahfidz
                      </label>
                      <select
                        disabled={!canEdit}
                        value={row.predikat_tahfidz}
                        onChange={(e) => handleChange(idx, 'predikat_tahfidz', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600 font-semibold text-emerald-800"
                      >
                        <option value="Mutqin">Mutqin (Sangat Lancar)</option>
                        <option value="Jayyid Jiddan">Jayyid Jiddan (Lancar Baik)</option>
                        <option value="Jayyid">Jayyid (Cukup Lancar)</option>
                        <option value="Maqbul">Maqbul (Perlu Murajaah)</option>
                      </select>
                    </div>
                  </div>

                  {/* Kolom 3: Catatan Wali Kelas */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Catatan & Rekomendasi Wali Kelas</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Pesan Pembinaan untuk Rapor
                      </label>
                      <textarea
                        rows={5}
                        disabled={!canEdit}
                        value={row.catatan_wali_kelas}
                        onChange={(e) => handleChange(idx, 'catatan_wali_kelas', e.target.value)}
                        placeholder="Tuliskan catatan apresiasi, motivasi belajar, dan pesan akhlak bagi siswa dan wali murid..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600 resize-none"
                      />
                    </div>

                    {row.status_akhir === 'Naik Kelas' && (
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Rekomendasi Naik ke Kelas
                        </label>
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={row.naik_ke_kelas}
                          onChange={(e) => handleChange(idx, 'naik_ke_kelas', e.target.value)}
                          placeholder="Contoh: 8A / 9B"
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-emerald-600"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
