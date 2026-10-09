export type Role = 'admin' | 'staf' | 'guru';
export type StafRole = 'TU' | 'Keuangan' | 'Akademik' | 'Guru';

export interface ModulePermission {
  module:
    | 'tahun_ajaran'
    | 'kelas'
    | 'mapel'
    | 'guru'
    | 'siswa'
    | 'pengaturan'
    | 'staf'
    | 'audit_log'
    | 'akademik'
    | 'keuangan'
    | 'ppdb'
    | 'pengumuman'
    | 'kalender';
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface User {
  id: number;
  username: string;
  nama_lengkap: string;
  email: string | null;
  role: Role;
  staf_role: StafRole | null;
  guru_id?: number | null;
  is_active: boolean;
  must_change_password: boolean;
  permissions: ModulePermission[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface MadrasahProfile {
  id: number;
  nama: string;
  nsm: string;
  npsn: string;
  alamat: string | null;
  kelurahan: string | null;
  kecamatan: string | null;
  kabupaten_kota: string | null;
  provinsi: string | null;
  kode_pos: string | null;
  telepon: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  kepala_madrasah: string;
  nip_kepala_madrasah: string | null;
  updated_at?: string;
}

export interface TahunAjaran {
  id: number;
  tahun: string;
  semester: 'Ganjil' | 'Genap';
  is_active: boolean;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Guru {
  id: number;
  nip: string | null;
  nuptk: string | null;
  nama: string;
  gelar_depan: string | null;
  gelar_belakang: string | null;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  jabatan: string;
  pendidikan_terakhir: string | null;
  jurusan: string | null;
  telepon: string | null;
  email: string | null;
  status_kepegawaian: string;
  foto_url: string | null;
  is_active: boolean;
}

export interface Kelas {
  id: number;
  tingkat: string;
  nama: string;
  tahun_ajaran_id: number;
  wali_kelas_id: number | null;
  kapasitas: number;
  tahun_ajaran?: TahunAjaran;
  wali_kelas?: Guru | null;
  total_siswa?: number;
}

export interface Mapel {
  id: number;
  kode: string;
  nama: string;
  kelompok: 'PAI' | 'Umum' | 'Muatan Lokal';
  kkm: number;
  jam_pelajaran: number;
  tingkat: string | null;
}

export interface Siswa {
  id: number;
  nis: string;
  nisn: string;
  nama: string;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  kelas_id: number | null;
  tahun_ajaran_masuk_id: number | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  nama_wali: string | null;
  pekerjaan_ortu: string | null;
  telepon_ortu: string | null;
  alamat: string | null;
  status: 'aktif' | 'lulus' | 'pindah';
  foto_url: string | null;
  kelas?: Kelas | null;
}

// ==========================================
// TIPE MODUL AKADEMIK
// ==========================================

export interface PenempatanSiswa {
  id: number;
  siswa_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  status: 'aktif' | 'naik_kelas' | 'tinggal_kelas' | 'lulus' | 'mutasi';
  catatan?: string | null;
  created_at?: string;
  updated_at?: string;
  siswa?: Siswa;
  kelas?: Kelas;
}

export interface PengajaranGuru {
  id: number;
  guru_id: number;
  mapel_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  beban_jp: number;
  guru?: Guru;
  mapel?: Mapel;
  kelas?: Kelas;
}

export interface JadwalPelajaran {
  id: number;
  tahun_ajaran_id: number;
  kelas_id: number;
  mapel_id: number;
  guru_id: number;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jam_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  ruang?: string | null;
  guru?: Guru;
  mapel?: Mapel;
  kelas?: Kelas;
}

export interface AbsensiSiswa {
  id: number;
  siswa_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  tanggal: string;
  status: 'H' | 'I' | 'S' | 'A';
  catatan?: string | null;
  siswa?: Siswa;
}

export interface RekapAbsensiSiswa {
  siswa_id: number;
  nama: string;
  nis: string;
  hadir: number;
  izin: number;
  sakit: number;
  alpa: number;
  total_hari: number;
  persentase: number;
}

export interface BobotNilai {
  id?: number;
  tahun_ajaran_id: number;
  bobot_tugas: number;
  bobot_uh: number;
  bobot_uts: number;
  bobot_uas: number;
  bobot_keterampilan: number;
}

export interface NilaiSiswa {
  id?: number;
  siswa_id: number;
  mapel_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  nilai_tugas: number;
  nilai_uh: number;
  nilai_uts: number;
  nilai_uas: number;
  nilai_keterampilan: number;
  nilai_akhir: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  catatan?: string | null;
  siswa?: Siswa;
  mapel?: Mapel;
}

export interface CatatanRaporSiswa {
  id?: number;
  siswa_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  sikap_spiritual: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
  deskripsi_spiritual?: string | null;
  sikap_sosial: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
  deskripsi_sosial?: string | null;
  juz_hafalan?: string | null;
  surah_terakhir?: string | null;
  predikat_tahfidz: 'Mutqin' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul';
  catatan_wali_kelas?: string | null;
  status_akhir: 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus' | 'Belum Ditentukan';
  naik_ke_kelas?: string | null;
}

export interface RaporData {
  siswa: Siswa;
  kelas: Kelas;
  tahunAjaran: TahunAjaran;
  madrasah: MadrasahProfile;
  waliKelas?: Guru | null;
  nilaiList: Array<{
    mapel: Mapel;
    nilai_tugas: number;
    nilai_uh: number;
    nilai_uts: number;
    nilai_uas: number;
    nilai_keterampilan: number;
    nilai_akhir: number;
    predikat: string;
    catatan?: string | null;
  }>;
  catatanRapor: CatatanRaporSiswa;
  rekapAbsensi: {
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
  };
}

// ==========================================
// TIPE MODUL KEUANGAN
// ==========================================

export interface JenisPembayaran {
  id: number;
  nama: string;
  tipe: 'bulanan' | 'bebas';
  deskripsi: string | null;
  tahun_ajaran_id: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  tarifList?: TarifPembayaran[];
}

export interface TarifPembayaran {
  id: number;
  jenis_pembayaran_id: number;
  tingkat: string; // 'Semua' | '7' | '8' | '9'
  kelas_id: number | null;
  nominal: number;
  kelas?: Kelas | null;
}

export interface TagihanSiswa {
  id: number;
  siswa_id: number;
  kelas_id: number;
  jenis_pembayaran_id: number;
  tahun_ajaran_id: number;
  bulan: string | null;
  nominal: number;
  terbayar: number;
  sisa: number;
  status: 'belum_bayar' | 'sebagian' | 'lunas';
  jatuh_tempo: string | null;
  catatan: string | null;
  created_at?: string;
  updated_at?: string;
  siswa?: Siswa;
  kelas?: Kelas;
  jenisPembayaran?: JenisPembayaran;
  transaksiList?: TransaksiPembayaran[];
}

export interface TransaksiPembayaran {
  id: number;
  nomor_transaksi: string; // 'KWT-202410-0001'
  tagihan_id: number;
  siswa_id: number;
  jumlah_bayar: number;
  metode: 'Tunai' | 'Transfer';
  tanggal_bayar: string;
  catatan: string | null;
  created_by_user_id: number | null;
  status: 'valid' | 'dibatalkan';
  alasan_batal: string | null;
  cancelled_at: string | null;
  cancelled_by_user_id: number | null;
  created_at?: string;
  updated_at?: string;
  tagihan?: TagihanSiswa;
  siswa?: Siswa;
  createdByUser?: User | null;
  cancelledByUser?: User | null;
}

export interface KwitansiData {
  transaksi: TransaksiPembayaran;
  tagihan: TagihanSiswa;
  siswa: Siswa;
  madrasah: MadrasahProfile;
  kasirNama: string;
  terbilang: string;
}

export interface TunggakanSiswaSummary {
  siswa: Siswa;
  kelas: Kelas | null;
  totalTagihan: number;
  totalTerbayar: number;
  totalTunggakan: number;
  jumlahItemTunggakan: number;
  itemTunggakan: Array<{
    tagihan_id: number;
    namaPembayaran: string;
    bulan: string | null;
    nominal: number;
    terbayar: number;
    sisa: number;
    status: string;
  }>;
}

export interface TunggakanKelasSummary {
  kelas_id: number;
  kelas_nama: string;
  tingkat: string;
  wali_kelas_nama: string;
  totalSiswa: number;
  totalTagihan: number;
  totalTerbayar: number;
  totalTunggakan: number;
  persentaseLunas: number;
  siswaMenunggakCount: number;
}

export interface DashboardKeuanganStats {
  pemasukanBulanIni: number;
  pemasukanHariIni: number;
  totalTunggakan: number;
  totalTagihanTahunIni: number;
  totalTerbayarTahunIni: number;
  persentasePelunasan: number;
  totalTransaksiValid: number;
  breakdownJenis: Array<{
    jenis_id: number;
    nama: string;
    tipe?: 'bulanan' | 'bebas';
    totalMasuk: number;
    totalTagihan: number;
    totalTunggakan: number;
  }>;
  recentTransactions: TransaksiPembayaran[];
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  entity: string;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  mustChangePassword?: boolean;
  summary?: any;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

// ==========================================
// TIPE PPDB, PENGUMUMAN & KALENDER
// ==========================================

export type PPDBStatus = 'menunggu_verifikasi' | 'terverifikasi' | 'diterima' | 'cadangan' | 'ditolak';

export interface PPDBPendaftar {
  id: number;
  nomor_pendaftaran: string;
  tahun_ajaran_id: number;
  jalur_pendaftaran: 'Reguler' | 'Prestasi' | 'Afirmasi' | 'Tahfidz';
  nama_lengkap: string;
  nisn: string | null;
  nik: string | null;
  jenis_kelamin: 'L' | 'P';
  tempat_lahir: string | null;
  tanggal_lahir: string | null;
  sekolah_asal: string | null;
  nama_ayah: string | null;
  nama_ibu: string | null;
  telepon_ortu: string | null;
  email_ortu: string | null;
  alamat: string | null;
  berkas_foto_url: string | null;
  berkas_ijazah_url: string | null;
  berkas_akta_url: string | null;
  berkas_kk_url: string | null;
  status: PPDBStatus;
  catatan_verifikasi: string | null;
  verified_by_user_id: number | null;
  verified_at: string | null;
  is_converted: boolean;
  converted_siswa_id: number | null;
  created_at?: string;
  updated_at?: string;
  tahunAjaran?: TahunAjaran;
  verifiedBy?: User | null;
  convertedSiswa?: Siswa | null;
}

export interface Pengumuman {
  id: number;
  judul: string;
  konten: string;
  kategori: 'Umum' | 'Akademik' | 'Keuangan' | 'Kegiatan' | 'Penting';
  target_audiens: 'Semua' | 'Guru' | 'Siswa' | 'Staf';
  is_pinned: boolean;
  is_published: boolean;
  created_by_user_id: number | null;
  created_at?: string;
  updated_at?: string;
  author?: User | null;
}

export interface KalenderAkademik {
  id: number;
  tahun_ajaran_id: number;
  judul_kegiatan: string;
  deskripsi: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tipe_kegiatan: 'KBM' | 'Libur Nasional' | 'Libur Semester' | 'Ujian' | 'PPDB' | 'Rapat' | 'Ekstrakurikuler' | 'Lainnya';
  warna: string;
  created_at?: string;
  updated_at?: string;
  tahunAjaran?: TahunAjaran;
}

export interface EnrichedDashboardStats {
  counts: {
    siswa: number;
    siswaLaki: number;
    siswaPerempuan: number;
    guru: number;
    kelas: number;
    mapel: number;
    alumni: number;
    mutasi: number;
  };
  ppdbSummary: {
    totalPendaftar: number;
    menungguVerifikasi: number;
    terverifikasi: number;
    diterima: number;
    ditolak: number;
    sudahKonversi: number;
    targetKuota: number;
  };
  kehadiranBulanan: Array<{
    bulan: string;
    hadir: number;
    izin: number;
    sakit: number;
    alpa: number;
    persentaseHadir: number;
  }>;
  siswaPerKelas: Array<{
    kelas_id: number;
    nama: string;
    tingkat: string;
    wali_kelas: string;
    kapasitas: number;
    jumlahSiswa: number;
  }>;
  recentAnnouncements: Pengumuman[];
  upcomingEvents: KalenderAkademik[];
}
