import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Kelas, Siswa, TahunAjaran, RaporData } from '../../types';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Printer,
  School,
  AlertCircle,
} from 'lucide-react';

export function RaporPage() {
  const { user } = useAuth();

  // Queries
 const { data: rawTaList = [], isLoading: isLoadingTa, error: taError } = useQuery({
  queryKey: ['tahun-ajaran-simple'],
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

  const { data: rawKelasList = [], isLoading: isLoadingKelas } = useQuery({
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

  // Filters
  const [selectedKelasId, setSelectedKelasId] = useState<string>('');
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('');

  // Auto-select first class when kelasList loads
  useEffect(() => {
    if (kelasList.length > 0 && (!selectedKelasId || !kelasList.some((k) => String(k?.id) === selectedKelasId))) {
      setSelectedKelasId(String(kelasList[0]?.id));
    }
  }, [kelasList, selectedKelasId]);

  // Siswa in this class
  const { data: rawSiswaList = [], isLoading: isLoadingSiswa } = useQuery({
    queryKey: ['siswa-in-kelas', selectedKelasId],
    queryFn: async () => {
      if (!selectedKelasId) return [];
      const res = await api.get<any>(`/api/siswa?kelas_id=${selectedKelasId}&limit=100`);
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    },
    enabled: Boolean(selectedKelasId),
  });

  const siswaList = Array.isArray(rawSiswaList) ? rawSiswaList : [];

  // Auto-select first student when siswaList loads
  useEffect(() => {
    if (siswaList.length > 0 && (!selectedSiswaId || !siswaList.some((s) => String(s?.id) === selectedSiswaId))) {
      setSelectedSiswaId(String(siswaList[0]?.id));
    } else if (siswaList.length === 0) {
      setSelectedSiswaId('');
    }
  }, [siswaList, selectedSiswaId]);

  // Query Rapor Lengkap
  const { data: rawRaporData, isLoading: isLoadingRapor } = useQuery({
    queryKey: ['rapor-lengkap', selectedSiswaId, activeTa?.id],
    queryFn: async () => {
      if (!selectedSiswaId) return null;
      const res = await api.get<any>(
        `/api/akademik/rapor/${selectedSiswaId}?tahun_ajaran_id=${activeTa?.id}`
      );
      return res.data || null;
    },
    enabled: Boolean(selectedSiswaId && activeTa),
  });

  const raporData = rawRaporData || null;

  const handlePrint = () => {
    window.print();
  };

    if (isLoadingTa) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xs">
        <TableSkeleton rows={6} cols={4} />
      </div>
    );
  }

  if (taError) {
    return (
      <EmptyState
        title="Gagal Memuat Tahun Ajaran"
        description={(taError as Error).message}
        icon={<AlertCircle className="w-8 h-8 text-red-600" />}
      />
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

  // Normalized safe properties from raporData (supporting both camelCase and snake_case)
  const safeTa = raporData?.tahunAjaran || raporData?.tahun_ajaran || activeTa;
  const safeMadrasah = raporData?.madrasah || { nama: 'Madrasah' };
  const safeSiswa = raporData?.siswa;
  const safeKelas = raporData?.kelas;
  const safeWaliKelas = raporData?.waliKelas || raporData?.wali_kelas;
  const safeCatatan = raporData?.catatanRapor || raporData?.catatan || {
    sikap_spiritual: 'Baik',
    deskripsi_spiritual: 'Menunjukkan ketaatan beribadah dan akhlak terpuji.',
    sikap_sosial: 'Baik',
    deskripsi_sosial: 'Menunjukkan kepedulian sosial, sopan santun, dan kerja sama yang baik.',
    juz_hafalan: 'Juz 30',
    surah_terakhir: 'An-Naba',
    predikat_tahfidz: 'Jayyid',
    catatan_wali_kelas: 'Tingkatkan terus prestasi belajar dan kedisiplinan.',
    status_akhir: 'Belum Ditentukan',
  };
  const safeNilaiList: any[] = Array.isArray(raporData?.nilaiList)
    ? raporData.nilaiList
    : Array.isArray(raporData?.nilai)
    ? raporData.nilai
    : [];
  const safeAbsensi = raporData?.rekapAbsensi || raporData?.absensi || { hadir: 0, izin: 0, sakit: 0, alpa: 0 };

  return (
    <div className="space-y-6">
      {/* Action / Filter Header - HIDDEN saat Cetak (print:hidden) */}
      <div className="print:hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Cetak Rapor & Transkrip Siswa
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Rapor hasil belajar dengan kop resmi madrasah, rekap nilai mata pelajaran, capaian tahfidz, catatan wali kelas, dan absensi siap cetak PDF.
            </p>
          </div>

          <button
            onClick={handlePrint}
            disabled={!raporData}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Cetak Rapor (PDF)
          </button>
        </div>

        {/* Filter Selection Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Pilih Rombel / Kelas:
            </span>
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

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">
              Pilih Siswa:
            </span>
            <select
              value={selectedSiswaId}
              onChange={(e) => setSelectedSiswaId(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white font-semibold text-slate-800 max-w-xs"
            >
              {siswaList.length === 0 ? (
                <option value="">-- Belum Ada Siswa --</option>
              ) : (
                siswaList.map((s: Siswa) => (
                  <option key={s?.id} value={s?.id}>
                    {s?.nama} ({s?.nis || '-'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* RAPOR DOKUMEN CETAK - Printable Sheet */}
      {isLoadingRapor ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm print:hidden">
          <TableSkeleton rows={8} cols={5} />
        </div>
      ) : !raporData ? (
        <div className="print:hidden">
          <EmptyState
            title="Data Rapor Tidak Ditemukan"
            description="Pilih rombel dan nama siswa untuk memuat rapor."
          />
        </div>
      ) : (
        <div className="print-area print-a4 bg-white rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none p-6 sm:p-10 max-w-4xl mx-auto print:p-0 print:m-0 text-slate-900 font-serif leading-relaxed">
          {/* 1. KOP SURAT MADRASAH */}
          <div className="border-b-4 border-double border-slate-900 pb-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="w-20 h-20 flex items-center justify-center border-2 border-emerald-800 rounded-full bg-emerald-50 shrink-0">
                {safeMadrasah?.logo_url ? (
                  <img
                    src={safeMadrasah.logo_url}
                    alt="Logo"
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <School className="w-10 h-10 text-emerald-800" />
                )}
              </div>

              <div className="flex-1 text-center font-sans">
                <p className="text-xs font-bold tracking-widest text-slate-700 uppercase">
                  KEMENTERIAN AGAMA REPUBLIK INDONESIA
                </p>
                <h1 className="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-slate-900">
                  {safeMadrasah?.nama || 'Madrasah'}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  NSM: {safeMadrasah?.nsm || '-'} • NPSN: {safeMadrasah?.npsn || '-'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {safeMadrasah?.alamat || 'Alamat Madrasah'} • Telp: {safeMadrasah?.telepon || '-'} • Email: {safeMadrasah?.email || '-'}
                </p>
              </div>

              <div className="w-20 hidden sm:block shrink-0" />
            </div>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center mb-6 font-sans">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 underline decoration-1">
              LAPORAN HASIL CAPAIAN KOMPETENSI PESERTA DIDIK
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Tahun Ajaran {safeTa?.tahun || '-'} — Semester {safeTa?.semester || '-'}
            </p>
          </div>

          {/* 2. IDENTITAS SISWA */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs font-sans mb-6 pb-4 border-b border-slate-200">
            <div className="flex">
              <span className="w-32 text-slate-600">Nama Peserta Didik</span>
              <span className="font-bold text-slate-900">: {safeSiswa?.nama || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-600">Kelas / Rombel</span>
              <span className="font-bold text-slate-900">: Kelas {safeKelas?.nama || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-600">NIS / NISN</span>
              <span className="font-mono text-slate-900">
                : {safeSiswa?.nis || '-'} / {safeSiswa?.nisn || '-'}
              </span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-600">Semester</span>
              <span className="text-slate-900">: {safeTa?.semester || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-600">Nama Wali Kelas</span>
              <span className="text-slate-900">: {safeWaliKelas?.nama || '-'}</span>
            </div>
            <div className="flex">
              <span className="w-32 text-slate-600">Tahun Ajaran</span>
              <span className="text-slate-900">: {safeTa?.tahun || '-'}</span>
            </div>
          </div>

          {/* 3. CAPAIAN SIKAP SPIRITUAL & SOSIAL */}
          <div className="mb-6 space-y-3 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 border-l-4 border-emerald-700">
              A. Sikap Spiritual & Sosial
            </h3>
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 text-center font-bold">
                  <th className="py-2 px-3 border-r border-slate-300 w-40">Aspek Sikap</th>
                  <th className="py-2 px-3 border-r border-slate-300 w-28">Predikat</th>
                  <th className="py-2 px-3 text-left">Deskripsi / Catatan Perilaku</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-2 px-3 font-semibold border-r border-slate-300 text-center">
                    Sikap Spiritual
                  </td>
                  <td className="py-2 px-3 font-bold border-r border-slate-300 text-center text-emerald-800">
                    {safeCatatan?.sikap_spiritual || 'Baik'}
                  </td>
                  <td className="py-2 px-3 text-slate-700 leading-snug">
                    {safeCatatan?.deskripsi_spiritual ||
                      'Selalu taat menjalankan ibadah shalat dan berdoa secara tertib.'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold border-r border-slate-300 text-center">
                    Sikap Sosial
                  </td>
                  <td className="py-2 px-3 font-bold border-r border-slate-300 text-center text-emerald-800">
                    {safeCatatan?.sikap_sosial || 'Baik'}
                  </td>
                  <td className="py-2 px-3 text-slate-700 leading-snug">
                    {safeCatatan?.deskripsi_sosial ||
                      'Menunjukkan sikap santun, jujur, peduli sesama, dan tanggung jawab yang sangat baik.'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 4. TABEL NILAI MATA PELAJARAN */}
          <div className="mb-6 space-y-3 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 border-l-4 border-emerald-700">
              B. Pengetahuan & Keterampilan
            </h3>
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 font-bold text-center">
                  <th className="py-2 px-2 border-r border-slate-300 w-10">No</th>
                  <th className="py-2 px-3 border-r border-slate-300 text-left">Mata Pelajaran</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-14">KKM</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-16">Nilai Akhir</th>
                  <th className="py-2 px-2 border-r border-slate-300 w-16">Predikat</th>
                  <th className="py-2 px-3 text-left">Keterangan Capaian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {safeNilaiList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-3 text-center text-slate-400">
                      Belum ada nilai yang diinputkan untuk siswa ini.
                    </td>
                  </tr>
                ) : (
                  safeNilaiList.map((item, idx) => {
                    const mapelNama = item?.mapel?.nama || item?.nama || '-';
                    const mapelKelompok = item?.mapel?.kelompok || item?.kelompok;
                    const mapelKkm = item?.mapel?.kkm ?? item?.kkm ?? 75;
                    const nilaiAkhir = Number(item?.nilai_akhir) || 0;
                    const predikat = item?.predikat || 'C';

                    return (
                      <tr key={item?.mapel?.id || item?.mapel_id || idx}>
                        <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-300 font-semibold text-slate-900">
                          {mapelNama}
                          {mapelKelompok && (
                            <span className="text-[10px] text-slate-400 font-normal ml-2">
                              ({mapelKelompok})
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-300 text-center font-mono">
                          {mapelKkm}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-300 text-center font-extrabold text-slate-900 font-mono">
                          {nilaiAkhir}
                        </td>
                        <td className="py-1.5 px-2 border-r border-slate-300 text-center font-bold">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              predikat === 'A'
                                ? 'bg-emerald-100 text-emerald-900'
                                : predikat === 'B'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {predikat}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-[11px] text-slate-600">
                          {item?.catatan || (nilaiAkhir >= mapelKkm ? 'Tuntas' : 'Remedial')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 5. CAPAIAN TAHFIDZ & HAFALAN AL-QUR'AN */}
          <div className="mb-6 space-y-3 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1.5 border-l-4 border-emerald-700">
              C. Capaian Tahfidz & Hafalan Al-Qur'an
            </h3>
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-300 text-slate-700 text-center font-bold">
                  <th className="py-2 px-3 border-r border-slate-300">Target / Juz Hafalan</th>
                  <th className="py-2 px-3 border-r border-slate-300">Surah & Ayat Terakhir</th>
                  <th className="py-2 px-3">Predikat Tahfidz</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 px-3 border-r border-slate-300 text-center font-semibold">
                    {safeCatatan?.juz_hafalan || 'Juz 30'}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300 text-center">
                    {safeCatatan?.surah_terakhir || 'An-Naba s.d. An-Nas'}
                  </td>
                  <td className="py-2 px-3 text-center font-bold text-emerald-800">
                    {safeCatatan?.predikat_tahfidz || 'Jayyid'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6. REKAP ABSENSI & KEPUTUSAN WALI KELAS */}
          <div className="grid grid-cols-2 gap-4 mb-8 font-sans">
            {/* Rekap Absensi */}
            <div className="border border-slate-300 rounded-lg p-3">
              <h4 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-1.5 mb-2">
                D. Rekapitulasi Kehadiran
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Hadir (H)</span>
                  <span className="font-bold text-emerald-700">
                    {safeAbsensi?.hadir ?? 0} Hari
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Izin (I)</span>
                  <span className="font-bold text-blue-700">{safeAbsensi?.izin ?? 0} Hari</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Sakit (S)</span>
                  <span className="font-bold text-amber-700">
                    {safeAbsensi?.sakit ?? 0} Hari
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-600">Tanpa Keterangan (A)</span>
                  <span className="font-bold text-rose-700">{safeAbsensi?.alpa ?? 0} Hari</span>
                </div>
              </div>
            </div>

            {/* Catatan & Rekomendasi */}
            <div className="border border-slate-300 rounded-lg p-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-800 border-b border-slate-200 pb-1.5 mb-2">
                  E. Catatan Wali Kelas
                </h4>
                <p className="text-xs text-slate-700 italic leading-relaxed">
                  "{safeCatatan?.catatan_wali_kelas ||
                    'Pertahankan prestasimu dan terus bersemangat dalam menuntut ilmu.'}"
                </p>
              </div>

              {safeCatatan?.status_akhir && safeCatatan.status_akhir !== 'Belum Ditentukan' && (
                <div className="pt-2 border-t border-slate-200 text-xs font-bold text-emerald-800">
                  Keputusan: {safeCatatan.status_akhir}{' '}
                  {safeCatatan.naik_ke_kelas &&
                    `ke Kelas ${safeCatatan.naik_ke_kelas}`}
                </div>
              )}
            </div>
          </div>

          {/* 7. TANDA TANGAN (KOP LEMBAR PENGESAHAN) */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs font-sans mt-8 pt-4">
            <div>
              <p className="text-slate-500">Mengetahui,</p>
              <p className="font-semibold text-slate-800">Orang Tua / Wali Siswa</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-6">
                ( ..................................... )
              </p>
            </div>

            <div>
              <p className="text-slate-500">
                {safeMadrasah?.alamat?.split(',')[0] || 'Madrasah'},{' '}
                {new Date().toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="font-semibold text-slate-800">Wali Kelas</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-4">
                {safeWaliKelas?.nama || '( ..................................... )'}
              </p>
              {safeWaliKelas?.nip && (
                <p className="text-[10px] text-slate-500 font-mono">
                  NIP. {safeWaliKelas.nip}
                </p>
              )}
            </div>

            <div>
              <p className="text-slate-500">Mengetahui,</p>
              <p className="font-semibold text-slate-800">Kepala Madrasah</p>
              <div className="h-16" />
              <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-4">
                {safeMadrasah?.kepala_madrasah || '( ..................................... )'}
              </p>
              {safeMadrasah?.nip_kepala && (
                <p className="text-[10px] text-slate-500 font-mono">
                  NIP. {safeMadrasah.nip_kepala}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
