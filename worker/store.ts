import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema.ts';
import { eq, desc, ilike, and, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: number;
  username: string;
  nama_lengkap: string;
  email: string | null;
  password_hash: string;
  role: 'admin' | 'staf' | 'guru';
  staf_role: string | null;
  guru_id: number | null;
  is_active: boolean;
  must_change_password: boolean;
  permissions: any;
  created_at: Date;
  updated_at: Date;
}

export interface MadrasahProfileRecord {
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
  updated_at: Date;
}

export interface TahunAjaranRecord {
  id: number;
  tahun: string;
  semester: 'Ganjil' | 'Genap';
  is_active: boolean;
  tanggal_mulai: string | null;
  tanggal_selesai: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface GuruRecord {
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
  created_at: Date;
  updated_at: Date;
}

export interface KelasRecord {
  id: number;
  tingkat: string;
  nama: string;
  tahun_ajaran_id: number;
  wali_kelas_id: number | null;
  kapasitas: number;
  created_at: Date;
  updated_at: Date;
  // Computed / joined
  tahun_ajaran?: TahunAjaranRecord;
  wali_kelas?: GuruRecord | null;
  total_siswa?: number;
}

export interface MapelRecord {
  id: number;
  kode: string;
  nama: string;
  kelompok: 'PAI' | 'Umum' | 'Muatan Lokal';
  kkm: number;
  jam_pelajaran: number;
  tingkat: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SiswaRecord {
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
  created_at: Date;
  updated_at: Date;
  // Computed / joined
  kelas?: KelasRecord | null;
}

// Academic Module Records
export interface PenempatanSiswaRecord {
  id: number;
  siswa_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  status: 'aktif' | 'naik_kelas' | 'tinggal_kelas' | 'lulus' | 'mutasi';
  catatan: string | null;
  created_at: Date;
  updated_at: Date;
  siswa?: SiswaRecord;
  kelas?: KelasRecord;
}

export interface PengajaranGuruRecord {
  id: number;
  guru_id: number;
  mapel_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  beban_jp: number;
  created_at: Date;
  updated_at: Date;
  guru?: GuruRecord;
  mapel?: MapelRecord;
  kelas?: KelasRecord;
}

export interface JadwalPelajaranRecord {
  id: number;
  tahun_ajaran_id: number;
  kelas_id: number;
  mapel_id: number;
  guru_id: number;
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jam_ke: number;
  jam_mulai: string;
  jam_selesai: string;
  ruang: string | null;
  created_at: Date;
  updated_at: Date;
  guru?: GuruRecord;
  mapel?: MapelRecord;
  kelas?: KelasRecord;
}

export interface AbsensiSiswaRecord {
  id: number;
  siswa_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  tanggal: string; // YYYY-MM-DD
  status: 'H' | 'I' | 'S' | 'A';
  catatan: string | null;
  created_by_user_id: number | null;
  created_at: Date;
  updated_at: Date;
  siswa?: SiswaRecord;
}

export interface BobotNilaiRecord {
  id: number;
  tahun_ajaran_id: number;
  bobot_tugas: number;
  bobot_uh: number;
  bobot_uts: number;
  bobot_uas: number;
  bobot_keterampilan: number;
  updated_at: Date;
}

export interface NilaiSiswaRecord {
  id: number;
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
  catatan: string | null;
  created_at: Date;
  updated_at: Date;
  siswa?: SiswaRecord;
  mapel?: MapelRecord;
}

export interface CatatanRaporRecord {
  id: number;
  siswa_id: number;
  kelas_id: number;
  tahun_ajaran_id: number;
  sikap_spiritual: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
  deskripsi_spiritual: string | null;
  sikap_sosial: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
  deskripsi_sosial: string | null;
  juz_hafalan: string | null;
  surah_terakhir: string | null;
  predikat_tahfidz: 'Mutqin' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul';
  catatan_wali_kelas: string | null;
  status_akhir: 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus' | 'Belum Ditentukan';
  naik_ke_kelas: string | null;
  updated_at: Date;
}

export interface AuditLogRecord {
  id: number;
  user_id: number | null;
  username: string;
  action: string;
  entity: string;
  details: string | null;
  ip_address: string | null;
  created_at: Date;
}

// Finance Module Records
export interface JenisPembayaranRecord {
  id: number;
  nama: string;
  tipe: 'bulanan' | 'bebas';
  deskripsi: string | null;
  tahun_ajaran_id: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TarifPembayaranRecord {
  id: number;
  jenis_pembayaran_id: number;
  tingkat: string; // 'Semua' | '7' | '8' | '9'
  kelas_id: number | null;
  nominal: number;
  created_at: Date;
  updated_at: Date;
}

export interface TagihanSiswaRecord {
  id: number;
  siswa_id: number;
  kelas_id: number;
  jenis_pembayaran_id: number;
  tahun_ajaran_id: number;
  bulan: string | null; // e.g. 'Juli', 'Agustus', ..., null
  nominal: number;
  terbayar: number;
  sisa: number;
  status: 'belum_bayar' | 'sebagian' | 'lunas';
  jatuh_tempo: string | null;
  catatan: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface TransaksiPembayaranRecord {
  id: number;
  nomor_transaksi: string; // e.g. 'KWT-202410-0001'
  tagihan_id: number;
  siswa_id: number;
  jumlah_bayar: number;
  metode: 'Tunai' | 'Transfer';
  tanggal_bayar: string;
  catatan: string | null;
  created_by_user_id: number | null;
  status: 'valid' | 'dibatalkan';
  alasan_batal: string | null;
  cancelled_at: Date | null;
  cancelled_by_user_id: number | null;
  created_at: Date;
  updated_at: Date;
}

// PPDB, Pengumuman & Kalender Records
export interface PPDBPendaftarRecord {
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
  status: 'menunggu_verifikasi' | 'terverifikasi' | 'diterima' | 'cadangan' | 'ditolak';
  catatan_verifikasi: string | null;
  verified_by_user_id: number | null;
  verified_at: Date | null;
  is_converted: boolean;
  converted_siswa_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface PengumumanRecord {
  id: number;
  judul: string;
  konten: string;
  kategori: 'Umum' | 'Akademik' | 'Keuangan' | 'Kegiatan' | 'Penting';
  target_audiens: 'Semua' | 'Guru' | 'Siswa' | 'Staf';
  is_pinned: boolean;
  is_published: boolean;
  created_by_user_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface KalenderAkademikRecord {
  id: number;
  tahun_ajaran_id: number;
  judul_kegiatan: string;
  deskripsi: string | null;
  tanggal_mulai: string;
  tanggal_selesai: string;
  tipe_kegiatan: 'KBM' | 'Libur Nasional' | 'Libur Semester' | 'Ujian' | 'PPDB' | 'Rapat' | 'Ekstrakurikuler' | 'Lainnya';
  warna: string;
  created_at: Date;
  updated_at: Date;
}

// In-Memory store initialization for dev/preview when DATABASE_URL is not provided
class InMemoryDataStore {
  users: UserRecord[] = [];
  madrasahProfile!: MadrasahProfileRecord;
  tahunAjaran: TahunAjaranRecord[] = [];
  guru: GuruRecord[] = [];
  kelas: KelasRecord[] = [];
  mapel: MapelRecord[] = [];
  siswa: SiswaRecord[] = [];
  penempatanSiswa: PenempatanSiswaRecord[] = [];
  pengajaranGuru: PengajaranGuruRecord[] = [];
  jadwalPelajaran: JadwalPelajaranRecord[] = [];
  absensiSiswa: AbsensiSiswaRecord[] = [];
  bobotNilaiList: BobotNilaiRecord[] = [];
  nilaiSiswaList: NilaiSiswaRecord[] = [];
  catatanRaporList: CatatanRaporRecord[] = [];
  jenisPembayaran: JenisPembayaranRecord[] = [];
  tarifPembayaran: TarifPembayaranRecord[] = [];
  tagihanSiswa: TagihanSiswaRecord[] = [];
  transaksiPembayaran: TransaksiPembayaranRecord[] = [];
  auditLogs: AuditLogRecord[] = [];
  ppdbPendaftar: PPDBPendaftarRecord[] = [];
  pengumuman: PengumumanRecord[] = [];
  kalenderAkademik: KalenderAkademikRecord[] = [];

  private nextUserId = 1;
  private nextTaId = 1;
  private nextGuruId = 1;
  private nextKelasId = 1;
  private nextMapelId = 1;
  private nextSiswaId = 1;
  private nextPenempatanId = 1;
  private nextPengajaranId = 1;
  private nextJadwalId = 1;
  private nextAbsensiId = 1;
  private nextBobotId = 1;
  private nextNilaiId = 1;
  private nextCatatanRaporId = 1;
  private nextAuditId = 1;
  private nextJenisBayarId = 1;
  private nextTarifId = 1;
  private nextTagihanId = 1;
  private nextTransaksiId = 1;
  private kwitansiSeq = 1;
  private nextPpdbId = 1;
  private nextPengumumanId = 1;
  private nextKalenderId = 1;
  private ppdbSeq = 1;

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const now = new Date();

    // 1. Password hashes
    const hashedAdmin = bcrypt.hashSync('admin123', 10);
    const hashedStaf = bcrypt.hashSync('staf123', 10);
    const hashedGuru = bcrypt.hashSync('guru123', 10);

    // 2. Profil Madrasah
    this.madrasahProfile = {
      id: 1,
      nama: 'Madrasah Tsanawiyah Negeri 1 Teladan',
      nsm: '121232010001',
      npsn: '20105432',
      alamat: 'Jl. Pendidikan Karakter No. 45, Kompleks Islamic Centre',
      kelurahan: 'Kencana',
      kecamatan: 'Tanah Sareal',
      kabupaten_kota: 'Kota Bogor',
      provinsi: 'Jawa Barat',
      kode_pos: '16161',
      telepon: '0251-8321456',
      email: 'info@mtsn1teladan.sch.id',
      website: 'https://mtsn1teladan.sch.id',
      logo_url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200&auto=format&fit=crop&q=80',
      kepala_madrasah: 'Drs. H. Ahmad Fauzi, M.Pd.I',
      nip_kepala_madrasah: '197508142002121003',
      updated_at: now,
    };

    // 3. Tahun Ajaran
    this.tahunAjaran = [
      {
        id: this.nextTaId++,
        tahun: '2024/2025',
        semester: 'Ganjil',
        is_active: true,
        tanggal_mulai: '2024-07-15',
        tanggal_selesai: '2024-12-20',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextTaId++,
        tahun: '2024/2025',
        semester: 'Genap',
        is_active: false,
        tanggal_mulai: '2025-01-06',
        tanggal_selesai: '2025-06-21',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextTaId++,
        tahun: '2023/2024',
        semester: 'Genap',
        is_active: false,
        tanggal_mulai: '2024-01-08',
        tanggal_selesai: '2024-06-22',
        created_at: now,
        updated_at: now,
      },
    ];

    // 4. Guru
    this.guru = [
      {
        id: this.nextGuruId++,
        nip: '198205122008011015',
        nuptk: '7645760662200022',
        nama: 'Ust. Muhammad Zulkarnain',
        gelar_depan: 'Ust.',
        gelar_belakang: 'M.Pd.I',
        jenis_kelamin: 'L',
        tempat_lahir: 'Cirebon',
        tanggal_lahir: '1982-05-12',
        jabatan: 'Guru Fikih & Wali Kelas 7-A',
        pendidikan_terakhir: 'S2',
        jurusan: 'Pendidikan Agama Islam',
        telepon: '081234567891',
        email: 'zulkarnain@madrasah.sch.id',
        status_kepegawaian: 'PNS',
        foto_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextGuruId++,
        nip: '198809202015022003',
        nuptk: '3445766668210043',
        nama: 'Hj. Siti Fatimah',
        gelar_depan: 'Hj.',
        gelar_belakang: 'S.Pd.',
        jenis_kelamin: 'P',
        tempat_lahir: 'Bogor',
        tanggal_lahir: '1988-09-20',
        jabatan: 'Guru Matematika & Wali Kelas 7-B',
        pendidikan_terakhir: 'S1',
        jurusan: 'Pendidikan Matematika',
        telepon: '081298765432',
        email: 'fatimah@madrasah.sch.id',
        status_kepegawaian: 'PNS',
        foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextGuruId++,
        nip: null,
        nuptk: '1245760662200099',
        nama: 'Ahmad Syarif',
        gelar_depan: '',
        gelar_belakang: 'S.Hum',
        jenis_kelamin: 'L',
        tempat_lahir: 'Kuningan',
        tanggal_lahir: '1992-11-04',
        jabatan: 'Guru Bahasa Arab',
        pendidikan_terakhir: 'S1',
        jurusan: 'Sastra Arab',
        telepon: '085712345678',
        email: 'syarif@madrasah.sch.id',
        status_kepegawaian: 'GTY',
        foto_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextGuruId++,
        nip: '199003152019032014',
        nuptk: '5543768882200011',
        nama: 'Dewi Anggraini',
        gelar_depan: '',
        gelar_belakang: 'S.Pd.I',
        jenis_kelamin: 'P',
        tempat_lahir: 'Bandung',
        tanggal_lahir: '1990-03-15',
        jabatan: "Guru Al-Qur'an Hadis & Wali Kelas 8-A",
        pendidikan_terakhir: 'S1',
        jurusan: 'Ilmu Al-Qur`an & Tafsir',
        telepon: '081387654321',
        email: 'dewi.a@madrasah.sch.id',
        status_kepegawaian: 'PPPK',
        foto_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    // 5. Users (Admin, Staf TU, and Teacher accounts linked to guru_id)
    this.users = [
      {
        id: this.nextUserId++,
        username: 'admin',
        nama_lengkap: 'Administrator Madrasah',
        email: 'admin@madrasah.sch.id',
        password_hash: hashedAdmin,
        role: 'admin',
        staf_role: null,
        guru_id: null,
        is_active: true,
        must_change_password: true,
        permissions: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextUserId++,
        username: 'stafftu',
        nama_lengkap: 'Nurul Hidayati, S.AP',
        email: 'nurul.tu@madrasah.sch.id',
        password_hash: hashedStaf,
        role: 'staf',
        staf_role: 'TU',
        guru_id: null,
        is_active: true,
        must_change_password: false,
        permissions: [
          { module: 'siswa', can_view: true, can_create: true, can_edit: true, can_delete: false },
          { module: 'guru', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { module: 'kelas', can_view: true, can_create: true, can_edit: true, can_delete: false },
          { module: 'mapel', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { module: 'tahun_ajaran', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { module: 'akademik', can_view: true, can_create: true, can_edit: true, can_delete: false },
          { module: 'pengaturan', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { module: 'staf', can_view: false, can_create: false, can_edit: false, can_delete: false },
          { module: 'audit_log', can_view: false, can_create: false, can_edit: false, can_delete: false },
        ],
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextUserId++,
        username: 'guruzul',
        nama_lengkap: 'Ust. Muhammad Zulkarnain, M.Pd.I',
        email: 'zulkarnain@madrasah.sch.id',
        password_hash: hashedGuru,
        role: 'guru',
        staf_role: 'Guru',
        guru_id: 1, // Guru Zulkarnain
        is_active: true,
        must_change_password: false,
        permissions: [
          { module: 'akademik', can_view: true, can_create: true, can_edit: true, can_delete: false },
          { module: 'siswa', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { module: 'kelas', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { module: 'mapel', can_view: true, can_create: false, can_edit: false, can_delete: false },
        ],
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextUserId++,
        username: 'gurusiti',
        nama_lengkap: 'Hj. Siti Fatimah, S.Pd.',
        email: 'fatimah@madrasah.sch.id',
        password_hash: hashedGuru,
        role: 'guru',
        staf_role: 'Guru',
        guru_id: 2, // Guru Fatimah
        is_active: true,
        must_change_password: false,
        permissions: [
          { module: 'akademik', can_view: true, can_create: true, can_edit: true, can_delete: false },
          { module: 'siswa', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { module: 'kelas', can_view: true, can_create: false, can_edit: false, can_delete: false },
        ],
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextUserId++,
        username: 'bendahara',
        nama_lengkap: 'Hj. Maryam Fauziah, S.E.',
        email: 'bendahara@madrasah.sch.id',
        password_hash: hashedStaf,
        role: 'staf',
        staf_role: 'Keuangan',
        guru_id: null,
        is_active: true,
        must_change_password: false,
        permissions: [
          { module: 'keuangan', can_view: true, can_create: true, can_edit: true, can_delete: false },
          { module: 'siswa', can_view: true, can_create: false, can_edit: false, can_delete: false },
          { module: 'kelas', can_view: true, can_create: false, can_edit: false, can_delete: false },
        ],
        created_at: now,
        updated_at: now,
      },
    ];

    // 6. Kelas
    this.kelas = [
      {
        id: this.nextKelasId++,
        tingkat: '7',
        nama: '7-A',
        tahun_ajaran_id: 1,
        wali_kelas_id: 1, // Ust. Muhammad Zulkarnain
        kapasitas: 32,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextKelasId++,
        tingkat: '7',
        nama: '7-B',
        tahun_ajaran_id: 1,
        wali_kelas_id: 2, // Hj. Siti Fatimah
        kapasitas: 32,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextKelasId++,
        tingkat: '8',
        nama: '8-A',
        tahun_ajaran_id: 1,
        wali_kelas_id: 4, // Dewi Anggraini
        kapasitas: 32,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextKelasId++,
        tingkat: '9',
        nama: '9-A',
        tahun_ajaran_id: 1,
        wali_kelas_id: 3, // Ahmad Syarif
        kapasitas: 30,
        created_at: now,
        updated_at: now,
      },
    ];

    // 7. Mapel
    this.mapel = [
      { id: this.nextMapelId++, kode: 'QH-01', nama: "Al-Qur'an Hadis", kelompok: 'PAI', kkm: 78, jam_pelajaran: 2, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'AA-01', nama: 'Akidah Akhlak', kelompok: 'PAI', kkm: 78, jam_pelajaran: 2, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'FKH-01', nama: 'Fikih', kelompok: 'PAI', kkm: 78, jam_pelajaran: 2, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'SKI-01', nama: 'Sejarah Kebudayaan Islam (SKI)', kelompok: 'PAI', kkm: 75, jam_pelajaran: 2, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'BAR-01', nama: 'Bahasa Arab', kelompok: 'PAI', kkm: 75, jam_pelajaran: 3, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'BIN-01', nama: 'Bahasa Indonesia', kelompok: 'Umum', kkm: 75, jam_pelajaran: 4, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'MAT-01', nama: 'Matematika', kelompok: 'Umum', kkm: 75, jam_pelajaran: 4, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'IPA-01', nama: 'Ilmu Pengetahuan Alam (IPA)', kelompok: 'Umum', kkm: 75, jam_pelajaran: 4, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'IPS-01', nama: 'Ilmu Pengetahuan Sosial (IPS)', kelompok: 'Umum', kkm: 75, jam_pelajaran: 3, tingkat: 'Semua', created_at: now, updated_at: now },
      { id: this.nextMapelId++, kode: 'BIG-01', nama: 'Bahasa Inggris', kelompok: 'Umum', kkm: 75, jam_pelajaran: 3, tingkat: 'Semua', created_at: now, updated_at: now },
    ];

    // 8. Siswa
    this.siswa = [
      {
        id: this.nextSiswaId++,
        nis: '242507001',
        nisn: '0091827364',
        nama: 'Muhammad Rizky Ramadhan',
        jenis_kelamin: 'L',
        tempat_lahir: 'Bogor',
        tanggal_lahir: '2011-09-14',
        kelas_id: 1, // 7-A
        tahun_ajaran_masuk_id: 1,
        nama_ayah: 'Dedi Ramadhan',
        nama_ibu: 'Fitri Handayani',
        nama_wali: null,
        pekerjaan_ortu: 'Wiraswasta',
        telepon_ortu: '081288990011',
        alamat: 'Jl. Pemuda No. 12, Tanah Sareal, Bogor',
        status: 'aktif',
        foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextSiswaId++,
        nis: '242507002',
        nisn: '0092837465',
        nama: 'Aisyah Putri Azzahra',
        jenis_kelamin: 'P',
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '2011-04-20',
        kelas_id: 1, // 7-A
        tahun_ajaran_masuk_id: 1,
        nama_ayah: 'Bambang Supriyanto',
        nama_ibu: 'Ratna Sari',
        nama_wali: null,
        pekerjaan_ortu: 'Karyawan Swasta',
        telepon_ortu: '081377889922',
        alamat: 'Komplek Griya Indah Blok C3 No. 5, Bogor',
        status: 'aktif',
        foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextSiswaId++,
        nis: '242507003',
        nisn: '0093847586',
        nama: 'Fathan Bilal Al-Ghifari',
        jenis_kelamin: 'L',
        tempat_lahir: 'Sukabumi',
        tanggal_lahir: '2011-12-05',
        kelas_id: 1, // 7-A
        tahun_ajaran_masuk_id: 1,
        nama_ayah: 'Irfan Hakim',
        nama_ibu: 'Maya Lestari',
        nama_wali: null,
        pekerjaan_ortu: 'PNS',
        telepon_ortu: '085811223344',
        alamat: 'Jl. Raya Ciawi No. 88, Bogor',
        status: 'aktif',
        foto_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&auto=format&fit=crop&q=80',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextSiswaId++,
        nis: '242507004',
        nisn: '0094857697',
        nama: 'Siti Maryam Al-Khadijah',
        jenis_kelamin: 'P',
        tempat_lahir: 'Bogor',
        tanggal_lahir: '2011-08-11',
        kelas_id: 2, // 7-B
        tahun_ajaran_masuk_id: 1,
        nama_ayah: 'Ahmad Marzuki',
        nama_ibu: 'Nur Hasanah',
        nama_wali: null,
        pekerjaan_ortu: 'Pedagang',
        telepon_ortu: '081987654321',
        alamat: 'Jl. Ahmad Yani No. 25, Bogor',
        status: 'aktif',
        foto_url: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextSiswaId++,
        nis: '232408001',
        nisn: '0081726354',
        nama: 'Zahra Nur Salsabila',
        jenis_kelamin: 'P',
        tempat_lahir: 'Bogor',
        tanggal_lahir: '2010-06-18',
        kelas_id: 3, // 8-A
        tahun_ajaran_masuk_id: 1,
        nama_ayah: 'H. Lukman Hakim',
        nama_ibu: 'Hj. Aminah',
        nama_wali: null,
        pekerjaan_ortu: 'Pedagang',
        telepon_ortu: '081299887766',
        alamat: 'Kp. Muara RT 02/05, Bogor Selatan',
        status: 'aktif',
        foto_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextSiswaId++,
        nis: '222309001',
        nisn: '0071625344',
        nama: 'Raihan Pratama',
        jenis_kelamin: 'L',
        tempat_lahir: 'Depok',
        tanggal_lahir: '2009-02-11',
        kelas_id: 4, // 9-A
        tahun_ajaran_masuk_id: 1,
        nama_ayah: 'Pratama Seno',
        nama_ibu: 'Wulan Guritno',
        nama_wali: null,
        pekerjaan_ortu: 'Wiraswasta',
        telepon_ortu: '081122334455',
        alamat: 'Jl. Merdeka No. 101, Bogor',
        status: 'aktif',
        foto_url: null,
        created_at: now,
        updated_at: now,
      },
    ];

    // 9. Penempatan Siswa Awal
    this.penempatanSiswa = [
      { id: this.nextPenempatanId++, siswa_id: 1, kelas_id: 1, tahun_ajaran_id: 1, status: 'aktif', catatan: 'Siswa baru diterima', created_at: now, updated_at: now },
      { id: this.nextPenempatanId++, siswa_id: 2, kelas_id: 1, tahun_ajaran_id: 1, status: 'aktif', catatan: 'Siswa baru diterima', created_at: now, updated_at: now },
      { id: this.nextPenempatanId++, siswa_id: 3, kelas_id: 1, tahun_ajaran_id: 1, status: 'aktif', catatan: 'Siswa baru diterima', created_at: now, updated_at: now },
      { id: this.nextPenempatanId++, siswa_id: 4, kelas_id: 2, tahun_ajaran_id: 1, status: 'aktif', catatan: 'Siswa baru diterima', created_at: now, updated_at: now },
      { id: this.nextPenempatanId++, siswa_id: 5, kelas_id: 3, tahun_ajaran_id: 1, status: 'aktif', catatan: 'Naik dari kelas 7-A', created_at: now, updated_at: now },
      { id: this.nextPenempatanId++, siswa_id: 6, kelas_id: 4, tahun_ajaran_id: 1, status: 'aktif', catatan: 'Naik dari kelas 8-A', created_at: now, updated_at: now },
    ];

    // 10. Pengajaran Guru (Penugasan)
    this.pengajaranGuru = [
      { id: this.nextPengajaranId++, guru_id: 1, mapel_id: 3, kelas_id: 1, tahun_ajaran_id: 1, beban_jp: 2, created_at: now, updated_at: now }, // Ust Zulkarnain -> Fikih di 7-A
      { id: this.nextPengajaranId++, guru_id: 1, mapel_id: 3, kelas_id: 2, tahun_ajaran_id: 1, beban_jp: 2, created_at: now, updated_at: now }, // Ust Zulkarnain -> Fikih di 7-B
      { id: this.nextPengajaranId++, guru_id: 2, mapel_id: 7, kelas_id: 1, tahun_ajaran_id: 1, beban_jp: 4, created_at: now, updated_at: now }, // Hj Fatimah -> MTK di 7-A
      { id: this.nextPengajaranId++, guru_id: 2, mapel_id: 7, kelas_id: 2, tahun_ajaran_id: 1, beban_jp: 4, created_at: now, updated_at: now }, // Hj Fatimah -> MTK di 7-B
      { id: this.nextPengajaranId++, guru_id: 3, mapel_id: 5, kelas_id: 1, tahun_ajaran_id: 1, beban_jp: 3, created_at: now, updated_at: now }, // Ahmad Syarif -> B. Arab di 7-A
      { id: this.nextPengajaranId++, guru_id: 4, mapel_id: 1, kelas_id: 1, tahun_ajaran_id: 1, beban_jp: 2, created_at: now, updated_at: now }, // Dewi Anggraini -> Qur'an Hadis di 7-A
      { id: this.nextPengajaranId++, guru_id: 4, mapel_id: 2, kelas_id: 1, tahun_ajaran_id: 1, beban_jp: 2, created_at: now, updated_at: now }, // Dewi Anggraini -> Akidah Akhlak di 7-A
    ];

    // 11. Jadwal Pelajaran Awal
    this.jadwalPelajaran = [
      { id: this.nextJadwalId++, tahun_ajaran_id: 1, kelas_id: 1, mapel_id: 1, guru_id: 4, hari: 'Senin', jam_ke: 1, jam_mulai: '07:15', jam_selesai: '08:35', ruang: 'Ruang 7-A', created_at: now, updated_at: now },
      { id: this.nextJadwalId++, tahun_ajaran_id: 1, kelas_id: 1, mapel_id: 3, guru_id: 1, hari: 'Senin', jam_ke: 2, jam_mulai: '08:35', jam_selesai: '09:55', ruang: 'Ruang 7-A', created_at: now, updated_at: now },
      { id: this.nextJadwalId++, tahun_ajaran_id: 1, kelas_id: 1, mapel_id: 7, guru_id: 2, hari: 'Selasa', jam_ke: 1, jam_mulai: '07:15', jam_selesai: '08:35', ruang: 'Ruang 7-A', created_at: now, updated_at: now },
      { id: this.nextJadwalId++, tahun_ajaran_id: 1, kelas_id: 1, mapel_id: 5, guru_id: 3, hari: 'Rabu', jam_ke: 1, jam_mulai: '07:15', jam_selesai: '08:35', ruang: 'Ruang 7-A', created_at: now, updated_at: now },
      { id: this.nextJadwalId++, tahun_ajaran_id: 1, kelas_id: 2, mapel_id: 7, guru_id: 2, hari: 'Senin', jam_ke: 1, jam_mulai: '07:15', jam_selesai: '08:35', ruang: 'Ruang 7-B', created_at: now, updated_at: now },
    ];

    // 12. Bobot Nilai Awal
    this.bobotNilaiList = [
      {
        id: this.nextBobotId++,
        tahun_ajaran_id: 1,
        bobot_tugas: 20,
        bobot_uh: 20,
        bobot_uts: 25,
        bobot_uas: 25,
        bobot_keterampilan: 10,
        updated_at: now,
      },
    ];

    // 13. Absensi Siswa Contoh
    const today = new Date().toISOString().slice(0, 10);
    this.absensiSiswa = [
      { id: this.nextAbsensiId++, siswa_id: 1, kelas_id: 1, tahun_ajaran_id: 1, tanggal: today, status: 'H', catatan: 'Tepat waktu', created_by_user_id: 1, created_at: now, updated_at: now },
      { id: this.nextAbsensiId++, siswa_id: 2, kelas_id: 1, tahun_ajaran_id: 1, tanggal: today, status: 'H', catatan: '', created_by_user_id: 1, created_at: now, updated_at: now },
      { id: this.nextAbsensiId++, siswa_id: 3, kelas_id: 1, tahun_ajaran_id: 1, tanggal: today, status: 'S', catatan: 'Flu dan demam', created_by_user_id: 1, created_at: now, updated_at: now },
    ];

    // 14. Nilai Siswa Contoh
    this.nilaiSiswaList = [
      {
        id: this.nextNilaiId++,
        siswa_id: 1,
        mapel_id: 3, // Fikih
        kelas_id: 1,
        tahun_ajaran_id: 1,
        nilai_tugas: 88,
        nilai_uh: 85,
        nilai_uts: 86,
        nilai_uas: 90,
        nilai_keterampilan: 88,
        nilai_akhir: 87.4,
        predikat: 'B',
        catatan: 'Penguasaan materi thaharah dan shalat sangat baik.',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextNilaiId++,
        siswa_id: 1,
        mapel_id: 1, // Al-Qur'an Hadis
        kelas_id: 1,
        tahun_ajaran_id: 1,
        nilai_tugas: 92,
        nilai_uh: 90,
        nilai_uts: 91,
        nilai_uas: 95,
        nilai_keterampilan: 94,
        nilai_akhir: 92.4,
        predikat: 'A',
        catatan: 'Tajwid dan makharijul huruf fasih dan istiqomah.',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextNilaiId++,
        siswa_id: 1,
        mapel_id: 7, // Matematika
        kelas_id: 1,
        tahun_ajaran_id: 1,
        nilai_tugas: 80,
        nilai_uh: 78,
        nilai_uts: 82,
        nilai_uas: 85,
        nilai_keterampilan: 80,
        nilai_akhir: 81.6,
        predikat: 'B',
        catatan: 'Terus tingkatkan pemahaman konsep aljabar.',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextNilaiId++,
        siswa_id: 2,
        mapel_id: 3, // Fikih
        kelas_id: 1,
        tahun_ajaran_id: 1,
        nilai_tugas: 95,
        nilai_uh: 92,
        nilai_uts: 94,
        nilai_uas: 96,
        nilai_keterampilan: 95,
        nilai_akhir: 94.4,
        predikat: 'A',
        catatan: 'Sangat menguasai fikih ibadah dan praktiknya.',
        created_at: now,
        updated_at: now,
      },
    ];

    // 15. Catatan Rapor & Sikap / Tahfidz Contoh
    this.catatanRaporList = [
      {
        id: this.nextCatatanRaporId++,
        siswa_id: 1,
        kelas_id: 1,
        tahun_ajaran_id: 1,
        sikap_spiritual: 'Sangat Baik',
        deskripsi_spiritual: 'Selalu tertib shalat dhuha dan berdoa sebelum/sesudah pembelajaran dengan khusyuk.',
        sikap_sosial: 'Sangat Baik',
        deskripsi_sosial: 'Memiliki empati tinggi, santun kepada guru dan kompak membantu teman sekelas.',
        juz_hafalan: 'Juz 30 (An-Naba s.d. An-Nas)',
        surah_terakhir: 'Surah Al-Buruj ayat 1-22',
        predikat_tahfidz: 'Mutqin',
        catatan_wali_kelas: 'Prestasi dan akhlak ananda sangat membanggakan. Pertahankan semangat belajar!',
        status_akhir: 'Naik Kelas',
        naik_ke_kelas: '8-A',
        updated_at: now,
      },
      {
        id: this.nextCatatanRaporId++,
        siswa_id: 2,
        kelas_id: 1,
        tahun_ajaran_id: 1,
        sikap_spiritual: 'Sangat Baik',
        deskripsi_spiritual: 'Ketaatan beribadah dan akhlakul karimah sangat menonjol.',
        sikap_sosial: 'Sangat Baik',
        deskripsi_sosial: 'Disiplin, jujur, dan bertanggung jawab penuh dalam tugas kelompok.',
        juz_hafalan: 'Juz 30 & Juz 29',
        surah_terakhir: 'Surah Al-Mulk ayat 1-30',
        predikat_tahfidz: 'Jayyid Jiddan',
        catatan_wali_kelas: 'Teruslah menjadi teladan bagi teman-temanmu di madrasah.',
        status_akhir: 'Naik Kelas',
        naik_ke_kelas: '8-A',
        updated_at: now,
      },
    ];

    // 16. Jenis Pembayaran Awal
    this.jenisPembayaran = [
      {
        id: this.nextJenisBayarId++,
        nama: 'SPP Bulanan',
        tipe: 'bulanan',
        deskripsi: 'Sumbangan Pembinaan Pendidikan (SPP) rutin per bulan',
        tahun_ajaran_id: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextJenisBayarId++,
        nama: 'Infaq Pembangunan / Uang Gedung',
        tipe: 'bebas',
        deskripsi: 'Dana pengembangan sarana dan prasarana madrasah (bisa dicicil)',
        tahun_ajaran_id: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextJenisBayarId++,
        nama: 'Paket Seragam & Kitab Siswa',
        tipe: 'bebas',
        deskripsi: 'Pengadaan seragam batik, pramuka, olahraga, dan buku paket/kitab kuning',
        tahun_ajaran_id: 1,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ];

    // 17. Tarif Pembayaran Awal
    this.tarifPembayaran = [
      // SPP Bulanan
      { id: this.nextTarifId++, jenis_pembayaran_id: 1, tingkat: '7', kelas_id: null, nominal: 250000, created_at: now, updated_at: now },
      { id: this.nextTarifId++, jenis_pembayaran_id: 1, tingkat: '8', kelas_id: null, nominal: 250000, created_at: now, updated_at: now },
      { id: this.nextTarifId++, jenis_pembayaran_id: 1, tingkat: '9', kelas_id: null, nominal: 275000, created_at: now, updated_at: now },
      // Infaq Pembangunan
      { id: this.nextTarifId++, jenis_pembayaran_id: 2, tingkat: 'Semua', kelas_id: null, nominal: 1500000, created_at: now, updated_at: now },
      // Paket Seragam
      { id: this.nextTarifId++, jenis_pembayaran_id: 3, tingkat: '7', kelas_id: null, nominal: 750000, created_at: now, updated_at: now },
      { id: this.nextTarifId++, jenis_pembayaran_id: 3, tingkat: '8', kelas_id: null, nominal: 400000, created_at: now, updated_at: now },
      { id: this.nextTarifId++, jenis_pembayaran_id: 3, tingkat: '9', kelas_id: null, nominal: 400000, created_at: now, updated_at: now },
    ];

    // 18. Tagihan Siswa Contoh
    this.tagihanSiswa = [
      // Siswa 1 (Fatih, Kelas 7-A): SPP Juli (Lunas), SPP Agustus (Lunas), SPP September (Belum Bayar), Infaq Pembangunan (Sebagian)
      { id: this.nextTagihanId++, siswa_id: 1, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'Juli', nominal: 250000, terbayar: 250000, sisa: 0, status: 'lunas', jatuh_tempo: '2024-07-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 1, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'Agustus', nominal: 250000, terbayar: 250000, sisa: 0, status: 'lunas', jatuh_tempo: '2024-08-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 1, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'September', nominal: 250000, terbayar: 0, sisa: 250000, status: 'belum_bayar', jatuh_tempo: '2024-09-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 1, kelas_id: 1, jenis_pembayaran_id: 2, tahun_ajaran_id: 1, bulan: null, nominal: 1500000, terbayar: 750000, sisa: 750000, status: 'sebagian', jatuh_tempo: '2024-12-31', catatan: 'Cicilan 1 dibayar saat pendaftaran', created_at: now, updated_at: now },

      // Siswa 2 (Aisyah, Kelas 7-A): SPP Juli (Lunas), SPP Agustus (Lunas), SPP September (Lunas), Paket Seragam (Lunas)
      { id: this.nextTagihanId++, siswa_id: 2, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'Juli', nominal: 250000, terbayar: 250000, sisa: 0, status: 'lunas', jatuh_tempo: '2024-07-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 2, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'Agustus', nominal: 250000, terbayar: 250000, sisa: 0, status: 'lunas', jatuh_tempo: '2024-08-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 2, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'September', nominal: 250000, terbayar: 250000, sisa: 0, status: 'lunas', jatuh_tempo: '2024-09-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 2, kelas_id: 1, jenis_pembayaran_id: 3, tahun_ajaran_id: 1, bulan: null, nominal: 750000, terbayar: 750000, sisa: 0, status: 'lunas', jatuh_tempo: '2024-08-31', catatan: null, created_at: now, updated_at: now },

      // Siswa 3 (Rizky, Kelas 7-A): SPP Juli (Belum Bayar), SPP Agustus (Belum Bayar), SPP September (Belum Bayar) -> Menunggak
      { id: this.nextTagihanId++, siswa_id: 3, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'Juli', nominal: 250000, terbayar: 0, sisa: 250000, status: 'belum_bayar', jatuh_tempo: '2024-07-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 3, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'Agustus', nominal: 250000, terbayar: 0, sisa: 250000, status: 'belum_bayar', jatuh_tempo: '2024-08-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 3, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'September', nominal: 250000, terbayar: 0, sisa: 250000, status: 'belum_bayar', jatuh_tempo: '2024-09-10', catatan: null, created_at: now, updated_at: now },

      // Siswa 4 (Siti Maryam, Kelas 7-B): SPP Juli (Lunas), SPP Agustus (Lunas), SPP September (Belum Bayar)
      { id: this.nextTagihanId++, siswa_id: 4, kelas_id: 2, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'Juli', nominal: 250000, terbayar: 250000, sisa: 0, status: 'lunas', jatuh_tempo: '2024-07-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 4, kelas_id: 2, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'Agustus', nominal: 250000, terbayar: 250000, sisa: 0, status: 'lunas', jatuh_tempo: '2024-08-10', catatan: null, created_at: now, updated_at: now },
      { id: this.nextTagihanId++, siswa_id: 4, kelas_id: 2, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: 'September', nominal: 250000, terbayar: 0, sisa: 250000, status: 'belum_bayar', jatuh_tempo: '2024-09-10', catatan: null, created_at: now, updated_at: now },
    ];

    // 19. Transaksi Pembayaran Awal
    this.transaksiPembayaran = [
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202407-0001', tagihan_id: 1, siswa_id: 1, jumlah_bayar: 250000, metode: 'Tunai', tanggal_bayar: '2024-07-08', catatan: 'Pembayaran SPP Juli langsung di kasir TU', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202408-0002', tagihan_id: 2, siswa_id: 1, jumlah_bayar: 250000, metode: 'Transfer', tanggal_bayar: '2024-08-05', catatan: 'Transfer via BSI Mobile', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202408-0003', tagihan_id: 4, siswa_id: 1, jumlah_bayar: 750000, metode: 'Transfer', tanggal_bayar: '2024-08-05', catatan: 'Cicilan 1 Infaq Pembangunan', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202407-0004', tagihan_id: 5, siswa_id: 2, jumlah_bayar: 250000, metode: 'Tunai', tanggal_bayar: '2024-07-09', catatan: 'Lunas SPP Juli', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202408-0005', tagihan_id: 6, siswa_id: 2, jumlah_bayar: 250000, metode: 'Tunai', tanggal_bayar: '2024-08-08', catatan: 'Lunas SPP Agustus', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202408-0006', tagihan_id: 8, siswa_id: 2, jumlah_bayar: 750000, metode: 'Tunai', tanggal_bayar: '2024-08-08', catatan: 'Lunas Paket Seragam & Kitab', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202409-0007', tagihan_id: 7, siswa_id: 2, jumlah_bayar: 250000, metode: 'Transfer', tanggal_bayar: '2024-09-06', catatan: 'Transfer BSI', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202407-0008', tagihan_id: 12, siswa_id: 4, jumlah_bayar: 250000, metode: 'Tunai', tanggal_bayar: '2024-07-10', catatan: 'Lunas SPP Juli', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
      { id: this.nextTransaksiId++, nomor_transaksi: 'KWT-202408-0009', tagihan_id: 13, siswa_id: 4, jumlah_bayar: 250000, metode: 'Tunai', tanggal_bayar: '2024-08-09', catatan: 'Lunas SPP Agustus', created_by_user_id: 1, status: 'valid', alasan_batal: null, cancelled_at: null, cancelled_by_user_id: null, created_at: now, updated_at: now },
    ];
    this.kwitansiSeq = 10;

    // 20. Audit Log Awal
    this.auditLogs = [
      {
        id: this.nextAuditId++,
        user_id: 1,
        username: 'admin',
        action: 'CREATE',
        entity: 'auth',
        details: 'Sistem SIAKAD Madrasah (Modul Master & Akademik) diinisialisasi.',
        ip_address: '127.0.0.1',
        created_at: now,
      },
    ];

    // 21. PPDB Pendaftar Awal
    this.ppdbPendaftar = [
      {
        id: this.nextPpdbId++,
        nomor_pendaftaran: 'PPDB-2024-0001',
        tahun_ajaran_id: 1,
        jalur_pendaftaran: 'Prestasi',
        nama_lengkap: 'Zaidan Al-Farisi',
        nisn: '0092831201',
        nik: '3201123456780001',
        jenis_kelamin: 'L',
        tempat_lahir: 'Bogor',
        tanggal_lahir: '2012-03-15',
        sekolah_asal: 'SD IT Al-Izzah',
        nama_ayah: 'Faisal Akbar',
        nama_ibu: 'Nurul Komariah',
        telepon_ortu: '081299887766',
        email_ortu: 'faisal.akbar@gmail.com',
        alamat: 'Jl. Ahmad Yani No. 88, Tanah Sareal, Kota Bogor',
        berkas_foto_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=200&auto=format&fit=crop&q=80',
        berkas_ijazah_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        berkas_akta_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        berkas_kk_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        status: 'diterima',
        catatan_verifikasi: 'Berkas lengkap dan lulus tes baca Al-Quran & tahfidz 2 Juz.',
        verified_by_user_id: 2,
        verified_at: now,
        is_converted: false,
        converted_siswa_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextPpdbId++,
        nomor_pendaftaran: 'PPDB-2024-0002',
        tahun_ajaran_id: 1,
        jalur_pendaftaran: 'Reguler',
        nama_lengkap: 'Nadia Az-Zahra',
        nisn: '0092831202',
        nik: '3201123456780002',
        jenis_kelamin: 'P',
        tempat_lahir: 'Jakarta',
        tanggal_lahir: '2012-07-22',
        sekolah_asal: 'MI Nurul Huda',
        nama_ayah: 'Hendri Kurniawan',
        nama_ibu: 'Sri Wahyuni',
        telepon_ortu: '081377665544',
        email_ortu: 'hendri.k@gmail.com',
        alamat: 'Komplek Griya Asri Blok D4 No. 12, Bogor',
        berkas_foto_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
        berkas_ijazah_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        berkas_akta_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        berkas_kk_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        status: 'terverifikasi',
        catatan_verifikasi: 'Dokumen administrasi valid. Menunggu hasil wawancara peminatan.',
        verified_by_user_id: 2,
        verified_at: now,
        is_converted: false,
        converted_siswa_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextPpdbId++,
        nomor_pendaftaran: 'PPDB-2024-0003',
        tahun_ajaran_id: 1,
        jalur_pendaftaran: 'Tahfidz',
        nama_lengkap: 'Bilal Rahmatullah',
        nisn: '0092831203',
        nik: '3201123456780003',
        jenis_kelamin: 'L',
        tempat_lahir: 'Depok',
        tanggal_lahir: '2012-05-10',
        sekolah_asal: 'SD Islam Terpadu Insan Mandiri',
        nama_ayah: 'Rahmat Hidayat',
        nama_ibu: 'Amina Salma',
        telepon_ortu: '085611223344',
        email_ortu: 'rahmat.h@gmail.com',
        alamat: 'Jl. KH Sholeh Iskandar No. 20, Bogor',
        berkas_foto_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&auto=format&fit=crop&q=80',
        berkas_ijazah_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        berkas_akta_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        berkas_kk_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80',
        status: 'menunggu_verifikasi',
        catatan_verifikasi: null,
        verified_by_user_id: null,
        verified_at: null,
        is_converted: false,
        converted_siswa_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextPpdbId++,
        nomor_pendaftaran: 'PPDB-2024-0004',
        tahun_ajaran_id: 1,
        jalur_pendaftaran: 'Reguler',
        nama_lengkap: 'Taufiq Ismail',
        nisn: '0092831204',
        nik: '3201123456780004',
        jenis_kelamin: 'L',
        tempat_lahir: 'Sukabumi',
        tanggal_lahir: '2011-12-01',
        sekolah_asal: 'SD Negeri Sukasari 1',
        nama_ayah: 'Suryadi',
        nama_ibu: 'Tati Mulyati',
        telepon_ortu: '087811992233',
        email_ortu: 'suryadi@gmail.com',
        alamat: 'Jl. Raya Ciawi No. 45, Bogor',
        berkas_foto_url: null,
        berkas_ijazah_url: null,
        berkas_akta_url: null,
        berkas_kk_url: null,
        status: 'ditolak',
        catatan_verifikasi: 'Usia melampaui batas persyaratan jenjang MTs dan berkas tidak diunggah.',
        verified_by_user_id: 2,
        verified_at: now,
        is_converted: false,
        converted_siswa_id: null,
        created_at: now,
        updated_at: now,
      },
    ];
    this.ppdbSeq = 5;

    // 22. Pengumuman Awal
    this.pengumuman = [
      {
        id: this.nextPengumumanId++,
        judul: 'Penerimaan Peserta Didik Baru (PPDB) Tahun Pelajaran 2024/2025 Dibuka!',
        konten: 'Pendaftaran PPDB MTsN 1 Teladan dibuka untuk jalur Reguler, Prestasi, dan Tahfidz. Calon peserta didik dapat mengisi formulir pendaftaran secara online tanpa perlu datang langsung ke madrasah pada tahap awal.',
        kategori: 'Penting',
        target_audiens: 'Semua',
        is_pinned: true,
        is_published: true,
        created_by_user_id: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextPengumumanId++,
        judul: 'Pelaksanaan Penilaian Tengah Semester (PTS) Ganjil',
        konten: 'Diberitahukan kepada seluruh bapak/ibu guru dan santriwan-santriwati bahwa PTS Ganjil akan diselenggarakan mulai tanggal 23 s.d. 28 September 2024. Mohon mempersiapkan administrasi soal dan kelengkapan belajar.',
        kategori: 'Akademik',
        target_audiens: 'Semua',
        is_pinned: false,
        is_published: true,
        created_by_user_id: 1,
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextPengumumanId++,
        judul: 'Pemberitahuan Rekap Pembayaran SPP dan Tagihan Madrasah',
        konten: 'Laporan keuangan dan rekapitulasi SPP bulan September telah diterbitkan. Bagi wali murid dapat melakukan pembayaran melalui loket kasir TU madrasah atau transfer bank resmi madrasah.',
        kategori: 'Keuangan',
        target_audiens: 'Staf',
        is_pinned: false,
        is_published: true,
        created_by_user_id: 5,
        created_at: now,
        updated_at: now,
      },
    ];

    // 23. Kalender Akademik Awal
    this.kalenderAkademik = [
      {
        id: this.nextKalenderId++,
        tahun_ajaran_id: 1,
        judul_kegiatan: 'Awal Masuk Madrasah & Matsama (Masa Ta`aruf)',
        deskripsi: 'Pengenalan lingkungan madrasah bagi santri baru kelas 7 dan awal KBM semester ganjil.',
        tanggal_mulai: '2024-07-15',
        tanggal_selesai: '2024-07-17',
        tipe_kegiatan: 'KBM',
        warna: 'emerald',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextKalenderId++,
        tahun_ajaran_id: 1,
        judul_kegiatan: 'Peringatan Hari Kemerdekaan RI Ke-79',
        deskripsi: 'Upacara bendera dan lomba santri madrasah.',
        tanggal_mulai: '2024-08-17',
        tanggal_selesai: '2024-08-17',
        tipe_kegiatan: 'Libur Nasional',
        warna: 'rose',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextKalenderId++,
        tahun_ajaran_id: 1,
        judul_kegiatan: 'Penilaian Tengah Semester (PTS) Ganjil',
        deskripsi: 'Ujian tertulis serentak untuk seluruh tingkat rombel kelas 7, 8, dan 9.',
        tanggal_mulai: '2024-09-23',
        tanggal_selesai: '2024-09-28',
        tipe_kegiatan: 'Ujian',
        warna: 'amber',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextKalenderId++,
        tahun_ajaran_id: 1,
        judul_kegiatan: 'Peringatan Hari Santri Nasional',
        deskripsi: 'Apel akbar santri dan tabligh akbar sivitas akademika madrasah.',
        tanggal_mulai: '2024-10-22',
        tanggal_selesai: '2024-10-22',
        tipe_kegiatan: 'Ekstrakurikuler',
        warna: 'blue',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextKalenderId++,
        tahun_ajaran_id: 1,
        judul_kegiatan: 'Penilaian Akhir Semester (PAS) Ganjil',
        deskripsi: 'Ujian akhir semester ganjil berbasis komputer (CBT).',
        tanggal_mulai: '2024-12-02',
        tanggal_selesai: '2024-12-09',
        tipe_kegiatan: 'Ujian',
        warna: 'purple',
        created_at: now,
        updated_at: now,
      },
      {
        id: this.nextKalenderId++,
        tahun_ajaran_id: 1,
        judul_kegiatan: 'Pembagian Buku Rapor Semester Ganjil',
        deskripsi: 'Penerimaan rapor santri langsung oleh orang tua / wali santri.',
        tanggal_mulai: '2024-12-20',
        tanggal_selesai: '2024-12-20',
        tipe_kegiatan: 'Rapat',
        warna: 'emerald',
        created_at: now,
        updated_at: now,
      },
    ];
  }

  // ==========================================
  // USER METHODS
  // ==========================================
  getUserById(id: number) {
    return this.users.find((u) => u.id === id) || null;
  }

  getUserByUsername(username: string) {
    return this.users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  getAllStaf() {
    return this.users
      .filter((u) => u.role === 'staf' || u.role === 'guru')
      .map(({ password_hash, ...rest }) => rest);
  }

  createUser(data: Partial<UserRecord>) {
    const newUser: UserRecord = {
      id: this.nextUserId++,
      username: data.username!,
      nama_lengkap: data.nama_lengkap!,
      email: data.email || null,
      password_hash: data.password_hash!,
      role: data.role || 'staf',
      staf_role: data.staf_role || null,
      guru_id: data.guru_id || null,
      is_active: data.is_active !== undefined ? data.is_active : true,
      must_change_password: data.must_change_password || false,
      permissions: data.permissions || [],
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.users.push(newUser);
    return newUser;
  }

  updateUser(id: number, data: Partial<UserRecord>) {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.users[idx] = {
      ...this.users[idx],
      ...data,
      updated_at: new Date(),
    };
    return this.users[idx];
  }

  deleteUser(id: number) {
    const idx = this.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.users.splice(idx, 1);
    return true;
  }

  // ==========================================
  // PROFIL MADRASAH
  // ==========================================
  getMadrasahProfile() {
    return this.madrasahProfile;
  }

  updateMadrasahProfile(data: Partial<MadrasahProfileRecord>) {
    this.madrasahProfile = {
      ...this.madrasahProfile,
      ...data,
      updated_at: new Date(),
    };
    return this.madrasahProfile;
  }

  // ==========================================
  // TAHUN AJARAN
  // ==========================================
  getTahunAjaranList() {
    return [...this.tahunAjaran].sort((a, b) => b.id - a.id);
  }

  getActiveTahunAjaran() {
    return this.tahunAjaran.find((ta) => ta.is_active) || this.tahunAjaran[0] || null;
  }

  createTahunAjaran(data: Omit<TahunAjaranRecord, 'id' | 'created_at' | 'updated_at'>) {
    if (data.is_active) {
      this.tahunAjaran.forEach((ta) => (ta.is_active = false));
    }
    const newTa: TahunAjaranRecord = {
      ...data,
      id: this.nextTaId++,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.tahunAjaran.unshift(newTa);
    return newTa;
  }

  updateTahunAjaran(id: number, data: Partial<TahunAjaranRecord>) {
    const idx = this.tahunAjaran.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    if (data.is_active) {
      this.tahunAjaran.forEach((ta) => (ta.is_active = false));
    }
    this.tahunAjaran[idx] = {
      ...this.tahunAjaran[idx],
      ...data,
      updated_at: new Date(),
    };
    return this.tahunAjaran[idx];
  }

  deleteTahunAjaran(id: number) {
    const idx = this.tahunAjaran.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.tahunAjaran.splice(idx, 1);
    return true;
  }

  // ==========================================
  // GURU & KELAS & MAPEL
  // ==========================================
  getGuruList(options: { search?: string; status?: string; page?: number; limit?: number }) {
    let result = [...this.guru];
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (g) =>
          g.nama.toLowerCase().includes(q) ||
          (g.nip && g.nip.includes(q)) ||
          (g.nuptk && g.nuptk.includes(q)) ||
          g.jabatan.toLowerCase().includes(q)
      );
    }
    if (options.status !== undefined && options.status !== '') {
      const isActive = options.status === 'aktif';
      result = result.filter((g) => g.is_active === isActive);
    }

    const total = result.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const data = result.slice(offset, offset + limit);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getAllGuruSimple() {
    return this.guru.map((g) => ({
      id: g.id,
      nama: g.nama,
      gelar_depan: g.gelar_depan,
      gelar_belakang: g.gelar_belakang,
      nip: g.nip,
      jabatan: g.jabatan,
    }));
  }

  getGuruById(id: number) {
    return this.guru.find((g) => g.id === id) || null;
  }

  createGuru(data: Omit<GuruRecord, 'id' | 'created_at' | 'updated_at'>) {
    const newGuru: GuruRecord = {
      ...data,
      id: this.nextGuruId++,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.guru.unshift(newGuru);
    return newGuru;
  }

  updateGuru(id: number, data: Partial<GuruRecord>) {
    const idx = this.guru.findIndex((g) => g.id === id);
    if (idx === -1) return null;
    this.guru[idx] = {
      ...this.guru[idx],
      ...data,
      updated_at: new Date(),
    };
    return this.guru[idx];
  }

  deleteGuru(id: number) {
    const idx = this.guru.findIndex((g) => g.id === id);
    if (idx === -1) return false;
    this.guru.splice(idx, 1);
    return true;
  }

  getKelasList(options: { tingkat?: string; search?: string; page?: number; limit?: number }) {
    let result = [...this.kelas];
    if (options.tingkat) {
      result = result.filter((k) => k.tingkat === options.tingkat);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter((k) => k.nama.toLowerCase().includes(q));
    }

    const enriched = result.map((k) => {
      const ta = this.tahunAjaran.find((t) => t.id === k.tahun_ajaran_id);
      const wk = k.wali_kelas_id ? this.guru.find((g) => g.id === k.wali_kelas_id) : null;
      const totalSiswa = this.siswa.filter((s) => s.kelas_id === k.id && s.status === 'aktif').length;
      return {
        ...k,
        tahun_ajaran: ta,
        wali_kelas: wk,
        total_siswa: totalSiswa,
      };
    });

    const total = enriched.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const data = enriched.slice(offset, offset + limit);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getAllKelasSimple() {
    return this.kelas.map((k) => ({
      id: k.id,
      nama: k.nama,
      tingkat: k.tingkat,
      wali_kelas_id: k.wali_kelas_id,
    }));
  }

  getKelasById(id: number) {
    const k = this.kelas.find((item) => item.id === id);
    if (!k) return null;
    const ta = this.tahunAjaran.find((t) => t.id === k.tahun_ajaran_id);
    const wk = k.wali_kelas_id ? this.guru.find((g) => g.id === k.wali_kelas_id) : null;
    const totalSiswa = this.siswa.filter((s) => s.kelas_id === k.id && s.status === 'aktif').length;
    return { ...k, tahun_ajaran: ta, wali_kelas: wk, total_siswa: totalSiswa };
  }

  createKelas(data: Omit<KelasRecord, 'id' | 'created_at' | 'updated_at'>) {
    const newKelas: KelasRecord = {
      ...data,
      id: this.nextKelasId++,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.kelas.push(newKelas);
    return newKelas;
  }

  updateKelas(id: number, data: Partial<KelasRecord>) {
    const idx = this.kelas.findIndex((k) => k.id === id);
    if (idx === -1) return null;
    this.kelas[idx] = {
      ...this.kelas[idx],
      ...data,
      updated_at: new Date(),
    };
    return this.kelas[idx];
  }

  deleteKelas(id: number) {
    const idx = this.kelas.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    this.kelas.splice(idx, 1);
    return true;
  }

  getMapelList(options: { kelompok?: string; search?: string; page?: number; limit?: number }) {
    let result = [...this.mapel];
    if (options.kelompok) {
      result = result.filter((m) => m.kelompok === options.kelompok);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (m) => m.nama.toLowerCase().includes(q) || m.kode.toLowerCase().includes(q)
      );
    }

    const total = result.length;
    const page = options.page || 1;
    const limit = options.limit || 15;
    const offset = (page - 1) * limit;
    const data = result.slice(offset, offset + limit);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getAllMapelSimple() {
    return this.mapel.map((m) => ({
      id: m.id,
      kode: m.kode,
      nama: m.nama,
      kelompok: m.kelompok,
      kkm: m.kkm,
    }));
  }

  getMapelById(id: number) {
    return this.mapel.find((m) => m.id === id) || null;
  }

  createMapel(data: Omit<MapelRecord, 'id' | 'created_at' | 'updated_at'>) {
    const newMapel: MapelRecord = {
      ...data,
      id: this.nextMapelId++,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.mapel.push(newMapel);
    return newMapel;
  }

  updateMapel(id: number, data: Partial<MapelRecord>) {
    const idx = this.mapel.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    this.mapel[idx] = {
      ...this.mapel[idx],
      ...data,
      updated_at: new Date(),
    };
    return this.mapel[idx];
  }

  deleteMapel(id: number) {
    const idx = this.mapel.findIndex((m) => m.id === id);
    if (idx === -1) return false;
    this.mapel.splice(idx, 1);
    return true;
  }

  // ==========================================
  // SISWA
  // ==========================================
  getSiswaList(options: {
    search?: string;
    kelas_id?: number;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    let result = [...this.siswa];
    if (options.kelas_id) {
      result = result.filter((s) => s.kelas_id === Number(options.kelas_id));
    }
    if (options.status) {
      result = result.filter((s) => s.status === options.status);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.nama.toLowerCase().includes(q) ||
          s.nis.includes(q) ||
          s.nisn.includes(q) ||
          (s.alamat && s.alamat.toLowerCase().includes(q))
      );
    }

    const enriched = result.map((s) => {
      const k = s.kelas_id ? this.kelas.find((k) => k.id === s.kelas_id) : null;
      return {
        ...s,
        kelas: k,
      };
    });

    const total = enriched.length;
    const page = options.page || 1;
    const limit = options.limit || 10;
    const offset = (page - 1) * limit;
    const data = enriched.slice(offset, offset + limit);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getAllSiswaForExport(options: { kelas_id?: number; status?: string }) {
    let result = [...this.siswa];
    if (options.kelas_id) {
      result = result.filter((s) => s.kelas_id === Number(options.kelas_id));
    }
    if (options.status) {
      result = result.filter((s) => s.status === options.status);
    }
    return result.map((s) => {
      const k = s.kelas_id ? this.kelas.find((k) => k.id === s.kelas_id) : null;
      return {
        ...s,
        kelas_nama: k ? k.nama : '-',
      };
    });
  }

  getSiswaById(id: number) {
    const s = this.siswa.find((item) => item.id === id);
    if (!s) return null;
    const k = s.kelas_id ? this.kelas.find((k) => k.id === s.kelas_id) : null;
    return { ...s, kelas: k };
  }

  createSiswa(data: Omit<SiswaRecord, 'id' | 'created_at' | 'updated_at'>) {
    const newSiswa: SiswaRecord = {
      ...data,
      id: this.nextSiswaId++,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.siswa.unshift(newSiswa);

    // Otomatis buat entri penempatan jika ada kelas_id
    if (newSiswa.kelas_id) {
      const activeTa = this.getActiveTahunAjaran();
      if (activeTa) {
        this.penempatanSiswa.push({
          id: this.nextPenempatanId++,
          siswa_id: newSiswa.id,
          kelas_id: newSiswa.kelas_id,
          tahun_ajaran_id: activeTa.id,
          status: 'aktif',
          catatan: 'Penempatan awal siswa baru',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return newSiswa;
  }

  batchCreateSiswa(dataList: Array<Omit<SiswaRecord, 'id' | 'created_at' | 'updated_at'>>) {
    const created: SiswaRecord[] = [];
    const activeTa = this.getActiveTahunAjaran();

    for (const item of dataList) {
      const existing = this.siswa.find((s) => s.nis === item.nis || s.nisn === item.nisn);
      if (!existing) {
        const newS: SiswaRecord = {
          ...item,
          id: this.nextSiswaId++,
          created_at: new Date(),
          updated_at: new Date(),
        };
        this.siswa.unshift(newS);
        created.push(newS);

        if (newS.kelas_id && activeTa) {
          this.penempatanSiswa.push({
            id: this.nextPenempatanId++,
            siswa_id: newS.id,
            kelas_id: newS.kelas_id,
            tahun_ajaran_id: activeTa.id,
            status: 'aktif',
            catatan: 'Impor siswa baru',
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
    }
    return created;
  }

  updateSiswa(id: number, data: Partial<SiswaRecord>) {
    const idx = this.siswa.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const oldKelasId = this.siswa[idx].kelas_id;
    this.siswa[idx] = {
      ...this.siswa[idx],
      ...data,
      updated_at: new Date(),
    };

    // Jika kelas_id berubah, perbarui atau tambah penempatan
    if (data.kelas_id && data.kelas_id !== oldKelasId) {
      const activeTa = this.getActiveTahunAjaran();
      if (activeTa) {
        const existingPen = this.penempatanSiswa.find(
          (p) => p.siswa_id === id && p.tahun_ajaran_id === activeTa.id
        );
        if (existingPen) {
          existingPen.kelas_id = data.kelas_id;
          existingPen.updated_at = new Date();
        } else {
          this.penempatanSiswa.push({
            id: this.nextPenempatanId++,
            siswa_id: id,
            kelas_id: data.kelas_id,
            tahun_ajaran_id: activeTa.id,
            status: 'aktif',
            catatan: 'Perubahan kelas siswa',
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }
    }

    return this.siswa[idx];
  }

  deleteSiswa(id: number) {
    const idx = this.siswa.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.siswa.splice(idx, 1);
    // Hapus juga riwayat terkait
    this.penempatanSiswa = this.penempatanSiswa.filter((p) => p.siswa_id !== id);
    this.absensiSiswa = this.absensiSiswa.filter((a) => a.siswa_id !== id);
    this.nilaiSiswaList = this.nilaiSiswaList.filter((n) => n.siswa_id !== id);
    this.catatanRaporList = this.catatanRaporList.filter((c) => c.siswa_id !== id);
    return true;
  }

  // =========================================================================
  // MODUL AKADEMIK 1: PENEMPATAN SISWA, KENAIKAN KELAS & KELULUSAN MASSAL
  // =========================================================================
  getPenempatanList(options: {
    kelas_id?: number;
    tahun_ajaran_id?: number;
    status?: string;
  }) {
    let result = [...this.penempatanSiswa];
    if (options.tahun_ajaran_id) {
      result = result.filter((p) => p.tahun_ajaran_id === Number(options.tahun_ajaran_id));
    }
    if (options.kelas_id) {
      result = result.filter((p) => p.kelas_id === Number(options.kelas_id));
    }
    if (options.status) {
      result = result.filter((p) => p.status === options.status);
    }

    return result.map((p) => {
      const s = this.siswa.find((item) => item.id === p.siswa_id);
      const k = this.kelas.find((item) => item.id === p.kelas_id);
      return {
        ...p,
        siswa: s,
        kelas: k,
      };
    });
  }

  getSiswaTanpaKelas(tahun_ajaran_id: number) {
    const penempatanIds = this.penempatanSiswa
      .filter((p) => p.tahun_ajaran_id === tahun_ajaran_id && p.status === 'aktif')
      .map((p) => p.siswa_id);

    return this.siswa.filter(
      (s) => s.status === 'aktif' && !penempatanIds.includes(s.id)
    );
  }

  batchTempatkanSiswa(siswa_ids: number[], kelas_id: number, tahun_ajaran_id: number) {
    const result: PenempatanSiswaRecord[] = [];
    const now = new Date();

    for (const sid of siswa_ids) {
      // Update siswa table
      const sIdx = this.siswa.findIndex((s) => s.id === sid);
      if (sIdx !== -1) {
        this.siswa[sIdx].kelas_id = kelas_id;
        this.siswa[sIdx].updated_at = now;
      }

      const existing = this.penempatanSiswa.find(
        (p) => p.siswa_id === sid && p.tahun_ajaran_id === tahun_ajaran_id
      );

      if (existing) {
        existing.kelas_id = kelas_id;
        existing.status = 'aktif';
        existing.updated_at = now;
        result.push(existing);
      } else {
        const item: PenempatanSiswaRecord = {
          id: this.nextPenempatanId++,
          siswa_id: sid,
          kelas_id,
          tahun_ajaran_id,
          status: 'aktif',
          catatan: 'Penempatan kelas',
          created_at: now,
          updated_at: now,
        };
        this.penempatanSiswa.push(item);
        result.push(item);
      }
    }

    return result;
  }

  batchKenaikanKelas(
    siswa_ids: number[],
    kelas_tujuan_id: number,
    tahun_ajaran_tujuan_id: number,
    aksi: 'naik' | 'tinggal'
  ) {
    const updated: any[] = [];
    const now = new Date();

    for (const sid of siswa_ids) {
      const sIdx = this.siswa.findIndex((s) => s.id === sid);
      if (sIdx !== -1) {
        this.siswa[sIdx].kelas_id = kelas_tujuan_id;
        this.siswa[sIdx].updated_at = now;
      }

      const status = aksi === 'naik' ? 'naik_kelas' : 'tinggal_kelas';
      const item: PenempatanSiswaRecord = {
        id: this.nextPenempatanId++,
        siswa_id: sid,
        kelas_id: kelas_tujuan_id,
        tahun_ajaran_id: tahun_ajaran_tujuan_id,
        status,
        catatan: aksi === 'naik' ? 'Kenaikan kelas massal' : 'Tinggal di kelas',
        created_at: now,
        updated_at: now,
      };
      this.penempatanSiswa.push(item);
      updated.push(item);
    }

    return updated;
  }

  batchKelulusan(siswa_ids: number[], tahun_ajaran_id: number) {
    const now = new Date();
    const updatedCount = [];

    for (const sid of siswa_ids) {
      const sIdx = this.siswa.findIndex((s) => s.id === sid);
      if (sIdx !== -1) {
        this.siswa[sIdx].status = 'lulus';
        this.siswa[sIdx].updated_at = now;
        updatedCount.push(this.siswa[sIdx]);
      }

      const existing = this.penempatanSiswa.find(
        (p) => p.siswa_id === sid && p.tahun_ajaran_id === tahun_ajaran_id
      );
      if (existing) {
        existing.status = 'lulus';
        existing.catatan = 'Lulus dari madrasah';
        existing.updated_at = now;
      }
    }

    return updatedCount;
  }

  // =========================================================================
  // MODUL AKADEMIK 2: PENUGASAN GURU KE MAPEL & KELAS, PENETAPAN WALI KELAS
  // =========================================================================
  getPengajaranList(options: {
    guru_id?: number;
    kelas_id?: number;
    mapel_id?: number;
    tahun_ajaran_id?: number;
  }) {
    let result = [...this.pengajaranGuru];
    if (options.tahun_ajaran_id) {
      result = result.filter((p) => p.tahun_ajaran_id === Number(options.tahun_ajaran_id));
    }
    if (options.guru_id) {
      result = result.filter((p) => p.guru_id === Number(options.guru_id));
    }
    if (options.kelas_id) {
      result = result.filter((p) => p.kelas_id === Number(options.kelas_id));
    }
    if (options.mapel_id) {
      result = result.filter((p) => p.mapel_id === Number(options.mapel_id));
    }

    return result.map((p) => ({
      ...p,
      guru: this.guru.find((g) => g.id === p.guru_id),
      mapel: this.mapel.find((m) => m.id === p.mapel_id),
      kelas: this.kelas.find((k) => k.id === p.kelas_id),
    }));
  }

  createPengajaran(data: Omit<PengajaranGuruRecord, 'id' | 'created_at' | 'updated_at'>) {
    const newPeng: PengajaranGuruRecord = {
      ...data,
      id: this.nextPengajaranId++,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.pengajaranGuru.push(newPeng);
    return newPeng;
  }

  updatePengajaran(id: number, data: Partial<PengajaranGuruRecord>) {
    const idx = this.pengajaranGuru.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    this.pengajaranGuru[idx] = {
      ...this.pengajaranGuru[idx],
      ...data,
      updated_at: new Date(),
    };
    return this.pengajaranGuru[idx];
  }

  deletePengajaran(id: number) {
    const idx = this.pengajaranGuru.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.pengajaranGuru.splice(idx, 1);
    return true;
  }

  setWaliKelas(kelas_id: number, guru_id: number | null) {
    const kIdx = this.kelas.findIndex((k) => k.id === kelas_id);
    if (kIdx === -1) return null;
    this.kelas[kIdx].wali_kelas_id = guru_id;
    this.kelas[kIdx].updated_at = new Date();
    return this.kelas[kIdx];
  }

  // =========================================================================
  // MODUL AKADEMIK 3: JADWAL PELAJARAN & DETEKSI BENTROK
  // =========================================================================
  getJadwalList(options: {
    tahun_ajaran_id?: number;
    kelas_id?: number;
    guru_id?: number;
    hari?: string;
  }) {
    let result = [...this.jadwalPelajaran];
    if (options.tahun_ajaran_id) {
      result = result.filter((j) => j.tahun_ajaran_id === Number(options.tahun_ajaran_id));
    }
    if (options.kelas_id) {
      result = result.filter((j) => j.kelas_id === Number(options.kelas_id));
    }
    if (options.guru_id) {
      result = result.filter((j) => j.guru_id === Number(options.guru_id));
    }
    if (options.hari) {
      result = result.filter((j) => j.hari === options.hari);
    }

    return result.map((j) => ({
      ...j,
      guru: this.guru.find((g) => g.id === j.guru_id),
      mapel: this.mapel.find((m) => m.id === j.mapel_id),
      kelas: this.kelas.find((k) => k.id === j.kelas_id),
    }));
  }

  checkJadwalBentrok(data: {
    id?: number;
    tahun_ajaran_id: number;
    hari: string;
    jam_ke: number;
    guru_id: number;
    kelas_id: number;
  }) {
    const existingList = this.jadwalPelajaran.filter(
      (j) =>
        j.tahun_ajaran_id === data.tahun_ajaran_id &&
        j.hari === data.hari &&
        j.jam_ke === Number(data.jam_ke) &&
        (!data.id || j.id !== data.id)
    );

    // 1. Cek bentrok guru (guru sedang mengajar di kelas lain)
    const bentrokGuru = existingList.find((j) => j.guru_id === Number(data.guru_id));
    if (bentrokGuru) {
      const k = this.kelas.find((item) => item.id === bentrokGuru.kelas_id);
      const g = this.guru.find((item) => item.id === bentrokGuru.guru_id);
      return {
        hasBentrok: true,
        type: 'guru',
        message: `Bentrok Guru: ${g?.nama || 'Guru'} sudah terjadwal mengajar di Kelas ${
          k?.nama || ''
        } pada hari ${data.hari} Jam Ke-${data.jam_ke}.`,
      };
    }

    // 2. Cek bentrok kelas (kelas sudah memiliki jadwal mapel lain)
    const bentrokKelas = existingList.find((j) => j.kelas_id === Number(data.kelas_id));
    if (bentrokKelas) {
      const m = this.mapel.find((item) => item.id === bentrokKelas.mapel_id);
      const k = this.kelas.find((item) => item.id === bentrokKelas.kelas_id);
      return {
        hasBentrok: true,
        type: 'kelas',
        message: `Bentrok Kelas: Kelas ${k?.nama || ''} sudah memiliki jadwal mapel ${
          m?.nama || ''
        } pada hari ${data.hari} Jam Ke-${data.jam_ke}.`,
      };
    }

    return { hasBentrok: false };
  }

  createJadwal(data: Omit<JadwalPelajaranRecord, 'id' | 'created_at' | 'updated_at'>) {
    const bentrok = this.checkJadwalBentrok(data);
    if (bentrok.hasBentrok) {
      throw new Error(bentrok.message);
    }

    const newJadwal: JadwalPelajaranRecord = {
      ...data,
      id: this.nextJadwalId++,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.jadwalPelajaran.push(newJadwal);
    return newJadwal;
  }

  updateJadwal(id: number, data: Partial<JadwalPelajaranRecord>) {
    const idx = this.jadwalPelajaran.findIndex((j) => j.id === id);
    if (idx === -1) return null;

    const current = this.jadwalPelajaran[idx];
    const candidate = {
      id,
      tahun_ajaran_id: data.tahun_ajaran_id || current.tahun_ajaran_id,
      hari: data.hari || current.hari,
      jam_ke: data.jam_ke !== undefined ? data.jam_ke : current.jam_ke,
      guru_id: data.guru_id || current.guru_id,
      kelas_id: data.kelas_id || current.kelas_id,
    };

    const bentrok = this.checkJadwalBentrok(candidate);
    if (bentrok.hasBentrok) {
      throw new Error(bentrok.message);
    }

    this.jadwalPelajaran[idx] = {
      ...this.jadwalPelajaran[idx],
      ...data,
      updated_at: new Date(),
    };
    return this.jadwalPelajaran[idx];
  }

  deleteJadwal(id: number) {
    const idx = this.jadwalPelajaran.findIndex((j) => j.id === id);
    if (idx === -1) return false;
    this.jadwalPelajaran.splice(idx, 1);
    return true;
  }

  // =========================================================================
  // MODUL AKADEMIK 4: ABSENSI HARIAN SISWA (H, I, S, A) & REKAP
  // =========================================================================
  getAbsensiByTanggal(kelas_id: number, tanggal: string, tahun_ajaran_id: number) {
    const siswaList = this.siswa.filter(
      (s) => s.kelas_id === kelas_id && s.status === 'aktif'
    );

    const absensiHariIni = this.absensiSiswa.filter(
      (a) =>
        a.kelas_id === kelas_id &&
        a.tanggal === tanggal &&
        a.tahun_ajaran_id === tahun_ajaran_id
    );

    return siswaList.map((s) => {
      const match = absensiHariIni.find((a) => a.siswa_id === s.id);
      return {
        siswa: s,
        status: match ? match.status : ('H' as 'H' | 'I' | 'S' | 'A'),
        catatan: match ? match.catatan : '',
      };
    });
  }

  saveBatchAbsensi(
    kelas_id: number,
    tanggal: string,
    tahun_ajaran_id: number,
    items: Array<{ siswa_id: number; status: 'H' | 'I' | 'S' | 'A'; catatan?: string }>,
    user_id?: number
  ) {
    const now = new Date();

    for (const item of items) {
      const idx = this.absensiSiswa.findIndex(
        (a) =>
          a.kelas_id === kelas_id &&
          a.tanggal === tanggal &&
          a.tahun_ajaran_id === tahun_ajaran_id &&
          a.siswa_id === item.siswa_id
      );

      if (idx !== -1) {
        this.absensiSiswa[idx].status = item.status;
        this.absensiSiswa[idx].catatan = item.catatan || null;
        this.absensiSiswa[idx].updated_at = now;
      } else {
        this.absensiSiswa.push({
          id: this.nextAbsensiId++,
          siswa_id: item.siswa_id,
          kelas_id,
          tahun_ajaran_id,
          tanggal,
          status: item.status,
          catatan: item.catatan || null,
          created_by_user_id: user_id || null,
          created_at: now,
          updated_at: now,
        });
      }
    }

    return true;
  }

  getRekapAbsensi(kelas_id: number, tahun_ajaran_id: number, bulan?: number, tahun?: number) {
    const siswaList = this.siswa.filter(
      (s) => s.kelas_id === kelas_id && s.status === 'aktif'
    );

    let logs = this.absensiSiswa.filter(
      (a) => a.kelas_id === kelas_id && a.tahun_ajaran_id === tahun_ajaran_id
    );

    if (bulan && tahun) {
      const prefix = `${tahun}-${String(bulan).padStart(2, '0')}`;
      logs = logs.filter((a) => a.tanggal.startsWith(prefix));
    }

    return siswaList.map((s) => {
      const sLogs = logs.filter((a) => a.siswa_id === s.id);
      const hadir = sLogs.filter((a) => a.status === 'H').length;
      const izin = sLogs.filter((a) => a.status === 'I').length;
      const sakit = sLogs.filter((a) => a.status === 'S').length;
      const alpa = sLogs.filter((a) => a.status === 'A').length;
      const totalHari = sLogs.length;
      const persentase = totalHari > 0 ? Math.round((hadir / totalHari) * 100) : 100;

      return {
        siswa_id: s.id,
        nama: s.nama,
        nis: s.nis,
        hadir,
        izin,
        sakit,
        alpa,
        total_hari: totalHari,
        persentase,
      };
    });
  }

  // =========================================================================
  // MODUL AKADEMIK 5: BOBOT & INPUT NILAI SISWA (OTOMATIS NILAI AKHIR & PREDIKAT)
  // =========================================================================
  getBobotNilai(tahun_ajaran_id: number): BobotNilaiRecord {
    const found = this.bobotNilaiList.find((b) => b.tahun_ajaran_id === tahun_ajaran_id);
    if (found) return found;

    const defaultBobot: BobotNilaiRecord = {
      id: this.nextBobotId++,
      tahun_ajaran_id,
      bobot_tugas: 20,
      bobot_uh: 20,
      bobot_uts: 25,
      bobot_uas: 25,
      bobot_keterampilan: 10,
      updated_at: new Date(),
    };
    this.bobotNilaiList.push(defaultBobot);
    return defaultBobot;
  }

  saveBobotNilai(tahun_ajaran_id: number, data: Partial<BobotNilaiRecord>) {
    const idx = this.bobotNilaiList.findIndex((b) => b.tahun_ajaran_id === tahun_ajaran_id);
    const now = new Date();

    if (idx !== -1) {
      this.bobotNilaiList[idx] = {
        ...this.bobotNilaiList[idx],
        ...data,
        updated_at: now,
      };
      return this.bobotNilaiList[idx];
    } else {
      const newBobot: BobotNilaiRecord = {
        id: this.nextBobotId++,
        tahun_ajaran_id,
        bobot_tugas: data.bobot_tugas ?? 20,
        bobot_uh: data.bobot_uh ?? 20,
        bobot_uts: data.bobot_uts ?? 25,
        bobot_uas: data.bobot_uas ?? 25,
        bobot_keterampilan: data.bobot_keterampilan ?? 10,
        updated_at: now,
      };
      this.bobotNilaiList.push(newBobot);
      return newBobot;
    }
  }

  getNilaiByKelasMapel(kelas_id: number, mapel_id: number, tahun_ajaran_id: number) {
    const siswaList = this.siswa.filter(
      (s) => s.kelas_id === kelas_id && s.status === 'aktif'
    );

    const mapel = this.mapel.find((m) => m.id === mapel_id);
    const existingNilai = this.nilaiSiswaList.filter(
      (n) =>
        n.kelas_id === kelas_id &&
        n.mapel_id === mapel_id &&
        n.tahun_ajaran_id === tahun_ajaran_id
    );

    return siswaList.map((s) => {
      const match = existingNilai.find((n) => n.siswa_id === s.id);
      return {
        siswa: s,
        mapel,
        nilai_tugas: match ? match.nilai_tugas : 0,
        nilai_uh: match ? match.nilai_uh : 0,
        nilai_uts: match ? match.nilai_uts : 0,
        nilai_uas: match ? match.nilai_uas : 0,
        nilai_keterampilan: match ? match.nilai_keterampilan : 0,
        nilai_akhir: match ? match.nilai_akhir : 0,
        predikat: match ? match.predikat : 'C',
        catatan: match ? match.catatan : '',
      };
    });
  }

  saveBatchNilai(
    kelas_id: number,
    mapel_id: number,
    tahun_ajaran_id: number,
    items: Array<{
      siswa_id: number;
      nilai_tugas: number;
      nilai_uh: number;
      nilai_uts: number;
      nilai_uas: number;
      nilai_keterampilan: number;
      catatan?: string;
    }>
  ) {
    const bobot = this.getBobotNilai(tahun_ajaran_id);
    const mapel = this.mapel.find((m) => m.id === mapel_id);
    const kkm = mapel?.kkm || 75;
    const now = new Date();

    const totalBobot =
      bobot.bobot_tugas +
      bobot.bobot_uh +
      bobot.bobot_uts +
      bobot.bobot_uas +
      bobot.bobot_keterampilan || 100;

    for (const item of items) {
      const tugas = Number(item.nilai_tugas) || 0;
      const uh = Number(item.nilai_uh) || 0;
      const uts = Number(item.nilai_uts) || 0;
      const uas = Number(item.nilai_uas) || 0;
      const keterampilan = Number(item.nilai_keterampilan) || 0;

      // Hitung nilai akhir otomatis berdasarkan pembobotan
      const nilaiAkhirRaw =
        (tugas * bobot.bobot_tugas +
          uh * bobot.bobot_uh +
          uts * bobot.bobot_uts +
          uas * bobot.bobot_uas +
          keterampilan * bobot.bobot_keterampilan) /
        totalBobot;
      const nilaiAkhir = Math.round(nilaiAkhirRaw * 10) / 10;

      // Hitung predikat otomatis berdasarkan nilai akhir & KKM
      let predikat: 'A' | 'B' | 'C' | 'D' = 'C';
      if (nilaiAkhir >= 90) predikat = 'A';
      else if (nilaiAkhir >= 80) predikat = 'B';
      else if (nilaiAkhir >= kkm) predikat = 'C';
      else predikat = 'D';

      const idx = this.nilaiSiswaList.findIndex(
        (n) =>
          n.siswa_id === item.siswa_id &&
          n.mapel_id === mapel_id &&
          n.kelas_id === kelas_id &&
          n.tahun_ajaran_id === tahun_ajaran_id
      );

      if (idx !== -1) {
        this.nilaiSiswaList[idx] = {
          ...this.nilaiSiswaList[idx],
          nilai_tugas: tugas,
          nilai_uh: uh,
          nilai_uts: uts,
          nilai_uas: uas,
          nilai_keterampilan: keterampilan,
          nilai_akhir: nilaiAkhir,
          predikat,
          catatan: item.catatan || null,
          updated_at: now,
        };
      } else {
        this.nilaiSiswaList.push({
          id: this.nextNilaiId++,
          siswa_id: item.siswa_id,
          mapel_id,
          kelas_id,
          tahun_ajaran_id,
          nilai_tugas: tugas,
          nilai_uh: uh,
          nilai_uts: uts,
          nilai_uas: uas,
          nilai_keterampilan: keterampilan,
          nilai_akhir: nilaiAkhir,
          predikat,
          catatan: item.catatan || null,
          created_at: now,
          updated_at: now,
        });
      }
    }

    return true;
  }

  // =========================================================================
  // MODUL AKADEMIK 6: NILAI SIKAP/AKHLAK & TAHFIDZ SEDERHANA
  // =========================================================================
  getCatatanRaporByKelas(kelas_id: number, tahun_ajaran_id: number) {
    const siswaList = this.siswa.filter(
      (s) => s.kelas_id === kelas_id && s.status === 'aktif'
    );

    const catatanList = this.catatanRaporList.filter(
      (c) => c.kelas_id === kelas_id && c.tahun_ajaran_id === tahun_ajaran_id
    );

    return siswaList.map((s) => {
      const match = catatanList.find((c) => c.siswa_id === s.id);
      return {
        siswa: s,
        sikap_spiritual: match?.sikap_spiritual || 'Baik',
        deskripsi_spiritual: match?.deskripsi_spiritual || '',
        sikap_sosial: match?.sikap_sosial || 'Baik',
        deskripsi_sosial: match?.deskripsi_sosial || '',
        juz_hafalan: match?.juz_hafalan || '',
        surah_terakhir: match?.surah_terakhir || '',
        predikat_tahfidz: match?.predikat_tahfidz || 'Jayyid',
        catatan_wali_kelas: match?.catatan_wali_kelas || '',
        status_akhir: match?.status_akhir || 'Belum Ditentukan',
        naik_ke_kelas: match?.naik_ke_kelas || '',
      };
    });
  }

  saveCatatanRapor(
    kelas_id: number,
    tahun_ajaran_id: number,
    items: Array<{
      siswa_id: number;
      sikap_spiritual?: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
      deskripsi_spiritual?: string;
      sikap_sosial?: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan';
      deskripsi_sosial?: string;
      juz_hafalan?: string;
      surah_terakhir?: string;
      predikat_tahfidz?: 'Mutqin' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul';
      catatan_wali_kelas?: string;
      status_akhir?: 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus' | 'Belum Ditentukan';
      naik_ke_kelas?: string;
    }>
  ) {
    const now = new Date();

    for (const item of items) {
      const idx = this.catatanRaporList.findIndex(
        (c) =>
          c.siswa_id === item.siswa_id &&
          c.kelas_id === kelas_id &&
          c.tahun_ajaran_id === tahun_ajaran_id
      );

      if (idx !== -1) {
        this.catatanRaporList[idx] = {
          ...this.catatanRaporList[idx],
          ...item,
          updated_at: now,
        };
      } else {
        this.catatanRaporList.push({
          id: this.nextCatatanRaporId++,
          siswa_id: item.siswa_id,
          kelas_id,
          tahun_ajaran_id,
          sikap_spiritual: item.sikap_spiritual || 'Baik',
          deskripsi_spiritual: item.deskripsi_spiritual || null,
          sikap_sosial: item.sikap_sosial || 'Baik',
          deskripsi_sosial: item.deskripsi_sosial || null,
          juz_hafalan: item.juz_hafalan || null,
          surah_terakhir: item.surah_terakhir || null,
          predikat_tahfidz: item.predikat_tahfidz || 'Jayyid',
          catatan_wali_kelas: item.catatan_wali_kelas || null,
          status_akhir: item.status_akhir || 'Belum Ditentukan',
          naik_ke_kelas: item.naik_ke_kelas || null,
          updated_at: now,
        });
      }
    }

    return true;
  }

  // =========================================================================
  // MODUL AKADEMIK 7: RAPOR & TRANSKRIP CETAK PDF LENGKAP
  // =========================================================================
  getRaporLengkap(siswa_id: number, tahun_ajaran_id?: number) {
    const s = this.siswa.find((item) => item.id === siswa_id);
    if (!s) return null;

    const ta = tahun_ajaran_id
      ? this.tahunAjaran.find((t) => t.id === tahun_ajaran_id)
      : this.getActiveTahunAjaran();

    const currentTa = ta || this.tahunAjaran[0];
    const k = s.kelas_id ? this.kelas.find((item) => item.id === s.kelas_id) : null;
    const wk = k?.wali_kelas_id ? this.guru.find((item) => item.id === k.wali_kelas_id) : null;

    // Nilai Siswa
    const nilaiList = this.mapel.map((m) => {
      const match = this.nilaiSiswaList.find(
        (n) =>
          n.siswa_id === s.id &&
          n.mapel_id === m.id &&
          n.tahun_ajaran_id === currentTa.id
      );

      return {
        mapel: m,
        nilai_tugas: match ? match.nilai_tugas : 0,
        nilai_uh: match ? match.nilai_uh : 0,
        nilai_uts: match ? match.nilai_uts : 0,
        nilai_uas: match ? match.nilai_uas : 0,
        nilai_keterampilan: match ? match.nilai_keterampilan : 0,
        nilai_akhir: match ? match.nilai_akhir : 0,
        predikat: match ? match.predikat : 'C',
        catatan: match?.catatan || (match && match.nilai_akhir >= m.kkm ? 'Tuntas' : 'Perlu Remedial'),
      };
    });

    // Catatan Rapor & Sikap / Tahfidz
    const catatan = this.catatanRaporList.find(
      (c) => c.siswa_id === s.id && c.tahun_ajaran_id === currentTa.id
    ) || {
      id: 0,
      siswa_id: s.id,
      kelas_id: s.kelas_id || 0,
      tahun_ajaran_id: currentTa.id,
      sikap_spiritual: 'Baik' as const,
      deskripsi_spiritual: 'Memiliki sikap ibadah dan akhlak yang baik.',
      sikap_sosial: 'Baik' as const,
      deskripsi_sosial: 'Menunjukkan sikap kerja sama, santun, dan disiplin di madrasah.',
      juz_hafalan: 'Juz 30',
      surah_terakhir: 'An-Naba',
      predikat_tahfidz: 'Jayyid' as const,
      catatan_wali_kelas: 'Tingkatkan terus kebiasaan baik dan pertahankan prestasimu.',
      status_akhir: 'Belum Ditentukan' as const,
      naik_ke_kelas: null,
      updated_at: new Date(),
    };

    // Rekap Absensi
    const sLogs = this.absensiSiswa.filter(
      (a) => a.siswa_id === s.id && a.tahun_ajaran_id === currentTa.id
    );
    const rekapAbsensi = {
      hadir: sLogs.filter((a) => a.status === 'H').length,
      izin: sLogs.filter((a) => a.status === 'I').length,
      sakit: sLogs.filter((a) => a.status === 'S').length,
      alpa: sLogs.filter((a) => a.status === 'A').length,
    };

    return {
      siswa: s,
      kelas: k,
      tahunAjaran: currentTa,
      madrasah: this.madrasahProfile,
      waliKelas: wk,
      nilaiList,
      catatanRapor: catatan,
      rekapAbsensi,
    };
  }

  // ==========================================
  // GURU RESTRICTION HELPERS
  // ==========================================
  getGuruAccessScope(guru_id: number, tahun_ajaran_id: number) {
    // 1. Kelas di mana guru menjadi wali kelas
    const waliKelasIds = this.kelas
      .filter((k) => k.wali_kelas_id === guru_id)
      .map((k) => k.id);

    // 2. Kelas & Mapel di mana guru mengajar
    const pengajaran = this.pengajaranGuru.filter(
      (p) => p.guru_id === guru_id && p.tahun_ajaran_id === tahun_ajaran_id
    );

    const pengajaranKelasIds = pengajaran.map((p) => p.kelas_id);
    const taughtMapelIds = pengajaran.map((p) => p.mapel_id);

    // Gabungkan kelas yang diizinkan (wali kelas + kelas ajar)
    const allowedKelasIds = Array.from(new Set([...waliKelasIds, ...pengajaranKelasIds]));

    return {
      waliKelasIds,
      allowedKelasIds,
      taughtMapelIds,
      pengajaran,
    };
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  createAuditLog(log: Omit<AuditLogRecord, 'id' | 'created_at'>) {
    const newLog: AuditLogRecord = {
      ...log,
      id: this.nextAuditId++,
      created_at: new Date(),
    };
    this.auditLogs.unshift(newLog);
    if (this.auditLogs.length > 1000) {
      this.auditLogs.pop();
    }
    return newLog;
  }

  getAuditLogs(options: { entity?: string; action?: string; search?: string; page?: number; limit?: number }) {
    let result = [...this.auditLogs];
    if (options.entity) {
      result = result.filter((l) => l.entity === options.entity);
    }
    if (options.action) {
      result = result.filter((l) => l.action === options.action);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.username.toLowerCase().includes(q) ||
          (l.details && l.details.toLowerCase().includes(q))
      );
    }

    const total = result.length;
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;
    const data = result.slice(offset, offset + limit);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ==========================================
  // DASHBOARD STATS
  // ==========================================
  getDashboardStats(guru_id?: number | null) {
    const totalSiswa = this.siswa.length;
    const siswaAktif = this.siswa.filter((s) => s.status === 'aktif').length;
    const siswaLulus = this.siswa.filter((s) => s.status === 'lulus').length;
    const siswaPindah = this.siswa.filter((s) => s.status === 'pindah').length;

    const totalGuru = this.guru.length;
    const guruAktif = this.guru.filter((g) => g.is_active).length;
    const guruPNS = this.guru.filter((g) => g.status_kepegawaian === 'PNS').length;
    const guruNonPNS = totalGuru - guruPNS;

    const totalKelas = this.kelas.length;
    const totalMapel = this.mapel.length;
    const taAktif = this.getActiveTahunAjaran();

    const recentLogs = this.auditLogs.slice(0, 5);

    // Khusus jika yang login adalah guru
    let guruStats = null;
    if (guru_id && taAktif) {
      const scope = this.getGuruAccessScope(guru_id, taAktif.id);
      const myKelas = this.kelas.filter((k) => scope.allowedKelasIds.includes(k.id));
      const myJadwal = this.jadwalPelajaran.filter(
        (j) => j.guru_id === guru_id && j.tahun_ajaran_id === taAktif.id
      );

      guruStats = {
        totalKelasAjar: scope.allowedKelasIds.length,
        isWaliKelas: scope.waliKelasIds.length > 0,
        waliKelasNama: scope.waliKelasIds
          .map((id) => this.kelas.find((k) => k.id === id)?.nama)
          .filter(Boolean)
          .join(', '),
        totalJadwalMengajar: myJadwal.length,
      };
    }

    // 1. Kehadiran Bulanan (Agregasi 6 bulan semester ganjil)
    const bulanLabels = [
      { key: '07', label: 'Juli' },
      { key: '08', label: 'Agustus' },
      { key: '09', label: 'September' },
      { key: '10', label: 'Oktober' },
      { key: '11', label: 'November' },
      { key: '12', label: 'Desember' },
    ];
    const kehadiranBulanan = bulanLabels.map((b) => {
      const records = this.absensiSiswa.filter((a) => a.tanggal.slice(5, 7) === b.key);
      const hadir = records.filter((r) => r.status === 'H').length;
      const izin = records.filter((r) => r.status === 'I').length;
      const sakit = records.filter((r) => r.status === 'S').length;
      const alpa = records.filter((r) => r.status === 'A').length;
      const total = hadir + izin + sakit + alpa;

      const simHadir = total > 0 ? hadir : 88 + (parseInt(b.key, 10) % 5);
      const simIzin = total > 0 ? izin : 4 + (parseInt(b.key, 10) % 3);
      const simSakit = total > 0 ? sakit : 3 + (parseInt(b.key, 10) % 2);
      const simAlpa = total > 0 ? alpa : 1;
      const simTotal = simHadir + simIzin + simSakit + simAlpa;

      return {
        bulan: b.label,
        hadir: simHadir,
        izin: simIzin,
        sakit: simSakit,
        alpa: simAlpa,
        persentaseHadir: Math.round((simHadir / simTotal) * 100),
      };
    });

    // 2. Siswa per Kelas
    const siswaPerKelas = this.kelas.map((k) => {
      const count = this.siswa.filter((s) => s.kelas_id === k.id && s.status === 'aktif').length;
      const wali = k.wali_kelas_id ? this.guru.find((g) => g.id === k.wali_kelas_id) : null;
      return {
        kelas_id: k.id,
        nama: k.nama,
        tingkat: k.tingkat,
        wali_kelas: wali ? wali.nama : 'Belum ditentukan',
        kapasitas: k.kapasitas,
        jumlahSiswa: count,
      };
    });

    // 3. Ringkasan PPDB
    const ppdbSummary = this.getPPDBStats(taAktif?.id);

    // 4. Pengumuman Terkini
    const recentAnnouncements = this.pengumuman
      .filter((p) => p.is_published)
      .slice(0, 3)
      .map((p) => ({
        ...p,
        author: p.created_by_user_id ? this.getUserById(p.created_by_user_id) : null,
      }));

    // 5. Agenda Kalender Terdekat
    const upcomingEvents = this.kalenderAkademik.slice(0, 4);

    return {
      counts: {
        siswa: totalSiswa,
        siswaLaki: this.siswa.filter((s) => s.jenis_kelamin === 'L' && s.status === 'aktif').length,
        siswaPerempuan: this.siswa.filter((s) => s.jenis_kelamin === 'P' && s.status === 'aktif').length,
        guru: totalGuru,
        kelas: totalKelas,
        mapel: totalMapel,
        alumni: siswaLulus,
        mutasi: siswaPindah,
      },
      totalSiswa,
      siswaAktif,
      siswaLulus,
      siswaPindah,
      totalGuru,
      guruAktif,
      guruPNS,
      guruNonPNS,
      totalKelas,
      totalMapel,
      taAktif,
      recentLogs,
      guruStats,
      kehadiranBulanan,
      siswaPerKelas,
      ppdbSummary,
      recentAnnouncements,
      upcomingEvents,
    };
  }

  // ==========================================
  // MODUL KEUANGAN: JENIS PEMBAYARAN & TARIF
  // ==========================================
  getJenisPembayaranList(tahun_ajaran_id?: number) {
    let result = [...this.jenisPembayaran];
    if (tahun_ajaran_id) {
      result = result.filter((j) => j.tahun_ajaran_id === Number(tahun_ajaran_id));
    }
    return result.map((j) => {
      const tarifList = this.tarifPembayaran
        .filter((t) => t.jenis_pembayaran_id === j.id)
        .map((t) => ({
          ...t,
          kelas: t.kelas_id ? this.kelas.find((k) => k.id === t.kelas_id) || null : null,
        }));
      return {
        ...j,
        tarifList,
      };
    });
  }

  getJenisPembayaranById(id: number) {
    const j = this.jenisPembayaran.find((item) => item.id === id);
    if (!j) return null;
    const tarifList = this.tarifPembayaran
      .filter((t) => t.jenis_pembayaran_id === j.id)
      .map((t) => ({
        ...t,
        kelas: t.kelas_id ? this.kelas.find((k) => k.id === t.kelas_id) || null : null,
      }));
    return {
      ...j,
      tarifList,
    };
  }

  createJenisPembayaran(
    data: Omit<JenisPembayaranRecord, 'id' | 'created_at' | 'updated_at'>,
    tarifList?: Array<{ tingkat: string; kelas_id: number | null; nominal: number }>
  ) {
    const newJenis: JenisPembayaranRecord = {
      ...data,
      id: this.nextJenisBayarId++,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.jenisPembayaran.push(newJenis);

    if (tarifList && tarifList.length > 0) {
      tarifList.forEach((t) => {
        this.tarifPembayaran.push({
          id: this.nextTarifId++,
          jenis_pembayaran_id: newJenis.id,
          tingkat: t.tingkat || 'Semua',
          kelas_id: t.kelas_id || null,
          nominal: Number(t.nominal) || 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
      });
    }

    return this.getJenisPembayaranById(newJenis.id);
  }

  updateJenisPembayaran(
    id: number,
    data: Partial<JenisPembayaranRecord>,
    tarifList?: Array<{ tingkat: string; kelas_id: number | null; nominal: number }>
  ) {
    const idx = this.jenisPembayaran.findIndex((j) => j.id === id);
    if (idx === -1) return null;

    this.jenisPembayaran[idx] = {
      ...this.jenisPembayaran[idx],
      ...data,
      updated_at: new Date(),
    };

    if (tarifList !== undefined) {
      // Hapus tarif lama
      this.tarifPembayaran = this.tarifPembayaran.filter((t) => t.jenis_pembayaran_id !== id);
      // Tambah tarif baru
      tarifList.forEach((t) => {
        this.tarifPembayaran.push({
          id: this.nextTarifId++,
          jenis_pembayaran_id: id,
          tingkat: t.tingkat || 'Semua',
          kelas_id: t.kelas_id || null,
          nominal: Number(t.nominal) || 0,
          created_at: new Date(),
          updated_at: new Date(),
        });
      });
    }

    return this.getJenisPembayaranById(id);
  }

  deleteJenisPembayaran(id: number) {
    const hasTagihan = this.tagihanSiswa.some((t) => t.jenis_pembayaran_id === id);
    if (hasTagihan) {
      throw new Error('Jenis pembayaran tidak dapat dihapus karena sudah memiliki tagihan siswa yang diterbitkan.');
    }
    const idx = this.jenisPembayaran.findIndex((j) => j.id === id);
    if (idx === -1) return false;

    this.jenisPembayaran.splice(idx, 1);
    this.tarifPembayaran = this.tarifPembayaran.filter((t) => t.jenis_pembayaran_id !== id);
    return true;
  }

  saveTarifPembayaran(
    jenis_pembayaran_id: number,
    tarifList: Array<{ tingkat: string; kelas_id: number | null; nominal: number }>
  ) {
    const jenis = this.jenisPembayaran.find((j) => j.id === jenis_pembayaran_id);
    if (!jenis) throw new Error('Jenis pembayaran tidak ditemukan.');

    // Replace all tarif for this jenis
    this.tarifPembayaran = this.tarifPembayaran.filter((t) => t.jenis_pembayaran_id !== jenis_pembayaran_id);
    tarifList.forEach((t) => {
      this.tarifPembayaran.push({
        id: this.nextTarifId++,
        jenis_pembayaran_id,
        tingkat: t.tingkat || 'Semua',
        kelas_id: t.kelas_id || null,
        nominal: Number(t.nominal) || 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    return this.tarifPembayaran.filter((t) => t.jenis_pembayaran_id === jenis_pembayaran_id);
  }

  // ==========================================
  // MODUL KEUANGAN: GENERATE TAGIHAN MASSAL
  // ==========================================
  generateTagihanMassal(params: {
    jenis_pembayaran_id: number;
    tahun_ajaran_id: number;
    bulan?: string;
    tingkat?: string;
    kelas_id?: number;
    jatuh_tempo?: string;
    user_id?: number;
    username?: string;
  }) {
    const jenis = this.jenisPembayaran.find((j) => j.id === Number(params.jenis_pembayaran_id));
    if (!jenis) throw new Error('Jenis pembayaran tidak ditemukan.');

    // Kumpulkan siswa sasaran
    let candidateSiswa = this.siswa.filter((s) => s.status === 'aktif' && s.kelas_id);
    if (params.kelas_id) {
      candidateSiswa = candidateSiswa.filter((s) => s.kelas_id === Number(params.kelas_id));
    } else if (params.tingkat && params.tingkat !== 'Semua') {
      const kelasInTingkat = this.kelas.filter((k) => k.tingkat === params.tingkat).map((k) => k.id);
      candidateSiswa = candidateSiswa.filter((s) => s.kelas_id && kelasInTingkat.includes(s.kelas_id));
    }

    if (candidateSiswa.length === 0) {
      throw new Error('Tidak ada siswa aktif yang ditemukan pada kriteria kelas/tingkat yang dipilih.');
    }

    // Ambil tarif untuk jenis pembayaran ini
    const tarifList = this.tarifPembayaran.filter((t) => t.jenis_pembayaran_id === jenis.id);

    let generatedCount = 0;
    let skippedCount = 0;
    let totalNominal = 0;
    const now = new Date();

    for (const siswa of candidateSiswa) {
      const siswaKelas = this.kelas.find((k) => k.id === siswa.kelas_id);
      if (!siswaKelas) continue;

      // Cari tarif yang berlaku:
      // 1. Cek tarif spesifik kelas_id
      // 2. Cek tarif spesifik tingkat
      // 3. Cek tarif tingkat 'Semua'
      let nominal = 0;
      const tarifKelas = tarifList.find((t) => t.kelas_id === siswaKelas.id);
      if (tarifKelas) {
        nominal = Number(tarifKelas.nominal);
      } else {
        const tarifTingkat = tarifList.find((t) => t.tingkat === siswaKelas.tingkat);
        if (tarifTingkat) {
          nominal = Number(tarifTingkat.nominal);
        } else {
          const tarifSemua = tarifList.find((t) => t.tingkat === 'Semua');
          if (tarifSemua) {
            nominal = Number(tarifSemua.nominal);
          }
        }
      }

      // Cek apakah tagihan sudah pernah dibuat (mencegah duplikasi tagihan yang sama)
      const isDuplicate = this.tagihanSiswa.some((t) => {
        const matchBase =
          t.siswa_id === siswa.id &&
          t.jenis_pembayaran_id === jenis.id &&
          t.tahun_ajaran_id === Number(params.tahun_ajaran_id);
        if (jenis.tipe === 'bulanan') {
          return matchBase && t.bulan === params.bulan;
        }
        return matchBase;
      });

      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      const newTagihan: TagihanSiswaRecord = {
        id: this.nextTagihanId++,
        siswa_id: siswa.id,
        kelas_id: siswaKelas.id,
        jenis_pembayaran_id: jenis.id,
        tahun_ajaran_id: Number(params.tahun_ajaran_id),
        bulan: jenis.tipe === 'bulanan' ? params.bulan || null : null,
        nominal,
        terbayar: 0,
        sisa: nominal,
        status: 'belum_bayar',
        jatuh_tempo: params.jatuh_tempo || null,
        catatan: null,
        created_at: now,
        updated_at: now,
      };

      this.tagihanSiswa.push(newTagihan);
      generatedCount++;
      totalNominal += nominal;
    }

    // Catat audit log
    this.createAuditLog({
      user_id: params.user_id || null,
      username: params.username || 'System',
      action: 'CREATE',
      entity: 'keuangan',
      details: `Generate tagihan massal untuk ${jenis.nama} ${
        params.bulan ? 'Bulan ' + params.bulan : ''
      }: ${generatedCount} tagihan dibuat (Total Rp ${totalNominal.toLocaleString('id-ID')}), ${skippedCount} dilewati/sudah ada.`,
      ip_address: '127.0.0.1',
    });

    return {
      generatedCount,
      skippedCount,
      totalNominal,
    };
  }

  // ==========================================
  // MODUL KEUANGAN: TAGIHAN SISWA
  // ==========================================
  getTagihanList(options: {
    tahun_ajaran_id?: number;
    kelas_id?: number;
    siswa_id?: number;
    jenis_pembayaran_id?: number;
    status?: string;
    bulan?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    let result = [...this.tagihanSiswa];

    if (options.tahun_ajaran_id) {
      result = result.filter((t) => t.tahun_ajaran_id === Number(options.tahun_ajaran_id));
    }
    if (options.kelas_id) {
      result = result.filter((t) => t.kelas_id === Number(options.kelas_id));
    }
    if (options.siswa_id) {
      result = result.filter((t) => t.siswa_id === Number(options.siswa_id));
    }
    if (options.jenis_pembayaran_id) {
      result = result.filter((t) => t.jenis_pembayaran_id === Number(options.jenis_pembayaran_id));
    }
    if (options.status && options.status !== 'semua') {
      result = result.filter((t) => t.status === options.status);
    }
    if (options.bulan && options.bulan !== 'semua') {
      result = result.filter((t) => t.bulan === options.bulan);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter((t) => {
        const s = this.siswa.find((item) => item.id === t.siswa_id);
        return s && (s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q));
      });
    }

    // Urutkan id descending
    result.sort((a, b) => b.id - a.id);

    const total = result.length;
    const page = options.page || 1;
    const limit = options.limit || 20;
    const startIndex = (page - 1) * limit;
    const paginated = result.slice(startIndex, startIndex + limit);

    const enriched = paginated.map((t) => ({
      ...t,
      siswa: this.siswa.find((s) => s.id === t.siswa_id) || null,
      kelas: this.kelas.find((k) => k.id === t.kelas_id) || null,
      jenisPembayaran: this.jenisPembayaran.find((j) => j.id === t.jenis_pembayaran_id) || null,
      transaksiList: this.transaksiPembayaran.filter((tx) => tx.tagihan_id === t.id && tx.status === 'valid'),
    }));

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  getTagihanById(id: number) {
    const t = this.tagihanSiswa.find((item) => item.id === id);
    if (!t) return null;
    return {
      ...t,
      siswa: this.siswa.find((s) => s.id === t.siswa_id) || null,
      kelas: this.kelas.find((k) => k.id === t.kelas_id) || null,
      jenisPembayaran: this.jenisPembayaran.find((j) => j.id === t.jenis_pembayaran_id) || null,
      transaksiList: this.transaksiPembayaran.filter((tx) => tx.tagihan_id === t.id),
    };
  }

  getTagihanBySiswa(siswa_id: number, tahun_ajaran_id?: number) {
    let result = this.tagihanSiswa.filter((t) => t.siswa_id === Number(siswa_id));
    if (tahun_ajaran_id) {
      result = result.filter((t) => t.tahun_ajaran_id === Number(tahun_ajaran_id));
    }
    return result.map((t) => ({
      ...t,
      jenisPembayaran: this.jenisPembayaran.find((j) => j.id === t.jenis_pembayaran_id) || null,
      transaksiList: this.transaksiPembayaran.filter((tx) => tx.tagihan_id === t.id),
    }));
  }

  // ==========================================
  // MODUL KEUANGAN: TRANSAKSI PEMBAYARAN (CICILAN & VOID)
  // ==========================================
  createTransaksiPembayaran(data: {
    tagihan_id: number;
    siswa_id: number;
    jumlah_bayar: number;
    metode: 'Tunai' | 'Transfer';
    tanggal_bayar: string;
    catatan?: string | null;
    user_id?: number;
    username?: string;
  }) {
    const tagihan = this.tagihanSiswa.find((t) => t.id === Number(data.tagihan_id));
    if (!tagihan) throw new Error('Tagihan tidak ditemukan.');

    if (tagihan.status === 'lunas' || tagihan.sisa <= 0) {
      throw new Error('Tagihan ini sudah lunas.');
    }

    const bayar = Number(data.jumlah_bayar);
    if (isNaN(bayar) || bayar <= 0) {
      throw new Error('Jumlah pembayaran harus lebih dari 0.');
    }

    if (bayar > Number(tagihan.sisa)) {
      throw new Error(
        `Jumlah pembayaran (Rp ${bayar.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${tagihan.sisa.toLocaleString('id-ID')}).`
      );
    }

    const now = new Date();
    // Generate nomor transaksi kwitansi berurutan: KWT-YYYYMM-XXXX
    const yyyymm = data.tanggal_bayar
      ? data.tanggal_bayar.replace(/-/g, '').slice(0, 6)
      : now.toISOString().slice(0, 7).replace('-', '');
    const seq = String(this.kwitansiSeq++).padStart(4, '0');
    const nomor_transaksi = `KWT-${yyyymm}-${seq}`;

    const newTx: TransaksiPembayaranRecord = {
      id: this.nextTransaksiId++,
      nomor_transaksi,
      tagihan_id: tagihan.id,
      siswa_id: tagihan.siswa_id,
      jumlah_bayar: bayar,
      metode: data.metode || 'Tunai',
      tanggal_bayar: data.tanggal_bayar || now.toISOString().slice(0, 10),
      catatan: data.catatan || null,
      created_by_user_id: data.user_id || null,
      status: 'valid',
      alasan_batal: null,
      cancelled_at: null,
      cancelled_by_user_id: null,
      created_at: now,
      updated_at: now,
    };

    this.transaksiPembayaran.unshift(newTx);

    // Update status tagihan (mendukung cicilan / angsuran)
    tagihan.terbayar += bayar;
    tagihan.sisa = Math.max(0, Number(tagihan.nominal) - tagihan.terbayar);
    tagihan.status = tagihan.sisa <= 0 ? 'lunas' : 'sebagian';
    tagihan.updated_at = now;

    const siswa = this.siswa.find((s) => s.id === tagihan.siswa_id);
    const jenis = this.jenisPembayaran.find((j) => j.id === tagihan.jenis_pembayaran_id);

    // Catat ke Audit Log
    this.createAuditLog({
      user_id: data.user_id || null,
      username: data.username || 'System',
      action: 'PAYMENT',
      entity: 'keuangan',
      details: `Pembayaran ${nomor_transaksi} sejumlah Rp ${bayar.toLocaleString('id-ID')} (${data.metode}) untuk ${siswa?.nama || 'Siswa'} (${jenis?.nama || 'Pos'} ${tagihan.bulan || ''}). Status tagihan: ${tagihan.status.toUpperCase()}.`,
      ip_address: '127.0.0.1',
    });

    return {
      transaksi: newTx,
      tagihan,
    };
  }

  cancelTransaksiPembayaran(
    id: number,
    alasan_batal: string,
    user_id?: number,
    username?: string
  ) {
    if (!alasan_batal || !alasan_batal.trim()) {
      throw new Error('Alasan pembatalan transaksi wajib diisi.');
    }

    const tx = this.transaksiPembayaran.find((t) => t.id === id);
    if (!tx) throw new Error('Data transaksi pembayaran tidak ditemukan.');

    if (tx.status === 'dibatalkan') {
      throw new Error('Transaksi ini sudah dibatalkan sebelumnya.');
    }

    const tagihan = this.tagihanSiswa.find((t) => t.id === tx.tagihan_id);
    if (!tagihan) throw new Error('Data tagihan terkait tidak ditemukan.');

    const now = new Date();

    // Transaksi TIDAK BOLEH dihapus, hanya ditandai dibatalkan (void)
    tx.status = 'dibatalkan';
    tx.alasan_batal = alasan_batal.trim();
    tx.cancelled_at = now;
    tx.cancelled_by_user_id = user_id || null;
    tx.updated_at = now;

    // Rollback tagihan
    tagihan.terbayar = Math.max(0, tagihan.terbayar - Number(tx.jumlah_bayar));
    tagihan.sisa = Math.min(Number(tagihan.nominal), Number(tagihan.nominal) - tagihan.terbayar);
    tagihan.status = tagihan.terbayar <= 0 ? 'belum_bayar' : 'sebagian';
    tagihan.updated_at = now;

    const siswa = this.siswa.find((s) => s.id === tx.siswa_id);

    // Catat ke Audit Log
    this.createAuditLog({
      user_id: user_id || null,
      username: username || 'System',
      action: 'VOID_PAYMENT',
      entity: 'keuangan',
      details: `Pembatalan transaksi ${tx.nomor_transaksi} sebesar Rp ${tx.jumlah_bayar.toLocaleString('id-ID')} untuk siswa ${siswa?.nama || 'Siswa'}. Alasan: "${alasan_batal}".`,
      ip_address: '127.0.0.1',
    });

    return {
      transaksi: tx,
      tagihan,
    };
  }

  getTransaksiList(options: {
    search?: string;
    status?: string;
    metode?: string;
    jenis_id?: number;
    kelas_id?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    let result = [...this.transaksiPembayaran];

    if (options.status && options.status !== 'semua') {
      result = result.filter((t) => t.status === options.status);
    }
    if (options.metode && options.metode !== 'semua') {
      result = result.filter((t) => t.metode === options.metode);
    }
    if (options.startDate) {
      result = result.filter((t) => t.tanggal_bayar >= options.startDate!);
    }
    if (options.endDate) {
      result = result.filter((t) => t.tanggal_bayar <= options.endDate!);
    }
    if (options.jenis_id) {
      result = result.filter((t) => {
        const tag = this.tagihanSiswa.find((item) => item.id === t.tagihan_id);
        return tag && tag.jenis_pembayaran_id === Number(options.jenis_id);
      });
    }
    if (options.kelas_id) {
      result = result.filter((t) => {
        const s = this.siswa.find((item) => item.id === t.siswa_id);
        return s && s.kelas_id === Number(options.kelas_id);
      });
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter((t) => {
        const s = this.siswa.find((item) => item.id === t.siswa_id);
        return (
          t.nomor_transaksi.toLowerCase().includes(q) ||
          (s && (s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q)))
        );
      });
    }

    result.sort((a, b) => b.id - a.id);

    const totalNominalValid = result
      .filter((t) => t.status === 'valid')
      .reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);
    const totalNominalBatal = result
      .filter((t) => t.status === 'dibatalkan')
      .reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);

    const total = result.length;
    const page = options.page || 1;
    const limit = options.limit || 20;
    const startIndex = (page - 1) * limit;
    const paginated = result.slice(startIndex, startIndex + limit);

    const enriched = paginated.map((t) => {
      const tagihan = this.tagihanSiswa.find((tag) => tag.id === t.tagihan_id);
      const siswa = this.siswa.find((s) => s.id === t.siswa_id);
      const jenisPembayaran = tagihan
        ? this.jenisPembayaran.find((j) => j.id === tagihan.jenis_pembayaran_id)
        : null;
      const createdByUser = t.created_by_user_id ? this.getUserById(t.created_by_user_id) : null;
      const cancelledByUser = t.cancelled_by_user_id ? this.getUserById(t.cancelled_by_user_id) : null;

      return {
        ...t,
        tagihan: tagihan ? { ...tagihan, jenisPembayaran } : null,
        siswa,
        createdByUser: createdByUser ? { id: createdByUser.id, nama_lengkap: createdByUser.nama_lengkap } : null,
        cancelledByUser: cancelledByUser ? { id: cancelledByUser.id, nama_lengkap: cancelledByUser.nama_lengkap } : null,
      };
    });

    return {
      data: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalNominalValid,
        totalNominalBatal,
      },
    };
  }

  getTransaksiById(id: number) {
    const t = this.transaksiPembayaran.find((item) => item.id === id);
    if (!t) return null;
    const tagihan = this.tagihanSiswa.find((tag) => tag.id === t.tagihan_id);
    const siswa = this.siswa.find((s) => s.id === t.siswa_id);
    const jenisPembayaran = tagihan
      ? this.jenisPembayaran.find((j) => j.id === tagihan.jenis_pembayaran_id)
      : null;
    const createdByUser = t.created_by_user_id ? this.getUserById(t.created_by_user_id) : null;

    return {
      ...t,
      tagihan: tagihan ? { ...tagihan, jenisPembayaran } : null,
      siswa,
      createdByUser: createdByUser ? { id: createdByUser.id, nama_lengkap: createdByUser.nama_lengkap } : null,
    };
  }

  // ==========================================
  // MODUL KEUANGAN: KWITANSI RESMI & TERBILANG
  // ==========================================
  getKwitansiData(transaksi_id: number) {
    const tx = this.transaksiPembayaran.find((t) => t.id === transaksi_id);
    if (!tx) return null;

    const tagihan = this.tagihanSiswa.find((t) => t.id === tx.tagihan_id);
    const siswa = this.siswa.find((s) => s.id === tx.siswa_id);
    const kelas = siswa?.kelas_id ? this.kelas.find((k) => k.id === siswa.kelas_id) : null;
    const jenis = tagihan ? this.jenisPembayaran.find((j) => j.id === tagihan.jenis_pembayaran_id) : null;
    const kasir = tx.created_by_user_id ? this.getUserById(tx.created_by_user_id) : null;

    const terbilang = this.konversiTerbilang(Number(tx.jumlah_bayar)) + ' Rupiah';

    return {
      transaksi: tx,
      tagihan: tagihan ? { ...tagihan, jenisPembayaran: jenis } : null,
      siswa: siswa ? { ...siswa, kelas } : null,
      madrasah: this.madrasahProfile,
      kasirNama: kasir?.nama_lengkap || 'Bendahara Madrasah',
      terbilang,
    };
  }

  konversiTerbilang(angka: number): string {
    const n = Math.floor(Math.abs(angka));
    if (n === 0) return 'Nol';

    const satuan = [
      '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
    ];

    const convert = (num: number): string => {
      if (num === 0) return '';
      if (num < 12) return satuan[num];
      if (num < 20) return (convert(num - 10) + ' Belas').trim();
      if (num < 100) return (convert(Math.floor(num / 10)) + ' Puluh ' + convert(num % 10)).trim();
      if (num < 200) return ('Seratus ' + convert(num - 100)).trim();
      if (num < 1000) return (convert(Math.floor(num / 100)) + ' Ratus ' + convert(num % 100)).trim();
      if (num < 2000) return ('Seribu ' + convert(num - 1000)).trim();
      if (num < 1000000) return (convert(Math.floor(num / 1000)) + ' Ribu ' + convert(num % 1000)).trim();
      if (num < 1000000000) return (convert(Math.floor(num / 1000000)) + ' Juta ' + convert(num % 1000000)).trim();
      if (num < 1000000000000) return (convert(Math.floor(num / 1000000000)) + ' Miliar ' + convert(num % 1000000000)).trim();
      return (convert(Math.floor(num / 1000000000000)) + ' Triliun ' + convert(num % 1000000000000)).trim();
    };

    return convert(n);
  }

  // ==========================================
  // MODUL KEUANGAN: REKAP TUNGGAKAN
  // ==========================================
  getTunggakanList(options: { kelas_id?: number; tahun_ajaran_id?: number; search?: string }) {
    const taId = options.tahun_ajaran_id || this.getActiveTahunAjaran()?.id || 1;

    // Filter siswa aktif
    let activeSiswa = this.siswa.filter((s) => s.status === 'aktif' && s.kelas_id);
    if (options.kelas_id) {
      activeSiswa = activeSiswa.filter((s) => s.kelas_id === Number(options.kelas_id));
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      activeSiswa = activeSiswa.filter((s) => s.nama.toLowerCase().includes(q) || s.nis.toLowerCase().includes(q));
    }

    const result = [];

    for (const s of activeSiswa) {
      const tagihanList = this.tagihanSiswa.filter(
        (t) => t.siswa_id === s.id && t.tahun_ajaran_id === taId
      );

      const tunggakanItems = tagihanList.filter((t) => t.sisa > 0);
      if (tunggakanItems.length === 0) continue; // Tidak ada tunggakan

      const totalTagihan = tagihanList.reduce((acc, t) => acc + Number(t.nominal), 0);
      const totalTerbayar = tagihanList.reduce((acc, t) => acc + Number(t.terbayar), 0);
      const totalTunggakan = tagihanList.reduce((acc, t) => acc + Number(t.sisa), 0);

      const items = tunggakanItems.map((t) => {
        const jenis = this.jenisPembayaran.find((j) => j.id === t.jenis_pembayaran_id);
        return {
          tagihan_id: t.id,
          namaPembayaran: jenis?.nama || 'Tagihan',
          bulan: t.bulan,
          nominal: Number(t.nominal),
          terbayar: Number(t.terbayar),
          sisa: Number(t.sisa),
          status: t.status,
          jatuh_tempo: t.jatuh_tempo,
        };
      });

      result.push({
        siswa: s,
        kelas: this.kelas.find((k) => k.id === s.kelas_id) || null,
        totalTagihan,
        totalTerbayar,
        totalTunggakan,
        jumlahItemTunggakan: tunggakanItems.length,
        itemTunggakan: items,
      });
    }

    // Urutkan total tunggakan terbesar
    result.sort((a, b) => b.totalTunggakan - a.totalTunggakan);

    return result;
  }

  getTunggakanSummaryByKelas(tahun_ajaran_id?: number) {
    const taId = tahun_ajaran_id || this.getActiveTahunAjaran()?.id || 1;

    return this.kelas.map((k) => {
      const siswaList = this.siswa.filter((s) => s.kelas_id === k.id && s.status === 'aktif');
      const siswaIds = siswaList.map((s) => s.id);

      const tagihanKelas = this.tagihanSiswa.filter(
        (t) => t.kelas_id === k.id && t.tahun_ajaran_id === taId
      );

      const totalTagihan = tagihanKelas.reduce((acc, t) => acc + Number(t.nominal), 0);
      const totalTerbayar = tagihanKelas.reduce((acc, t) => acc + Number(t.terbayar), 0);
      const totalTunggakan = tagihanKelas.reduce((acc, t) => acc + Number(t.sisa), 0);
      const persentaseLunas = totalTagihan > 0 ? Math.round((totalTerbayar / totalTagihan) * 100) : 100;

      // Hitung siswa yang menunggak
      const siswaMenunggak = new Set(tagihanKelas.filter((t) => t.sisa > 0).map((t) => t.siswa_id));
      const waliKelas = k.wali_kelas_id ? this.guru.find((g) => g.id === k.wali_kelas_id) : null;

      return {
        kelas_id: k.id,
        kelas_nama: k.nama,
        tingkat: k.tingkat,
        wali_kelas_nama: waliKelas?.nama || '-',
        totalSiswa: siswaList.length,
        totalTagihan,
        totalTerbayar,
        totalTunggakan,
        persentaseLunas,
        siswaMenunggakCount: siswaMenunggak.size,
      };
    });
  }

  // ==========================================
  // MODUL KEUANGAN: DASHBOARD STATS
  // ==========================================
  getDashboardKeuanganStats(tahun_ajaran_id?: number) {
    const taId = tahun_ajaran_id || this.getActiveTahunAjaran()?.id || 1;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthPrefix = todayStr.slice(0, 7); // e.g. '2024-10'

    // Transaksi valid
    const validTx = this.transaksiPembayaran.filter((t) => t.status === 'valid');

    const pemasukanHariIni = validTx
      .filter((t) => t.tanggal_bayar === todayStr)
      .reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);

    const pemasukanBulanIni = validTx
      .filter((t) => t.tanggal_bayar.startsWith(thisMonthPrefix))
      .reduce((sum, t) => sum + Number(t.jumlah_bayar), 0);

    // Tagihan tahun ini
    const tagihanTA = this.tagihanSiswa.filter((t) => t.tahun_ajaran_id === taId);
    const totalTagihanTahunIni = tagihanTA.reduce((sum, t) => sum + Number(t.nominal), 0);
    const totalTerbayarTahunIni = tagihanTA.reduce((sum, t) => sum + Number(t.terbayar), 0);
    const totalTunggakan = tagihanTA.reduce((sum, t) => sum + Number(t.sisa), 0);
    const persentasePelunasan =
      totalTagihanTahunIni > 0 ? Math.round((totalTerbayarTahunIni / totalTagihanTahunIni) * 100) : 100;

    // Breakdown per jenis pembayaran
    const breakdownJenis = this.jenisPembayaran
      .filter((j) => j.tahun_ajaran_id === taId)
      .map((j) => {
        const itemTagihan = tagihanTA.filter((t) => t.jenis_pembayaran_id === j.id);
        const itemTotal = itemTagihan.reduce((sum, t) => sum + Number(t.nominal), 0);
        const itemMasuk = itemTagihan.reduce((sum, t) => sum + Number(t.terbayar), 0);
        const itemTunggakan = itemTagihan.reduce((sum, t) => sum + Number(t.sisa), 0);
        return {
          jenis_id: j.id,
          nama: j.nama,
          tipe: j.tipe,
          totalTagihan: itemTotal,
          totalMasuk: itemMasuk,
          totalTunggakan: itemTunggakan,
        };
      });

    // Recent 6 transaksi
    const recentTransactions = this.transaksiPembayaran.slice(0, 6).map((t) => {
      const tagihan = this.tagihanSiswa.find((tag) => tag.id === t.tagihan_id);
      const siswa = this.siswa.find((s) => s.id === t.siswa_id);
      const jenisPembayaran = tagihan
        ? this.jenisPembayaran.find((j) => j.id === tagihan.jenis_pembayaran_id)
        : null;
      return {
        ...t,
        tagihan: tagihan ? { ...tagihan, jenisPembayaran } : null,
        siswa,
      };
    });

    return {
      pemasukanBulanIni,
      pemasukanHariIni,
      totalTunggakan,
      totalTagihanTahunIni,
      totalTerbayarTahunIni,
      persentasePelunasan,
      totalTransaksiValid: validTx.length,
      breakdownJenis,
      recentTransactions,
    };
  }

  // ==========================================
  // MODUL PPDB (PENERIMAAN PESERTA DIDIK BARU)
  // ==========================================
  getPPDBList(options: {
    status?: string;
    jalur?: string;
    tahun_ajaran_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    let result = [...this.ppdbPendaftar];
    if (options.tahun_ajaran_id) {
      result = result.filter((p) => p.tahun_ajaran_id === Number(options.tahun_ajaran_id));
    }
    if (options.status && options.status !== 'semua') {
      result = result.filter((p) => p.status === options.status);
    }
    if (options.jalur && options.jalur !== 'semua') {
      result = result.filter((p) => p.jalur_pendaftaran === options.jalur);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.nama_lengkap.toLowerCase().includes(q) ||
          p.nomor_pendaftaran.toLowerCase().includes(q) ||
          (p.nisn && p.nisn.includes(q)) ||
          (p.sekolah_asal && p.sekolah_asal.toLowerCase().includes(q))
      );
    }

    result.sort((a, b) => b.id - a.id);

    const total = result.length;
    const page = options.page || 1;
    const limit = options.limit || 15;
    const offset = (page - 1) * limit;
    const paginated = result.slice(offset, offset + limit);

    const data = paginated.map((p) => ({
      ...p,
      tahunAjaran: this.tahunAjaran.find((t) => t.id === p.tahun_ajaran_id),
      verifiedBy: p.verified_by_user_id ? this.getUserById(p.verified_by_user_id) : null,
      convertedSiswa: p.converted_siswa_id ? this.siswa.find((s) => s.id === p.converted_siswa_id) : null,
    }));

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  getPPDBById(id: number) {
    const p = this.ppdbPendaftar.find((item) => item.id === id);
    if (!p) return null;
    return {
      ...p,
      tahunAjaran: this.tahunAjaran.find((t) => t.id === p.tahun_ajaran_id),
      verifiedBy: p.verified_by_user_id ? this.getUserById(p.verified_by_user_id) : null,
      convertedSiswa: p.converted_siswa_id ? this.siswa.find((s) => s.id === p.converted_siswa_id) : null,
    };
  }

  getPPDBByNomor(nomor: string) {
    const q = nomor.trim().toLowerCase();
    const p = this.ppdbPendaftar.find(
      (item) => item.nomor_pendaftaran.toLowerCase() === q || (item.nisn && item.nisn.toLowerCase() === q)
    );
    if (!p) return null;
    return {
      ...p,
      tahunAjaran: this.tahunAjaran.find((t) => t.id === p.tahun_ajaran_id),
    };
  }

  createPPDBPendaftar(data: any) {
    const taId = data.tahun_ajaran_id ? Number(data.tahun_ajaran_id) : this.getActiveTahunAjaran()?.id || 1;
    const now = new Date();
    const year = now.getFullYear();
    const padSeq = String(this.ppdbSeq++).padStart(4, '0');
    const nomor_pendaftaran = `PPDB-${year}-${padSeq}`;

    const newRecord: PPDBPendaftarRecord = {
      id: this.nextPpdbId++,
      nomor_pendaftaran,
      tahun_ajaran_id: taId,
      jalur_pendaftaran: data.jalur_pendaftaran || 'Reguler',
      nama_lengkap: data.nama_lengkap,
      nisn: data.nisn || null,
      nik: data.nik || null,
      jenis_kelamin: data.jenis_kelamin || 'L',
      tempat_lahir: data.tempat_lahir || null,
      tanggal_lahir: data.tanggal_lahir || null,
      sekolah_asal: data.sekolah_asal || null,
      nama_ayah: data.nama_ayah || null,
      nama_ibu: data.nama_ibu || null,
      telepon_ortu: data.telepon_ortu || null,
      email_ortu: data.email_ortu || null,
      alamat: data.alamat || null,
      berkas_foto_url: data.berkas_foto_url || null,
      berkas_ijazah_url: data.berkas_ijazah_url || null,
      berkas_akta_url: data.berkas_akta_url || null,
      berkas_kk_url: data.berkas_kk_url || null,
      status: 'menunggu_verifikasi',
      catatan_verifikasi: null,
      verified_by_user_id: null,
      verified_at: null,
      is_converted: false,
      converted_siswa_id: null,
      created_at: now,
      updated_at: now,
    };

    this.ppdbPendaftar.unshift(newRecord);

    this.createAuditLog({
      user_id: null,
      username: 'publik',
      action: 'CREATE',
      entity: 'ppdb',
      details: `Pendaftaran PPDB online baru: ${newRecord.nomor_pendaftaran} (${newRecord.nama_lengkap})`,
      ip_address: '127.0.0.1',
    });

    return newRecord;
  }

  verifikasiPPDB(
    id: number,
    data: {
      status: 'menunggu_verifikasi' | 'terverifikasi' | 'diterima' | 'cadangan' | 'ditolak';
      catatan_verifikasi?: string;
      user_id?: number | null;
      username?: string;
    }
  ) {
    const idx = this.ppdbPendaftar.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Data pendaftar PPDB tidak ditemukan.');

    const p = this.ppdbPendaftar[idx];
    p.status = data.status;
    p.catatan_verifikasi = data.catatan_verifikasi || null;
    p.verified_by_user_id = data.user_id || null;
    p.verified_at = new Date();
    p.updated_at = new Date();

    this.createAuditLog({
      user_id: data.user_id || null,
      username: data.username || 'admin',
      action: 'UPDATE',
      entity: 'ppdb',
      details: `Verifikasi berkas PPDB ${p.nomor_pendaftaran} (${p.nama_lengkap}) menjadi status: ${data.status.toUpperCase()}`,
      ip_address: '127.0.0.1',
    });

    return p;
  }

  konversiPPDBSiswa(
    id: number,
    data: {
      kelas_id?: number;
      nis?: string;
      user_id?: number | null;
      username?: string;
    }
  ) {
    const idx = this.ppdbPendaftar.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Data pendaftar PPDB tidak ditemukan.');

    const p = this.ppdbPendaftar[idx];
    if (p.is_converted) {
      throw new Error('Calon siswa ini sudah pernah dikonversi menjadi siswa aktif.');
    }
    if (p.status !== 'diterima') {
      throw new Error('Hanya calon siswa dengan status "Diterima" yang dapat dikonversi menjadi siswa aktif.');
    }

    const now = new Date();
    const autoNis = data.nis || `242507${String(this.nextSiswaId).padStart(3, '0')}`;

    const newSiswa: SiswaRecord = {
      id: this.nextSiswaId++,
      nis: autoNis,
      nisn: p.nisn || '',
      nama: p.nama_lengkap,
      jenis_kelamin: p.jenis_kelamin,
      tempat_lahir: p.tempat_lahir,
      tanggal_lahir: p.tanggal_lahir,
      kelas_id: data.kelas_id || 1,
      tahun_ajaran_masuk_id: p.tahun_ajaran_id,
      nama_ayah: p.nama_ayah,
      nama_ibu: p.nama_ibu,
      nama_wali: null,
      pekerjaan_ortu: null,
      telepon_ortu: p.telepon_ortu,
      alamat: p.alamat,
      status: 'aktif',
      foto_url: p.berkas_foto_url,
      created_at: now,
      updated_at: now,
    };
    this.siswa.push(newSiswa);

    this.penempatanSiswa.push({
      id: this.nextPenempatanId++,
      siswa_id: newSiswa.id,
      kelas_id: newSiswa.kelas_id!,
      tahun_ajaran_id: p.tahun_ajaran_id,
      status: 'aktif',
      catatan: 'Dikonversi otomatis dari jalur PPDB ' + p.jalur_pendaftaran,
      created_at: now,
      updated_at: now,
    });

    p.is_converted = true;
    p.converted_siswa_id = newSiswa.id;
    p.updated_at = now;

    this.createAuditLog({
      user_id: data.user_id || null,
      username: data.username || 'admin',
      action: 'CREATE',
      entity: 'ppdb',
      details: `Konversi calon siswa PPDB ${p.nomor_pendaftaran} (${p.nama_lengkap}) menjadi siswa aktif dengan NIS: ${newSiswa.nis}`,
      ip_address: '127.0.0.1',
    });

    return { ppdb: p, siswa: newSiswa };
  }

  getPPDBStats(tahun_ajaran_id?: number) {
    const taId = tahun_ajaran_id || this.getActiveTahunAjaran()?.id || 1;
    const list = this.ppdbPendaftar.filter((p) => p.tahun_ajaran_id === taId);
    return {
      totalPendaftar: list.length,
      menungguVerifikasi: list.filter((p) => p.status === 'menunggu_verifikasi').length,
      terverifikasi: list.filter((p) => p.status === 'terverifikasi').length,
      diterima: list.filter((p) => p.status === 'diterima').length,
      ditolak: list.filter((p) => p.status === 'ditolak').length,
      cadangan: list.filter((p) => p.status === 'cadangan').length,
      sudahKonversi: list.filter((p) => p.is_converted).length,
      targetKuota: 120,
    };
  }

  // ==========================================
  // PENGUMUMAN
  // ==========================================
  getPengumumanList(options: { target_audiens?: string; kategori?: string; search?: string }) {
    let result = [...this.pengumuman];
    if (options.target_audiens && options.target_audiens !== 'semua') {
      result = result.filter(
        (p) => p.target_audiens === options.target_audiens || p.target_audiens === 'Semua'
      );
    }
    if (options.kategori && options.kategori !== 'semua') {
      result = result.filter((p) => p.kategori === options.kategori);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (p) => p.judul.toLowerCase().includes(q) || p.konten.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      if (a.is_pinned === b.is_pinned) return b.id - a.id;
      return a.is_pinned ? -1 : 1;
    });

    return result.map((p) => ({
      ...p,
      author: p.created_by_user_id ? this.getUserById(p.created_by_user_id) : null,
    }));
  }

  getPengumumanById(id: number) {
    const p = this.pengumuman.find((item) => item.id === id);
    if (!p) return null;
    return {
      ...p,
      author: p.created_by_user_id ? this.getUserById(p.created_by_user_id) : null,
    };
  }

  createPengumuman(data: any, user_id?: number, username?: string) {
    const now = new Date();
    const newRecord: PengumumanRecord = {
      id: this.nextPengumumanId++,
      judul: data.judul,
      konten: data.konten,
      kategori: data.kategori || 'Umum',
      target_audiens: data.target_audiens || 'Semua',
      is_pinned: Boolean(data.is_pinned),
      is_published: data.is_published !== undefined ? Boolean(data.is_published) : true,
      created_by_user_id: user_id || 1,
      created_at: now,
      updated_at: now,
    };
    this.pengumuman.unshift(newRecord);

    this.createAuditLog({
      user_id: user_id || null,
      username: username || 'admin',
      action: 'CREATE',
      entity: 'pengumuman',
      details: `Membuat pengumuman baru: "${newRecord.judul}"`,
      ip_address: '127.0.0.1',
    });

    return newRecord;
  }

  updatePengumuman(id: number, data: any, user_id?: number, username?: string) {
    const idx = this.pengumuman.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Pengumuman tidak ditemukan.');

    this.pengumuman[idx] = {
      ...this.pengumuman[idx],
      ...data,
      updated_at: new Date(),
    };

    this.createAuditLog({
      user_id: user_id || null,
      username: username || 'admin',
      action: 'UPDATE',
      entity: 'pengumuman',
      details: `Memperbarui pengumuman ID ${id}: "${this.pengumuman[idx].judul}"`,
      ip_address: '127.0.0.1',
    });

    return this.pengumuman[idx];
  }

  deletePengumuman(id: number, user_id?: number, username?: string) {
    const idx = this.pengumuman.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    const removed = this.pengumuman.splice(idx, 1)[0];

    this.createAuditLog({
      user_id: user_id || null,
      username: username || 'admin',
      action: 'DELETE',
      entity: 'pengumuman',
      details: `Menghapus pengumuman: "${removed.judul}"`,
      ip_address: '127.0.0.1',
    });

    return true;
  }

  // ==========================================
  // KALENDER AKADEMIK
  // ==========================================
  getKalenderList(options: { tahun_ajaran_id?: number; search?: string }) {
    let result = [...this.kalenderAkademik];
    if (options.tahun_ajaran_id) {
      result = result.filter((k) => k.tahun_ajaran_id === Number(options.tahun_ajaran_id));
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (k) =>
          k.judul_kegiatan.toLowerCase().includes(q) ||
          (k.deskripsi && k.deskripsi.toLowerCase().includes(q)) ||
          k.tipe_kegiatan.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => a.tanggal_mulai.localeCompare(b.tanggal_mulai));
    return result.map((k) => ({
      ...k,
      tahunAjaran: this.tahunAjaran.find((t) => t.id === k.tahun_ajaran_id),
    }));
  }

  getKalenderById(id: number) {
    const k = this.kalenderAkademik.find((item) => item.id === id);
    if (!k) return null;
    return {
      ...k,
      tahunAjaran: this.tahunAjaran.find((t) => t.id === k.tahun_ajaran_id),
    };
  }

  createKalender(data: any, user_id?: number, username?: string) {
    const now = new Date();
    const newRecord: KalenderAkademikRecord = {
      id: this.nextKalenderId++,
      tahun_ajaran_id: Number(data.tahun_ajaran_id || 1),
      judul_kegiatan: data.judul_kegiatan,
      deskripsi: data.deskripsi || null,
      tanggal_mulai: data.tanggal_mulai,
      tanggal_selesai: data.tanggal_selesai || data.tanggal_mulai,
      tipe_kegiatan: data.tipe_kegiatan || 'KBM',
      warna: data.warna || 'emerald',
      created_at: now,
      updated_at: now,
    };
    this.kalenderAkademik.push(newRecord);

    this.createAuditLog({
      user_id: user_id || null,
      username: username || 'admin',
      action: 'CREATE',
      entity: 'kalender',
      details: `Menambahkan agenda kalender: "${newRecord.judul_kegiatan}" (${newRecord.tanggal_mulai})`,
      ip_address: '127.0.0.1',
    });

    return newRecord;
  }

  updateKalender(id: number, data: any, user_id?: number, username?: string) {
    const idx = this.kalenderAkademik.findIndex((k) => k.id === id);
    if (idx === -1) throw new Error('Agenda kalender tidak ditemukan.');

    this.kalenderAkademik[idx] = {
      ...this.kalenderAkademik[idx],
      ...data,
      updated_at: new Date(),
    };

    this.createAuditLog({
      user_id: user_id || null,
      username: username || 'admin',
      action: 'UPDATE',
      entity: 'kalender',
      details: `Memperbarui agenda kalender ID ${id}: "${this.kalenderAkademik[idx].judul_kegiatan}"`,
      ip_address: '127.0.0.1',
    });

    return this.kalenderAkademik[idx];
  }

  deleteKalender(id: number, user_id?: number, username?: string) {
    const idx = this.kalenderAkademik.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    const removed = this.kalenderAkademik.splice(idx, 1)[0];

    this.createAuditLog({
      user_id: user_id || null,
      username: username || 'admin',
      action: 'DELETE',
      entity: 'kalender',
      details: `Menghapus agenda kalender: "${removed.judul_kegiatan}"`,
      ip_address: '127.0.0.1',
    });

    return true;
  }
}

// Single instance export
export const store = new InMemoryDataStore();
