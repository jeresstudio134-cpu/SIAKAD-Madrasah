import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import {
  School,
  Sparkles,
  Upload,
  CheckCircle2,
  Clock,
  Search,
  Printer,
  ChevronRight,
  HelpCircle,
  FileText,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  XCircle,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PPDBPendaftar } from '../../types';
import { PrintPaperBar } from '../../components/ui/PrintPaperBar';
import { PaperSize, triggerPrint } from '../../lib/print-utils';

export function PPDBPublicPage() {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'daftar' | 'status'>('daftar');
  const [searchNomor, setSearchNomor] = useState('');
  const [searchedData, setSearchedData] = useState<PPDBPendaftar | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [paper, setPaper] = useState<PaperSize>('a4');

  // Form State
  const [form, setForm] = useState({
    nama_lengkap: '',
    nisn: '',
    nik: '',
    jenis_kelamin: 'L' as 'L' | 'P',
    tempat_lahir: '',
    tanggal_lahir: '',
    sekolah_asal: '',
    nama_ayah: '',
    nama_ibu: '',
    telepon_ortu: '',
    email_ortu: '',
    alamat: '',
    jalur_pendaftaran: 'Reguler' as 'Reguler' | 'Prestasi' | 'Tahfidz' | 'Afirmasi',
    berkas_foto_url: '',
    berkas_ijazah_url: '',
    berkas_akta_url: '',
    berkas_kk_url: '',
  });

  const [registeredResult, setRegisteredResult] = useState<PPDBPendaftar | null>(null);

  // Query PPDB Info Publik
  const { data: infoData } = useQuery({
    queryKey: ['ppdb-info'],
    queryFn: async () => {
      const res = await api.get('/api/ppdb/info');
      return res.data;
    },
  });

  // Handle Upload Berkas (Cloudinary / File reader)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'berkas_foto_url' | 'berkas_ijazah_url' | 'berkas_akta_url' | 'berkas_kk_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toastError('Ukuran file maksimal 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await api.post('/api/ppdb/upload', {
          file: base64,
          folder: 'siakad_ppdb',
        });
        const url = res.data?.url || base64;
        setForm((prev) => ({ ...prev, [field]: url }));
        success('Berkas berhasil diunggah!');
      } catch {
        // Fallback simpan data URI
        setForm((prev) => ({ ...prev, [field]: base64 }));
        success('Berkas tersimpan.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Mutation Pendaftaran
  const daftarMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/api/ppdb/daftar', data),
    onSuccess: (res: any) => {
      setRegisteredResult(res.data);
      success(res.message || 'Pendaftaran berhasil dikirim!');
    },
    onError: (err: any) => {
      toastError(err.message || 'Gagal mengirim formulir pendaftaran.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_lengkap.trim()) {
      toastError('Nama lengkap calon santri wajib diisi.');
      return;
    }
    if (!form.sekolah_asal.trim()) {
      toastError('Asal sekolah / madrasah wajib diisi.');
      return;
    }
    if (!form.telepon_ortu.trim()) {
      toastError('Nomor telepon / WhatsApp orang tua wajib diisi.');
      return;
    }

    daftarMutation.mutate(form);
  };

  // Cek Status Pendaftaran
  const handleCekStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchNomor.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    setSearchedData(null);

    try {
      const res = await api.get(`/api/ppdb/cek/${encodeURIComponent(searchNomor.trim())}`);
      if (res.data) {
        setSearchedData(res.data);
      } else {
        setSearchError('Nomor pendaftaran atau NISN tidak ditemukan.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Nomor pendaftaran atau NISN tidak ditemukan.');
    } finally {
      setIsSearching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'diterima':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Diterima / Lulus Seleksi
          </span>
        );
      case 'terverifikasi':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <ShieldCheck className="w-3.5 h-3.5" /> Berkas Terverifikasi
          </span>
        );
      case 'cadangan':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
            <UserCheck className="w-3.5 h-3.5" /> Santri Cadangan
          </span>
        );
      case 'ditolak':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" /> Tidak Lulus Seleksi
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5" /> Menunggu Verifikasi Berkas
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
              <School className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-800 leading-tight">
                PPDB Online {infoData?.madrasah?.nama || 'Madrasah Tsanawiyah'}
              </h1>
              <p className="text-xs text-slate-500">
                Tahun Ajaran {infoData?.tahunAjaran?.tahun || '2024/2025'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-xs font-semibold px-4 py-2 text-slate-700 hover:text-emerald-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Masuk Staf & Guru
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white py-12 px-4 shadow-inner print:hidden">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-800/80 border border-emerald-600/40 text-amber-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Penerimaan Peserta Didik Baru (PPDB) Madrasah Terpadu</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Selamat Datang Calon Santri & Wali Santri
          </h2>
          <p className="text-sm sm:text-base text-emerald-100 max-w-2xl mx-auto leading-relaxed">
            Daftarkan putra-putri Anda secara online dengan mudah, cepat, dan transparan. Unggah dokumen pendukung dan pantau status kelulusan secara real-time.
          </p>

          {/* Tab Selector */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-emerald-950/60 border border-emerald-700/60">
              <button
                onClick={() => {
                  setActiveTab('daftar');
                  setRegisteredResult(null);
                }}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'daftar'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Formulir Pendaftaran
              </button>
              <button
                onClick={() => setActiveTab('status')}
                className={`px-5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'status'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                Cek Status Kelulusan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* ==================================================== */}
        {/* TAB 1: FORMULIR PENDAFTARAN */}
        {/* ==================================================== */}
        {activeTab === 'daftar' && (
          <div>
            {registeredResult ? (
              /* Kartu Bukti Pendaftaran Setelah Berhasil */
              <div className="space-y-4">
                {/* Print Paper Toolbar */}
                <PrintPaperBar
                  paper={paper}
                  onPaperChange={setPaper}
                  allowedPapers={['a4', 'f4']}
                  printLabel="Cetak Bukti Pendaftaran"
                  onPrint={() => triggerPrint({ paper, orientation: 'portrait' })}
                />

                {/* Kartu Bukti Pendaftaran Resmi */}
                <div
                  className={`print-area ${
                    paper === 'f4' ? 'print-f4 sheet-preview-f4' : 'print-a4 sheet-preview-a4'
                  } bg-white rounded-3xl p-6 sm:p-8 border border-emerald-200 shadow-xl space-y-5 print:border-none print:shadow-none print:p-0 print:m-0 print:space-y-4 print:rounded-none`}
                >
                  {/* Kop Surat Madrasah Khusus Dokumen Cetak */}
                  <div className="kop-surat border-b-2 border-slate-800 pb-3 mb-2 print:block hidden text-center">
                    <p className="text-[10px] font-bold tracking-widest text-slate-700 uppercase">
                      PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB)
                    </p>
                    <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                      {infoData?.madrasah?.nama || 'MADRASAH TSANAWIYAH'}
                    </h2>
                    <p className="text-[10px] text-slate-600">
                      Tahun Ajaran {infoData?.tahunAjaran?.tahun || '2024/2025'} • NPSN: {infoData?.madrasah?.npsn || '-'}
                    </p>
                  </div>

                  <div className="flex flex-col items-center text-center space-y-2 border-b border-slate-100 pb-5">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center print:hidden">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                    <h3 className="text-lg sm:text-2xl font-black text-slate-800 uppercase tracking-tight">
                      KARTU BUKTI PENDAFTARAN SANTRI BARU
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md">
                      Simpan kartu dan nomor pendaftaran ini sebagai bukti sah untuk verifikasi berkas fisik dan pengumuman seleksi.
                    </p>
                    <div className="mt-2 px-6 py-2.5 rounded-2xl bg-emerald-50 border-2 border-dashed border-emerald-500 text-emerald-900 font-mono text-xl sm:text-2xl font-black tracking-wider">
                      {registeredResult.nomor_pendaftaran}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                    <div>
                      <span className="text-slate-400">Nama Lengkap:</span>
                      <p className="font-bold text-slate-800">{registeredResult.nama_lengkap}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Jalur Pendaftaran:</span>
                      <p className="font-bold text-slate-800">{registeredResult.jalur_pendaftaran}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Asal Sekolah:</span>
                      <p className="font-bold text-slate-800">{registeredResult.sekolah_asal || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">No. WhatsApp Wali:</span>
                      <p className="font-bold text-slate-800">{registeredResult.telepon_ortu || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Status Pendaftaran:</span>
                      <div className="mt-1">{getStatusBadge(registeredResult.status)}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Tanggal Pendaftaran:</span>
                      <p className="font-medium text-slate-700">
                        {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
                      </p>
                    </div>
                  </div>

                  {/* Instruksi Tahap Selanjutnya (Cetak) */}
                  <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed">
                    <span className="font-bold block mb-0.5">Petunjuk Seleksi & Verifikasi Dokumen:</span>
                    Bawa kartu pendaftaran ini bersama fotokopi Akta Kelahiran, Kartu Keluarga, dan Rapor terakhir ke Sekretariat Panitia PPDB madrasah pada jam kerja.
                  </div>

                  {/* Lembar Tanda Tangan Cetak */}
                  <div className="signature-block print-avoid-break print:grid hidden grid-cols-2 gap-8 text-center text-xs pt-4">
                    <div>
                      <p className="text-slate-500">Calon Santri / Orang Tua</p>
                      <div className="h-14" />
                      <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-6">
                        ( {registeredResult.nama_lengkap} )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Panitia PPDB Madrasah</p>
                      <div className="h-14" />
                      <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-6">
                        ( ..................................... )
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2 print:hidden">
                    <button
                      onClick={() => triggerPrint({ paper, orientation: 'portrait' })}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Cetak Bukti Pendaftaran
                    </button>
                    <button
                      onClick={() => {
                        setRegisteredResult(null);
                        setForm({
                          nama_lengkap: '',
                          nisn: '',
                          nik: '',
                          jenis_kelamin: 'L',
                          tempat_lahir: '',
                          tanggal_lahir: '',
                          sekolah_asal: '',
                          nama_ayah: '',
                          nama_ibu: '',
                          telepon_ortu: '',
                          email_ortu: '',
                          alamat: '',
                          jalur_pendaftaran: 'Reguler',
                          berkas_foto_url: '',
                          berkas_ijazah_url: '',
                          berkas_akta_url: '',
                          berkas_kk_url: '',
                        });
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      Daftar Lagi
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Form Pengisian PPDB */
              <form
                onSubmit={handleSubmit}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8"
              >
                {/* 1. Jalur Pendaftaran */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                      1
                    </span>
                    Pilih Jalur Pendaftaran
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Sesuaikan jalur dengan potensi dan kualifikasi calon santri.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: 'Reguler', label: 'Jalur Reguler', desc: 'Tes akademik & wawancara' },
                      { id: 'Prestasi', label: 'Jalur Prestasi', desc: 'Sertifikat sains/seni/olahraga' },
                      { id: 'Tahfidz', label: 'Jalur Tahfidz', desc: 'Hafalan minimal 1 Juz' },
                      { id: 'Afirmasi', label: 'Jalur Afirmasi', desc: 'KIP / Santri Prasejahtera' },
                    ].map((jalur) => (
                      <label
                        key={jalur.id}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          form.jalur_pendaftaran === jalur.id
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-xs'
                            : 'border-slate-200 bg-slate-50/40 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs">{jalur.label}</span>
                          <input
                            type="radio"
                            name="jalur"
                            value={jalur.id}
                            checked={form.jalur_pendaftaran === jalur.id}
                            onChange={() =>
                              setForm({ ...form, jalur_pendaftaran: jalur.id as any })
                            }
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 leading-tight">
                          {jalur.desc}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 2. Identitas Calon Siswa */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                      2
                    </span>
                    Data Diri Calon Santri
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Nama Lengkap Calon Santri <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Muhammad Rayhan Firdaus"
                        value={form.nama_lengkap}
                        onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Jenis Kelamin <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={form.jenis_kelamin}
                        onChange={(e) =>
                          setForm({ ...form, jenis_kelamin: e.target.value as 'L' | 'P' })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm bg-white"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">NISN (Jika Ada)</label>
                      <input
                        type="text"
                        placeholder="10 digit nomor NISN"
                        value={form.nisn}
                        onChange={(e) => setForm({ ...form, nisn: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tempat Lahir</label>
                      <input
                        type="text"
                        placeholder="Kota / Kabupaten"
                        value={form.tempat_lahir}
                        onChange={(e) => setForm({ ...form, tempat_lahir: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={form.tanggal_lahir}
                        onChange={(e) => setForm({ ...form, tanggal_lahir: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">
                        Sekolah Asal (SD / MI) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: SD IT Al-Bayan / MI Negeri 1 Bogor"
                        value={form.sekolah_asal}
                        onChange={(e) => setForm({ ...form, sekolah_asal: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Data Orang Tua / Wali */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                      3
                    </span>
                    Data Orang Tua & Kontak
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Ayah Kandung</label>
                      <input
                        type="text"
                        placeholder="Nama Ayah"
                        value={form.nama_ayah}
                        onChange={(e) => setForm({ ...form, nama_ayah: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Ibu Kandung</label>
                      <input
                        type="text"
                        placeholder="Nama Ibu"
                        value={form.nama_ibu}
                        onChange={(e) => setForm({ ...form, nama_ibu: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        No. WhatsApp / Telepon Aktif <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="Contoh: 081234567890"
                        value={form.telepon_ortu}
                        onChange={(e) => setForm({ ...form, telepon_ortu: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Email Orang Tua</label>
                      <input
                        type="email"
                        placeholder="nama@email.com"
                        value={form.email_ortu}
                        onChange={(e) => setForm({ ...form, email_ortu: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-slate-700 mb-1">Alamat Domisili Lengkap</label>
                      <textarea
                        rows={2}
                        placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota/Kabupaten"
                        value={form.alamat}
                        onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-emerald-600 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Berkas Persyaratan (Upload ke Cloudinary) */}
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs flex items-center justify-center font-bold">
                      4
                    </span>
                    Upload Berkas Pendukung (Cloudinary)
                  </h3>
                  <p className="text-xs text-slate-500 mb-4">
                    Unggah dokumen berformat gambar (.jpg, .png) atau scan dokumen (maksimal 5MB per berkas).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Pas Foto */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Pas Foto Santri (3x4)</span>
                        {form.berkas_foto_url && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terunggah
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'berkas_foto_url')}
                        className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      />
                    </div>

                    {/* Scan Ijazah / SKL */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Scan Ijazah / SKL</span>
                        {form.berkas_ijazah_url && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terunggah
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, 'berkas_ijazah_url')}
                        className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      />
                    </div>

                    {/* Akta Kelahiran */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Scan Akta Kelahiran</span>
                        {form.berkas_akta_url && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terunggah
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, 'berkas_akta_url')}
                        className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      />
                    </div>

                    {/* Kartu Keluarga */}
                    <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">Scan Kartu Keluarga (KK)</span>
                        {form.berkas_kk_url && (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Terunggah
                          </span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileUpload(e, 'berkas_kk_url')}
                        className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    <span>Pastikan data yang diisi benar sesuai berkas kependudukan resmi.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={daftarMutation.isPending}
                    className="w-full sm:w-auto px-8 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white font-bold rounded-2xl text-sm transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  >
                    {daftarMutation.isPending ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Mengirim Data...
                      </>
                    ) : (
                      <>
                        Kirim Formulir Pendaftaran <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: CEK STATUS PENDAFTARAN */}
        {/* ==================================================== */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-extrabold text-slate-800">
                Pemeriksaan Status Pendaftaran & Seleksi
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                Masukkan Nomor Pendaftaran (misal: <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">PPDB-2024-0001</code>) atau NISN calon santri.
              </p>

              <form onSubmit={handleCekStatus} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PPDB-2024-0001 atau NISN"
                    value={searchNomor}
                    onChange={(e) => setSearchNomor(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 focus:outline-emerald-600 text-sm uppercase font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white rounded-2xl text-sm font-bold shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSearching ? 'Memeriksa...' : 'Cek Status'}
                </button>
              </form>

              {searchError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                  <span>{searchError}</span>
                </div>
              )}
            </div>

            {/* Hasil Pencarian */}
            {searchedData && (
              <div className="space-y-4">
                {/* Print Paper Toolbar */}
                <PrintPaperBar
                  paper={paper}
                  onPaperChange={setPaper}
                  allowedPapers={['a4', 'f4']}
                  printLabel="Cetak Surat Keterangan Status"
                  onPrint={() => triggerPrint({ paper, orientation: 'portrait' })}
                />

                <div
                  className={`print-area ${
                    paper === 'f4' ? 'print-f4 sheet-preview-f4' : 'print-a4 sheet-preview-a4'
                  } bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-5 animate-in fade-in duration-200 print:border-none print:shadow-none print:p-0 print:m-0 print:space-y-4 print:rounded-none`}
                >
                  {/* Kop Surat Resmi Madrasah Khusus Print */}
                  <div className="kop-surat border-b-2 border-slate-800 pb-3 mb-2 print:block hidden text-center">
                    <p className="text-[10px] font-bold tracking-widest text-slate-700 uppercase">
                      PANITIA PENERIMAAN PESERTA DIDIK BARU (PPDB)
                    </p>
                    <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                      {infoData?.madrasah?.nama || 'MADRASAH TSANAWIYAH'}
                    </h2>
                    <p className="text-[10px] text-slate-600">
                      Tahun Ajaran {infoData?.tahunAjaran?.tahun || '2024/2025'} • NPSN: {infoData?.madrasah?.npsn || '-'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        {searchedData.nomor_pendaftaran}
                      </span>
                      <h4 className="text-lg sm:text-xl font-black text-slate-900 mt-2">
                        SURAT KETERANGAN STATUS PENDAFTARAN PPDB
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Nama: {searchedData.nama_lengkap} • Jalur: {searchedData.jalur_pendaftaran}
                      </p>
                    </div>
                    <div>{getStatusBadge(searchedData.status)}</div>
                  </div>

                  {/* Catatan Verifikasi Dari Panitia */}
                  {searchedData.catatan_verifikasi && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        Catatan Panitia PPDB:
                      </span>
                      <p className="italic text-slate-600 leading-relaxed">
                        "{searchedData.catatan_verifikasi}"
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs bg-slate-50/70 p-4 rounded-2xl border border-slate-200/50">
                    <div>
                      <span className="text-slate-400">NISN:</span>
                      <p className="font-semibold text-slate-800">{searchedData.nisn || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Jenis Kelamin:</span>
                      <p className="font-semibold text-slate-800">
                        {searchedData.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Tempat, Tgl Lahir:</span>
                      <p className="font-semibold text-slate-800">
                        {searchedData.tempat_lahir || '-'}, {searchedData.tanggal_lahir || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Nama Orang Tua:</span>
                      <p className="font-semibold text-slate-800">
                        {searchedData.nama_ayah || searchedData.nama_ibu || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">Sekolah Asal:</span>
                      <p className="font-semibold text-slate-800">{searchedData.sekolah_asal || '-'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">No. Kontak:</span>
                      <p className="font-semibold text-slate-800">{searchedData.telepon_ortu || '-'}</p>
                    </div>
                  </div>

                  {/* Informasi Kelulusan & Daftar Ulang */}
                  {searchedData.status === 'diterima' && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1.5">
                      <div className="font-black text-xs sm:text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        Selamat! Calon Santri Dinyatakan Lulus Seleksi Masuk
                      </div>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        Silakan datang ke sekretariat madrasah dengan membawa surat ini dan dokumen fisik asli untuk administrasi daftar ulang santri baru.
                      </p>
                    </div>
                  )}

                  {/* Lembar Pengesahan Cetak */}
                  <div className="signature-block print-avoid-break print:grid hidden grid-cols-2 gap-8 text-center text-xs pt-4">
                    <div>
                      <p className="text-slate-500">
                        Diterbitkan di {infoData?.madrasah?.alamat?.split(',')[0] || 'Madrasah'}
                      </p>
                      <p className="font-semibold text-slate-800">Orang Tua / Wali Santri</p>
                      <div className="h-14" />
                      <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-6">
                        ( ..................................... )
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">
                        Tanggal: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
                      </p>
                      <p className="font-semibold text-slate-800">Ketua Panitia PPDB</p>
                      <div className="h-14" />
                      <p className="font-bold text-slate-900 border-t border-slate-400 inline-block px-6">
                        ( ..................................... )
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 print:hidden">
                    <button
                      onClick={() => triggerPrint({ paper, orientation: 'portrait' })}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Cetak Lembar Status (PDF)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Info */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {infoData?.madrasah?.nama || 'Madrasah Tsanawiyah'}. Sistem Informasi Akademik Madrasah (SIAKAD).</p>
      </footer>
    </div>
  );
}
