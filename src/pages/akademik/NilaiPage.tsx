import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { Kelas, Mapel, TahunAjaran, BobotNilai } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import {
  GraduationCap,
  Save,
  SlidersHorizontal,
  Award,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Calculator,
} from 'lucide-react';

export function NilaiPage() {
  const { hasPermission } = useAuth();
  const { success, error, warning } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('akademik', 'ubah') || hasPermission('akademik', 'tambah');

  // Filter
  const [selectedKelasId, setSelectedKelasId] = useState<string>('1');
  const [selectedMapelId, setSelectedMapelId] = useState<string>('3'); // Default Fikih

  // Modal Bobot
  const [bobotModalOpen, setBobotModalOpen] = useState(false);
  const [bobotForm, setBobotForm] = useState<BobotNilai>({
    tahun_ajaran_id: 1,
    bobot_tugas: 20,
    bobot_uh: 20,
    bobot_uts: 25,
    bobot_uas: 25,
    bobot_keterampilan: 10,
  });

  // Local table state for real-time spreadsheet calculations
  const [nilaiState, setNilaiState] = useState<
    Array<{
      siswa_id: number;
      nama: string;
      nis: string;
      nilai_tugas: number;
      nilai_uh: number;
      nilai_uts: number;
      nilai_uas: number;
      nilai_keterampilan: number;
      nilai_akhir: number;
      predikat: 'A' | 'B' | 'C' | 'D';
      catatan: string;
    }>
  >([]);

  // Queries
  const { data: taList = [] } = useQuery({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => {
      const res = await api.get<TahunAjaran[]>('/api/tahun-ajaran');
      return res.data || [];
    },
  });

  const activeTa = taList.find((t) => t.is_active) || taList[0];

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
      return res.data || [];
    },
  });

  const { data: rawMapelList = [] } = useQuery({
    queryKey: ['mapel-list'],
    queryFn: async () => {
      const res = await api.get<any>('/api/mapel?limit=100');
      return res.data?.data || [];
    },
  });

  // Scope filter jika user adalah guru
  const kelasList = guruScope?.isGuru
    ? rawKelasList.filter((k) => guruScope.allowedKelasIds?.includes(k.id))
    : rawKelasList;

  const mapelList = guruScope?.isGuru
    ? rawMapelList.filter((m: any) => guruScope.taughtMapelIds?.includes(m.id))
    : rawMapelList;

  // Query Bobot Nilai
  const { data: bobotData } = useQuery({
    queryKey: ['bobot-nilai', activeTa?.id],
    queryFn: async () => {
      if (!activeTa) return null;
      const res = await api.get<BobotNilai>(`/api/akademik/bobot?tahun_ajaran_id=${activeTa.id}`);
      return res.data;
    },
    enabled: Boolean(activeTa),
  });

  useEffect(() => {
    if (bobotData) {
      setBobotForm(bobotData);
    }
  }, [bobotData]);

  // Query Nilai Siswa
  const { data: serverNilaiList = [], isLoading } = useQuery({
    queryKey: ['nilai-siswa', selectedKelasId, selectedMapelId, activeTa?.id],
    queryFn: async () => {
      if (!selectedKelasId || !selectedMapelId || !activeTa) return [];
      const res = await api.get<any[]>(
        `/api/akademik/nilai?kelas_id=${selectedKelasId}&mapel_id=${selectedMapelId}&tahun_ajaran_id=${activeTa.id}`
      );
      return res.data || [];
    },
    enabled: Boolean(selectedKelasId && selectedMapelId && activeTa),
  });

  // Sinkronisasi data server ke state lokal
  useEffect(() => {
    if (serverNilaiList.length > 0) {
      const mapped = serverNilaiList.map((item) => ({
        siswa_id: item.siswa.id,
        nama: item.siswa.nama,
        nis: item.siswa.nis,
        nilai_tugas: Number(item.nilai_tugas) || 0,
        nilai_uh: Number(item.nilai_uh) || 0,
        nilai_uts: Number(item.nilai_uts) || 0,
        nilai_uas: Number(item.nilai_uas) || 0,
        nilai_keterampilan: Number(item.nilai_keterampilan) || 0,
        nilai_akhir: Number(item.nilai_akhir) || 0,
        predikat: item.predikat || 'C',
        catatan: item.catatan || '',
      }));
      setNilaiState(mapped);
    } else {
      setNilaiState([]);
    }
  }, [serverNilaiList]);

  // Current selected mapel info (for KKM)
  const currentMapel = rawMapelList.find((m: any) => String(m.id) === selectedMapelId);
  const currentKkm = currentMapel?.kkm || 75;

  // Real-time calculation helper
  const calculateFinalGrade = (
    tugas: number,
    uh: number,
    uts: number,
    uas: number,
    keterampilan: number
  ) => {
    const totalBobot =
      bobotForm.bobot_tugas +
      bobotForm.bobot_uh +
      bobotForm.bobot_uts +
      bobotForm.bobot_uas +
      bobotForm.bobot_keterampilan || 100;

    const raw =
      (tugas * bobotForm.bobot_tugas +
        uh * bobotForm.bobot_uh +
        uts * bobotForm.bobot_uts +
        uas * bobotForm.bobot_uas +
        keterampilan * bobotForm.bobot_keterampilan) /
      totalBobot;

    const final = Math.round(raw * 10) / 10;
    let predikat: 'A' | 'B' | 'C' | 'D' = 'C';
    if (final >= 90) predikat = 'A';
    else if (final >= 80) predikat = 'B';
    else if (final >= currentKkm) predikat = 'C';
    else predikat = 'D';

    return { final, predikat };
  };

  const handleScoreChange = (
    index: number,
    field: 'nilai_tugas' | 'nilai_uh' | 'nilai_uts' | 'nilai_uas' | 'nilai_keterampilan' | 'catatan',
    val: string
  ) => {
    setNilaiState((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === 'catatan') {
        item.catatan = val;
      } else {
        const numVal = Math.min(100, Math.max(0, Number(val) || 0));
        (item as any)[field] = numVal;

        const calc = calculateFinalGrade(
          item.nilai_tugas,
          item.nilai_uh,
          item.nilai_uts,
          item.nilai_uas,
          item.nilai_keterampilan
        );
        item.nilai_akhir = calc.final;
        item.predikat = calc.predikat;
      }

      copy[index] = item;
      return copy;
    });
  };

  // Mutations
  const saveNilaiMutation = useMutation({
    mutationFn: (items: any[]) =>
      api.post('/api/akademik/nilai/batch', {
        kelas_id: Number(selectedKelasId),
        mapel_id: Number(selectedMapelId),
        tahun_ajaran_id: activeTa?.id,
        items,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nilai-siswa'] });
      success('Seluruh nilai siswa berhasil disimpan.');
    },
    onError: (err: any) => error(err.message || 'Gagal menyimpan nilai.'),
  });

  const saveBobotMutation = useMutation({
    mutationFn: (data: BobotNilai) =>
      api.post('/api/akademik/bobot', {
        ...data,
        tahun_ajaran_id: activeTa?.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bobot-nilai'] });
      success('Konfigurasi bobot penilaian berhasil diperbarui.');
      setBobotModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menyimpan bobot.'),
  });

  const handleSaveAll = () => {
    if (nilaiState.length === 0) {
      warning('Tidak ada data siswa untuk disimpan.');
      return;
    }
    saveNilaiMutation.mutate(nilaiState);
  };

  const handleSaveBobot = (e: React.FormEvent) => {
    e.preventDefault();
    const total =
      Number(bobotForm.bobot_tugas) +
      Number(bobotForm.bobot_uh) +
      Number(bobotForm.bobot_uts) +
      Number(bobotForm.bobot_uas) +
      Number(bobotForm.bobot_keterampilan);

    if (total !== 100) {
      error(`Total seluruh bobot harus sama dengan 100% (saat ini ${total}%).`);
      return;
    }

    saveBobotMutation.mutate(bobotForm);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            Penilaian Hasil Belajar Siswa
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Input nilai tugas, ulangan harian, UTS, UAS, dan keterampilan dengan pembobotan otomatis dan penentuan predikat berdasarkan KKM.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBobotModalOpen(true)}
              className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-600" />
              Atur Bobot Penilaian
            </button>

            <button
              onClick={handleSaveAll}
              disabled={saveNilaiMutation.isPending || nilaiState.length === 0}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {saveNilaiMutation.isPending ? 'Menyimpan...' : 'Simpan Nilai'}
            </button>
          </div>
        )}
      </div>

      {/* Filter and Info Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Kelas:</span>
            <select
              value={selectedKelasId}
              onChange={(e) => setSelectedKelasId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white font-semibold text-emerald-800"
            >
              {kelasList.map((k) => (
                <option key={k.id} value={k.id}>
                  Kelas {k.nama} (Tingkat {k.tingkat})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Mata Pelajaran:</span>
            <select
              value={selectedMapelId}
              onChange={(e) => setSelectedMapelId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white font-semibold text-slate-800"
            >
              {mapelList.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.nama} ({m.kode} - KKM {m.kkm})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info Bobot Ringkas */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Calculator className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            Bobot: Tugas {bobotForm.bobot_tugas}% • UH {bobotForm.bobot_uh}% • UTS {bobotForm.bobot_uts}% • UAS {bobotForm.bobot_uas}% • Keterampilan {bobotForm.bobot_keterampilan}% (KKM: <strong className="text-emerald-700">{currentKkm}</strong>)
          </span>
        </div>
      </div>

      {/* Spreadsheet Input Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={5} cols={9} />
          </div>
        ) : nilaiState.length === 0 ? (
          <EmptyState
            title="Belum Ada Siswa di Kelas Ini"
            description="Tempatkan siswa ke dalam rombel ini terlebih dahulu melalui menu Penempatan Kelas."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">No</th>
                  <th className="py-3 px-3 min-w-[180px]">Nama Siswa</th>
                  <th className="py-3 px-2 w-20 text-center">Tugas ({bobotForm.bobot_tugas}%)</th>
                  <th className="py-3 px-2 w-20 text-center">UH ({bobotForm.bobot_uh}%)</th>
                  <th className="py-3 px-2 w-20 text-center">UTS ({bobotForm.bobot_uts}%)</th>
                  <th className="py-3 px-2 w-20 text-center">UAS ({bobotForm.bobot_uas}%)</th>
                  <th className="py-3 px-2 w-24 text-center">Keterampilan ({bobotForm.bobot_keterampilan}%)</th>
                  <th className="py-3 px-2 w-20 text-center bg-emerald-50/70 text-emerald-900 font-bold">
                    Nilai Akhir
                  </th>
                  <th className="py-3 px-2 w-16 text-center bg-emerald-50/70 text-emerald-900 font-bold">
                    Predikat
                  </th>
                  <th className="py-3 px-3 min-w-[160px]">Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {nilaiState.map((row, idx) => {
                  const isTuntas = row.nilai_akhir >= currentKkm;

                  return (
                    <tr key={row.siswa_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{row.nama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NIS: {row.nis}</div>
                      </td>

                      {/* Tugas */}
                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!canEdit}
                          value={row.nilai_tugas || ''}
                          onChange={(e) => handleScoreChange(idx, 'nilai_tugas', e.target.value)}
                          className="w-16 px-1.5 py-1 text-center font-semibold text-xs border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
                        />
                      </td>

                      {/* UH */}
                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!canEdit}
                          value={row.nilai_uh || ''}
                          onChange={(e) => handleScoreChange(idx, 'nilai_uh', e.target.value)}
                          className="w-16 px-1.5 py-1 text-center font-semibold text-xs border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
                        />
                      </td>

                      {/* UTS */}
                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!canEdit}
                          value={row.nilai_uts || ''}
                          onChange={(e) => handleScoreChange(idx, 'nilai_uts', e.target.value)}
                          className="w-16 px-1.5 py-1 text-center font-semibold text-xs border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
                        />
                      </td>

                      {/* UAS */}
                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!canEdit}
                          value={row.nilai_uas || ''}
                          onChange={(e) => handleScoreChange(idx, 'nilai_uas', e.target.value)}
                          className="w-16 px-1.5 py-1 text-center font-semibold text-xs border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
                        />
                      </td>

                      {/* Keterampilan */}
                      <td className="py-2 px-1 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          disabled={!canEdit}
                          value={row.nilai_keterampilan || ''}
                          onChange={(e) =>
                            handleScoreChange(idx, 'nilai_keterampilan', e.target.value)
                          }
                          className="w-16 px-1.5 py-1 text-center font-semibold text-xs border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
                        />
                      </td>

                      {/* Nilai Akhir (Otomatis) */}
                      <td className="py-2 px-2 text-center bg-emerald-50/50">
                        <div
                          className={`font-black text-xs ${
                            isTuntas ? 'text-emerald-800' : 'text-rose-700'
                          }`}
                        >
                          {row.nilai_akhir}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {isTuntas ? 'Tuntas' : 'Remedial'}
                        </div>
                      </td>

                      {/* Predikat (Otomatis) */}
                      <td className="py-2 px-2 text-center bg-emerald-50/50">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                            row.predikat === 'A'
                              ? 'bg-emerald-200 text-emerald-900'
                              : row.predikat === 'B'
                              ? 'bg-blue-100 text-blue-900'
                              : row.predikat === 'C'
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {row.predikat}
                        </span>
                      </td>

                      {/* Catatan */}
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          disabled={!canEdit}
                          value={row.catatan}
                          onChange={(e) => handleScoreChange(idx, 'catatan', e.target.value)}
                          placeholder="Catatan kemajuan..."
                          className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-emerald-600 bg-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Atur Bobot Penilaian */}
      <Modal
        isOpen={bobotModalOpen}
        onClose={() => setBobotModalOpen(false)}
        title="Konfigurasi Bobot Penilaian"
        maxWidth="md"
      >
        <form onSubmit={handleSaveBobot} className="space-y-4">
          <p className="text-xs text-slate-500">
            Atur persentase bobot setiap komponen nilai. Total kumulatif kelima komponen harus tepat 100%.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Bobot Tugas Mandiri / Terstruktur</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={bobotForm.bobot_tugas}
                  onChange={(e) => setBobotForm({ ...bobotForm, bobot_tugas: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg focus:outline-emerald-600"
                  required
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Bobot Ulangan Harian (UH)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={bobotForm.bobot_uh}
                  onChange={(e) => setBobotForm({ ...bobotForm, bobot_uh: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg focus:outline-emerald-600"
                  required
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Bobot Ujian Tengah Semester (UTS)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={bobotForm.bobot_uts}
                  onChange={(e) => setBobotForm({ ...bobotForm, bobot_uts: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg focus:outline-emerald-600"
                  required
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Bobot Ujian Akhir Semester (UAS)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={bobotForm.bobot_uas}
                  onChange={(e) => setBobotForm({ ...bobotForm, bobot_uas: Number(e.target.value) })}
                  className="w-16 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg focus:outline-emerald-600"
                  required
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Bobot Praktik / Keterampilan</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={bobotForm.bobot_keterampilan}
                  onChange={(e) =>
                    setBobotForm({ ...bobotForm, bobot_keterampilan: Number(e.target.value) })
                  }
                  className="w-16 px-2 py-1 text-xs text-center border border-slate-300 rounded-lg focus:outline-emerald-600"
                  required
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">Total Akumulasi Bobot:</span>
            <span
              className={`font-black text-sm ${
                bobotForm.bobot_tugas +
                  bobotForm.bobot_uh +
                  bobotForm.bobot_uts +
                  bobotForm.bobot_uas +
                  bobotForm.bobot_keterampilan ===
                100
                  ? 'text-emerald-700'
                  : 'text-rose-600'
              }`}
            >
              {bobotForm.bobot_tugas +
                bobotForm.bobot_uh +
                bobotForm.bobot_uts +
                bobotForm.bobot_uas +
                bobotForm.bobot_keterampilan}
              %
            </span>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setBobotModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saveBobotMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 rounded-xl transition-colors cursor-pointer"
            >
              {saveBobotMutation.isPending ? 'Menyimpan...' : 'Simpan Bobot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
