import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { CardSkeleton } from '../components/ui/Skeleton';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users2,
  Building2,
  BookOpen,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Clock,
  Sparkles,
  School,
  CheckCircle2,
  Bell,
  CalendarDays,
  UserCheck,
  TrendingUp,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await api.get('/api/dashboard/stats');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-700/50">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-6">
          <School className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/30 text-amber-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tahun Ajaran Aktif: {statsData?.taAktif ? `${statsData.taAktif.tahun} (${statsData.taAktif.semester})` : 'Belum Ditentukan'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Ahlan wa Sahlan, {user?.nama_lengkap}!
          </h2>
          <p className="mt-2 text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            Selamat datang di Dashboard Fondasi SIAKAD Madrasah. Kelola data induk kesiswaan, tenaga pendidik, rombongan belajar, dan mata pelajaran dengan akurat dan mudah.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-200">
              Role: <strong className="text-white capitalize">{user?.role}</strong>
              {user?.staf_role ? ` (${user.staf_role})` : ''}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-200">
              Status: <span className="text-emerald-300 font-semibold">Aktif & Terverifikasi</span>
            </span>
          </div>
        </div>
      </div>

      {/* Primary Statistics Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Siswa Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Siswa
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-800">
                {statsData?.totalSiswa || 0}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="text-emerald-600 font-semibold">
                  {statsData?.siswaAktif || 0} Aktif
                </span>
                <span>•</span>
                <span>{statsData?.siswaLulus || 0} Lulus</span>
                <span>•</span>
                <span>{statsData?.siswaPindah || 0} Pindah</span>
              </div>
            </div>
            <Link
              to="/siswa"
              className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-emerald-700 hover:text-emerald-800"
            >
              <span>Kelola Data Siswa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Guru Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Guru & Pegawai
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Users2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-800">
                {statsData?.totalGuru || 0}
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
                <span className="text-amber-700 font-semibold">
                  {statsData?.guruPNS || 0} ASN/PNS
                </span>
                <span>•</span>
                <span>{statsData?.guruNonPNS || 0} Non-PNS/GTY</span>
              </div>
            </div>
            <Link
              to="/guru"
              className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              <span>Daftar Guru</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Kelas Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Rombongan Belajar
              </span>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-800">
                {statsData?.totalKelas || 0}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Kelas aktif terdaftar di madrasah
              </div>
            </div>
            <Link
              to="/kelas"
              className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-teal-700 hover:text-teal-800"
            >
              <span>Lihat Kelas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mapel Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Mata Pelajaran
              </span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-800">
                {statsData?.totalMapel || 0}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                Termasuk PAI Kemenag & Muatan Umum
              </div>
            </div>
            <Link
              to="/mapel"
              className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-blue-700 hover:text-blue-800"
            >
              <span>Struktur Mapel</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Khusus Jika Login Sebagai Guru */}
      {statsData?.guruStats && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/10 to-emerald-500/10 p-5 rounded-2xl border border-amber-300/60 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Portal Guru Pendidik</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-1">
              {statsData.guruStats.isWaliKelas
                ? `Wali Kelas: ${statsData.guruStats.waliKelasNama}`
                : 'Guru Mata Pelajaran'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Mengampu {statsData.guruStats.totalKelasAjar} rombongan belajar • {statsData.guruStats.totalJadwalMengajar} sesi jadwal mengajar mingguan.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/akademik/nilai"
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs"
            >
              Input Nilai
            </Link>
            <Link
              to="/akademik/absensi"
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-xs"
            >
              Isi Absensi
            </Link>
          </div>
        </div>
      )}

      {/* Ringkasan PPDB Widget */}
      {statsData?.ppdbSummary && (
        <div className="bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 text-white p-6 rounded-3xl border border-emerald-700/60 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-700/60 flex items-center justify-center text-amber-300">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight">
                  Penerimaan Peserta Didik Baru (PPDB Online)
                </h3>
                <p className="text-xs text-emerald-200/80">
                  Target Kuota: {statsData.ppdbSummary.targetKuota} Santri Baru • Terisi: {statsData.ppdbSummary.totalPendaftar} Pendaftar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <a
                href="/ppdb"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Portal Publik
              </a>
              <Link
                to="/ppdb/admin"
                className="px-4 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold flex items-center gap-1 transition-all shadow-sm"
              >
                <span>Kelola PPDB</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* PPDB Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-emerald-200">
              <span>Progres Pendaftaran</span>
              <span className="font-bold text-white">
                {Math.round((statsData.ppdbSummary.totalPendaftar / statsData.ppdbSummary.targetKuota) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-amber-300 rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((statsData.ppdbSummary.totalPendaftar / statsData.ppdbSummary.targetKuota) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50">
              <span className="text-[10px] text-emerald-300">Menunggu Verifikasi</span>
              <p className="text-lg font-black text-amber-300 mt-0.5">
                {statsData.ppdbSummary.menungguVerifikasi}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50">
              <span className="text-[10px] text-emerald-300">Terverifikasi</span>
              <p className="text-lg font-black text-blue-300 mt-0.5">
                {statsData.ppdbSummary.terverifikasi}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50">
              <span className="text-[10px] text-emerald-300">Diterima / Lulus</span>
              <p className="text-lg font-black text-emerald-300 mt-0.5">
                {statsData.ppdbSummary.diterima}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50">
              <span className="text-[10px] text-emerald-300">Sudah Konversi</span>
              <p className="text-lg font-black text-purple-300 mt-0.5">
                {statsData.ppdbSummary.sudahKonversi}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/50 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-300">Ditolak</span>
              <p className="text-lg font-black text-rose-300 mt-0.5">
                {statsData.ppdbSummary.ditolak}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Charts: Kehadiran Bulanan & Siswa per Kelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafik Kehadiran Bulanan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Tingkat Kehadiran Santri (Bulanan)
            </h3>
            <span className="text-xs text-slate-400 font-medium">Semester Ganjil</span>
          </div>

          <div className="space-y-3 pt-1">
            {statsData?.kehadiranBulanan?.map((item: any, idx: number) => (
              <div key={item.bulan || `bulan-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{item.bulan}</span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="text-emerald-700 font-bold">{item.hadir} Hadir</span>
                    <span>•</span>
                    <span className="text-blue-600">{item.izin} Izin</span>
                    <span>•</span>
                    <span className="text-amber-600">{item.sakit} Sakit</span>
                    <span>•</span>
                    <span className="text-rose-600">{item.alpa} Alpa</span>
                    <span className="font-mono font-bold text-slate-800 ml-1">({item.persentaseHadir}%)</span>
                  </div>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, item.persentaseHadir)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribusi Siswa per Rombel / Kelas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600" />
              Kapasitas & Distribusi Siswa per Kelas
            </h3>
            <Link to="/kelas" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
              Detail Kelas
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {statsData?.siswaPerKelas?.map((k: any, idx: number) => {
              const pct = k.kapasitas > 0 ? Math.round((k.jumlahSiswa / k.kapasitas) * 100) : 0;
              return (
                <div key={k.kelas_id || `kelas-${idx}`} className="p-3 bg-slate-50/70 border border-slate-200/60 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">Kelas {k.nama}</span>
                      <span className="text-[11px] text-slate-500 ml-2">Wali: {k.wali_kelas}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-700">
                      {k.jumlahSiswa} / {k.kapasitas} Santri ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 90 ? 'bg-amber-500' : 'bg-teal-600'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Two Column: Pengumuman Terkini & Kalender Agenda Terdekat */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pengumuman Terkini */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" />
              Pengumuman Madrasah Terkini
            </h3>
            <Link to="/pengumuman" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
              Lihat Semua
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {statsData?.recentAnnouncements && statsData.recentAnnouncements.length > 0 ? (
              statsData.recentAnnouncements.map((p: any, idx: number) => (
                <div key={p.id || `announcement-${idx}`} className="py-3 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 leading-tight">{p.judul}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      {p.kategori}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed">
                    {p.konten}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada pengumuman baru.</p>
            )}
          </div>
        </div>

        {/* Kalender Agenda Terdekat */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              Agenda Kalender Akademik Terdekat
            </h3>
            <Link to="/kalender" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800">
              Buka Kalender
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {statsData?.upcomingEvents && statsData.upcomingEvents.length > 0 ? (
              statsData.upcomingEvents.map((evt: any, idx: number) => (
                <div key={evt.id || `event-${idx}`} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-800 font-bold shrink-0">
                      <span className="text-[10px] text-slate-400 leading-none">
                        {new Date(evt.tanggal_mulai).toLocaleDateString('id-ID', { month: 'short' })}
                      </span>
                      <span className="text-sm font-black leading-tight">
                        {new Date(evt.tanggal_mulai).getDate()}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{evt.judul_kegiatan}</p>
                      <span className="text-[11px] text-slate-400 font-mono">{evt.tanggal_mulai}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                    {evt.tipe_kegiatan}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center">Tidak ada agenda dalam waktu dekat.</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Academic Hub */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <h3 className="font-bold text-slate-800 text-sm flex items-center justify-between mb-4">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Pintasan Cepat Modul Akademik
          </span>
          <span className="text-xs text-slate-400 font-normal">Tahun Ajaran {statsData?.taAktif?.tahun || '-'}</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <Link
            to="/akademik/absensi"
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left group"
          >
            <div className="font-bold text-slate-900 group-hover:text-emerald-800">Absensi Harian</div>
            <p className="text-[11px] text-slate-500 mt-1">Input kehadiran & rekap per kelas</p>
          </Link>
          <Link
            to="/akademik/nilai"
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left group"
          >
            <div className="font-bold text-slate-900 group-hover:text-emerald-800">Penilaian Siswa</div>
            <p className="text-[11px] text-slate-500 mt-1">Tugas, UH, UTS, UAS & Keterampilan</p>
          </Link>
          <Link
            to="/akademik/jadwal"
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left group"
          >
            <div className="font-bold text-slate-900 group-hover:text-emerald-800">Jadwal Pelajaran</div>
            <p className="text-[11px] text-slate-500 mt-1">Matriks mingguan & anti bentrok</p>
          </Link>
          <Link
            to="/akademik/rapor"
            className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50 hover:border-emerald-300 transition-all text-left group"
          >
            <div className="font-bold text-slate-900 group-hover:text-emerald-800">Cetak Rapor (PDF)</div>
            <p className="text-[11px] text-slate-500 mt-1">Kop madrasah, tahfidz & wali kelas</p>
          </Link>
        </div>
      </div>

      {/* Middle Section: Quick Operations & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Operations */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-1 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Aksi Cepat Madrasah
          </h3>
          <div className="space-y-2.5">
            <Link
              to="/siswa"
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-900 transition-all text-xs font-semibold"
            >
              <span>Impor Data Siswa Baru (Excel)</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/siswa"
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-900 transition-all text-xs font-semibold"
            >
              <span>Ekspor Rekap Siswa ke Excel</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/tahun-ajaran"
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-900 transition-all text-xs font-semibold"
            >
              <span>Atur Tahun Ajaran Aktif</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
            <Link
              to="/pengaturan"
              className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-emerald-50 hover:border-emerald-200 text-slate-700 hover:text-emerald-900 transition-all text-xs font-semibold"
            >
              <span>Profil & Kepala Madrasah</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Aktivitas Terkini (Audit Log)
            </h3>
            <Link
              to="/audit-log"
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {statsData?.recentLogs && statsData.recentLogs.length > 0 ? (
              statsData.recentLogs.map((log: any, idx: number) => (
                <div key={log.id || `log-${idx}`} className="py-3 flex items-start justify-between gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{log.username}</span>
                      <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                        {log.action}
                      </span>
                      <span className="text-slate-400 text-[10px] uppercase">[{log.entity}]</span>
                    </div>
                    <p className="text-slate-600 text-xs mt-1">{log.details}</p>
                  </div>
                  <div className="text-[11px] text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                Belum ada catatan aktivitas terbaru.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
