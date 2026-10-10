import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Users & Staff / Guru Authentication
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    nama_lengkap: varchar('nama_lengkap', { length: 150 }).notNull(),
    email: varchar('email', { length: 150 }),
    password_hash: text('password_hash').notNull(),
    role: varchar('role', { length: 20 }).notNull().default('staf'), // 'admin' | 'staf' | 'guru'
    staf_role: varchar('staf_role', { length: 50 }), // 'TU' | 'Keuangan' | 'Akademik' | 'Guru'
    guru_id: integer('guru_id').references(() => guru.id, { onDelete: 'set null' }),
    is_active: boolean('is_active').notNull().default(true),
    must_change_password: boolean('must_change_password').notNull().default(false),
    // Array of permissions: [{ module: 'siswa', can_view: true, can_create: true, can_edit: true, can_delete: false }, ...]
    permissions: jsonb('permissions'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('users_username_idx').on(table.username),
    index('users_guru_idx').on(table.guru_id),
  ]
);

// 2. Profil Madrasah (Pengaturan)
export const madrasahProfile = pgTable('madrasah_profile', {
  id: serial('id').primaryKey(),
  nama: varchar('nama', { length: 200 }).notNull(),
  nsm: varchar('nsm', { length: 50 }).notNull(),
  npsn: varchar('npsn', { length: 50 }).notNull(),
  alamat: text('alamat'),
  kelurahan: varchar('kelurahan', { length: 100 }),
  kecamatan: varchar('kecamatan', { length: 100 }),
  kabupaten_kota: varchar('kabupaten_kota', { length: 100 }),
  provinsi: varchar('provinsi', { length: 100 }),
  kode_pos: varchar('kode_pos', { length: 20 }),
  telepon: varchar('telepon', { length: 50 }),
  email: varchar('email', { length: 100 }),
  website: varchar('website', { length: 150 }),
  logo_url: text('logo_url'),
  kepala_madrasah: varchar('kepala_madrasah', { length: 150 }).notNull(),
  nip_kepala_madrasah: varchar('nip_kepala_madrasah', { length: 50 }),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// 3. Tahun Ajaran & Semester
export const tahunAjaran = pgTable('tahun_ajaran', {
  id: serial('id').primaryKey(),
  tahun: varchar('tahun', { length: 20 }).notNull(), // e.g. "2024/2025"
  semester: varchar('semester', { length: 10 }).notNull(), // "Ganjil" | "Genap"
  is_active: boolean('is_active').notNull().default(false),
  tanggal_mulai: date('tanggal_mulai'),
  tanggal_selesai: date('tanggal_selesai'),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// 4. Guru & Tenaga Kependidikan
export const guru = pgTable('guru', {
  id: serial('id').primaryKey(),
  nip: varchar('nip', { length: 50 }),
  nuptk: varchar('nuptk', { length: 50 }),
  nama: varchar('nama', { length: 150 }).notNull(),
  gelar_depan: varchar('gelar_depan', { length: 30 }),
  gelar_belakang: varchar('gelar_belakang', { length: 50 }),
  jenis_kelamin: varchar('jenis_kelamin', { length: 20 }).notNull().default('L'), // 'L' | 'P'
  tempat_lahir: varchar('tempat_lahir', { length: 100 }),
  tanggal_lahir: date('tanggal_lahir'),
  jabatan: varchar('jabatan', { length: 100 }).notNull().default('Guru Mapel'),
  pendidikan_terakhir: varchar('pendidikan_terakhir', { length: 50 }),
  jurusan: varchar('jurusan', { length: 100 }),
  telepon: varchar('telepon', { length: 50 }),
  email: varchar('email', { length: 100 }),
  status_kepegawaian: varchar('status_kepegawaian', { length: 50 }).notNull().default('GTY'),
  foto_url: text('foto_url'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// 5. Kelas / Rombel
export const kelas = pgTable(
  'kelas',
  {
    id: serial('id').primaryKey(),
    tingkat: varchar('tingkat', { length: 20 }).notNull(), // '7', '8', '9', '10', '11', '12'
    nama: varchar('nama', { length: 50 }).notNull(), // '7-A', '10-IPA-1'
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    wali_kelas_id: integer('wali_kelas_id').references(() => guru.id, {
      onDelete: 'set null',
    }),
    kapasitas: integer('kapasitas').notNull().default(32),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('kelas_tahun_ajaran_idx').on(table.tahun_ajaran_id),
    index('kelas_wali_idx').on(table.wali_kelas_id),
  ]
);

// 6. Mata Pelajaran (termasuk Al-Qur'an Hadis, Akidah Akhlak, Fikih, SKI, Bahasa Arab)
export const mapel = pgTable('mapel', {
  id: serial('id').primaryKey(),
  kode: varchar('kode', { length: 20 }).notNull().unique(),
  nama: varchar('nama', { length: 100 }).notNull(),
  kelompok: varchar('kelompok', { length: 50 }).notNull(), // 'PAI' | 'Umum' | 'Muatan Lokal'
  kkm: integer('kkm').notNull().default(75),
  jam_pelajaran: integer('jam_pelajaran').notNull().default(2),
  tingkat: varchar('tingkat', { length: 20 }), // e.g. "Semua", "7", "8", dst
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// 7. Siswa
export const siswa = pgTable(
  'siswa',
  {
    id: serial('id').primaryKey(),
    nis: varchar('nis', { length: 50 }).notNull().unique(),
    nisn: varchar('nisn', { length: 50 }).notNull().unique(),
    nama: varchar('nama', { length: 150 }).notNull(),
    jenis_kelamin: varchar('jenis_kelamin', { length: 20 }).notNull().default('L'), // 'L' | 'P'
    tempat_lahir: varchar('tempat_lahir', { length: 100 }),
    tanggal_lahir: date('tanggal_lahir'),
    kelas_id: integer('kelas_id').references(() => kelas.id, {
      onDelete: 'set null',
    }),
    tahun_ajaran_masuk_id: integer('tahun_ajaran_masuk_id').references(
      () => tahunAjaran.id,
      { onDelete: 'set null' }
    ),
    nama_ayah: varchar('nama_ayah', { length: 150 }),
    nama_ibu: varchar('nama_ibu', { length: 150 }),
    nama_wali: varchar('nama_wali', { length: 150 }),
    pekerjaan_ortu: varchar('pekerjaan_ortu', { length: 100 }),
    telepon_ortu: varchar('telepon_ortu', { length: 50 }),
    alamat: text('alamat'),
    status: varchar('status', { length: 20 }).notNull().default('aktif'), // 'aktif' | 'lulus' | 'pindah'
    foto_url: text('foto_url'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('siswa_nis_idx').on(table.nis),
    index('siswa_nisn_idx').on(table.nisn),
    index('siswa_kelas_idx').on(table.kelas_id),
    index('siswa_tahun_masuk_idx').on(table.tahun_ajaran_masuk_id),
  ]
);

// 8. Penempatan Siswa ke Kelas / Anggota Rombel per Tahun Ajaran
export const penempatanSiswa = pgTable(
  'penempatan_siswa',
  {
    id: serial('id').primaryKey(),
    siswa_id: integer('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    kelas_id: integer('kelas_id')
      .notNull()
      .references(() => kelas.id, { onDelete: 'cascade' }),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 30 }).notNull().default('aktif'), // 'aktif' | 'naik_kelas' | 'tinggal_kelas' | 'lulus' | 'mutasi'
    catatan: text('catatan'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('penempatan_siswa_idx').on(table.siswa_id),
    index('penempatan_kelas_idx').on(table.kelas_id),
    index('penempatan_ta_idx').on(table.tahun_ajaran_id),
  ]
);

// 9. Penugasan Guru ke Mapel & Kelas (Pengajaran)
export const pengajaranGuru = pgTable(
  'pengajaran_guru',
  {
    id: serial('id').primaryKey(),
    guru_id: integer('guru_id')
      .notNull()
      .references(() => guru.id, { onDelete: 'cascade' }),
    mapel_id: integer('mapel_id')
      .notNull()
      .references(() => mapel.id, { onDelete: 'cascade' }),
    kelas_id: integer('kelas_id')
      .notNull()
      .references(() => kelas.id, { onDelete: 'cascade' }),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    beban_jp: integer('beban_jp').notNull().default(2),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('pengajaran_guru_idx').on(table.guru_id),
    index('pengajaran_kelas_idx').on(table.kelas_id),
    index('pengajaran_mapel_idx').on(table.mapel_id),
  ]
);

// 10. Jadwal Pelajaran (Tabel Mingguan & Deteksi Bentrok)
export const jadwalPelajaran = pgTable(
  'jadwal_pelajaran',
  {
    id: serial('id').primaryKey(),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    kelas_id: integer('kelas_id')
      .notNull()
      .references(() => kelas.id, { onDelete: 'cascade' }),
    mapel_id: integer('mapel_id')
      .notNull()
      .references(() => mapel.id, { onDelete: 'cascade' }),
    guru_id: integer('guru_id')
      .notNull()
      .references(() => guru.id, { onDelete: 'cascade' }),
    hari: varchar('hari', { length: 20 }).notNull(), // 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'
    jam_ke: integer('jam_ke').notNull(), // 1, 2, 3, 4, 5, 6, 7, 8
    jam_mulai: varchar('jam_mulai', { length: 10 }).notNull(), // '07:15'
    jam_selesai: varchar('jam_selesai', { length: 10 }).notNull(), // '08:35'
    ruang: varchar('ruang', { length: 50 }).default('Ruang Kelas'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('jadwal_ta_idx').on(table.tahun_ajaran_id),
    index('jadwal_kelas_hari_idx').on(table.kelas_id, table.hari, table.jam_ke),
    index('jadwal_guru_hari_idx').on(table.guru_id, table.hari, table.jam_ke),
  ]
);

// 11. Absensi Harian Siswa (Hadir, Izin, Sakit, Alpa)
export const absensiSiswa = pgTable(
  'absensi_siswa',
  {
    id: serial('id').primaryKey(),
    siswa_id: integer('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    kelas_id: integer('kelas_id')
      .notNull()
      .references(() => kelas.id, { onDelete: 'cascade' }),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    tanggal: date('tanggal').notNull(),
    status: varchar('status', { length: 10 }).notNull().default('H'), // 'H' | 'I' | 'S' | 'A'
    catatan: text('catatan'),
    created_by_user_id: integer('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('absensi_kelas_tanggal_idx').on(table.kelas_id, table.tanggal),
    index('absensi_siswa_ta_idx').on(table.siswa_id, table.tahun_ajaran_id),
  ]
);

// 12. Konfigurasi Bobot Penilaian
export const bobotNilai = pgTable('bobot_nilai', {
  id: serial('id').primaryKey(),
  tahun_ajaran_id: integer('tahun_ajaran_id')
    .notNull()
    .unique()
    .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
  bobot_tugas: integer('bobot_tugas').notNull().default(20),
  bobot_uh: integer('bobot_uh').notNull().default(20),
  bobot_uts: integer('bobot_uts').notNull().default(25),
  bobot_uas: integer('bobot_uas').notNull().default(25),
  bobot_keterampilan: integer('bobot_keterampilan').notNull().default(10),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// 13. Input Nilai Siswa
export const nilaiSiswa = pgTable(
  'nilai_siswa',
  {
    id: serial('id').primaryKey(),
    siswa_id: integer('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    mapel_id: integer('mapel_id')
      .notNull()
      .references(() => mapel.id, { onDelete: 'cascade' }),
    kelas_id: integer('kelas_id')
      .notNull()
      .references(() => kelas.id, { onDelete: 'cascade' }),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    nilai_tugas: numeric('nilai_tugas', { precision: 5, scale: 2 }).default('0'),
    nilai_uh: numeric('nilai_uh', { precision: 5, scale: 2 }).default('0'),
    nilai_uts: numeric('nilai_uts', { precision: 5, scale: 2 }).default('0'),
    nilai_uas: numeric('nilai_uas', { precision: 5, scale: 2 }).default('0'),
    nilai_keterampilan: numeric('nilai_keterampilan', { precision: 5, scale: 2 }).default('0'),
    nilai_akhir: numeric('nilai_akhir', { precision: 5, scale: 2 }).default('0'),
    predikat: varchar('predikat', { length: 5 }).default('C'), // 'A' | 'B' | 'C' | 'D'
    catatan: text('catatan'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('nilai_siswa_mapel_ta_idx').on(table.siswa_id, table.mapel_id, table.tahun_ajaran_id),
    index('nilai_kelas_mapel_ta_idx').on(table.kelas_id, table.mapel_id, table.tahun_ajaran_id),
  ]
);

// 14. Nilai Sikap, Tahfidz, dan Catatan Rapor
export const catatanRaporSiswa = pgTable(
  'catatan_rapor_siswa',
  {
    id: serial('id').primaryKey(),
    siswa_id: integer('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    kelas_id: integer('kelas_id')
      .notNull()
      .references(() => kelas.id, { onDelete: 'cascade' }),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    sikap_spiritual: varchar('sikap_spiritual', { length: 30 }).default('Baik'), // 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Bimbingan'
    deskripsi_spiritual: text('deskripsi_spiritual'),
    sikap_sosial: varchar('sikap_sosial', { length: 30 }).default('Baik'),
    deskripsi_sosial: text('deskripsi_sosial'),
    juz_hafalan: varchar('juz_hafalan', { length: 100 }), // Contoh: "Juz 30 (An-Naba s.d. An-Nas)"
    surah_terakhir: varchar('surah_terakhir', { length: 150 }), // Contoh: "Surah Al-Buruj ayat 1-22"
    predikat_tahfidz: varchar('predikat_tahfidz', { length: 30 }).default('Jayyid'), // 'Mutqin' | 'Jayyid Jiddan' | 'Jayyid' | 'Maqbul'
    catatan_wali_kelas: text('catatan_wali_kelas'),
    status_akhir: varchar('status_akhir', { length: 30 }).default('Belum Ditentukan'), // 'Naik Kelas' | 'Tinggal Kelas' | 'Lulus' | 'Belum Ditentukan'
    naik_ke_kelas: varchar('naik_ke_kelas', { length: 50 }),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('rapor_siswa_ta_idx').on(table.siswa_id, table.tahun_ajaran_id),
    index('rapor_kelas_ta_idx').on(table.kelas_id, table.tahun_ajaran_id),
  ]
);

// 15. Audit Log
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  username: varchar('username', { length: 100 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'LOGIN' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'EXPORT' | 'PAYMENT' | 'VOID_PAYMENT'
  entity: varchar('entity', { length: 50 }).notNull(), // 'auth' | 'siswa' | 'guru' | 'kelas' | 'mapel' | 'tahun_ajaran' | 'pengaturan' | 'staf' | 'akademik' | 'keuangan'
  details: text('details'),
  ip_address: varchar('ip_address', { length: 50 }),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

// ==========================================
// MODUL KEUANGAN
// ==========================================

// 16. Jenis Pembayaran (Pos Keuangan, e.g. SPP Bulanan, Uang Gedung, Seragam)
export const jenisPembayaran = pgTable(
  'jenis_pembayaran',
  {
    id: serial('id').primaryKey(),
    nama: varchar('nama', { length: 100 }).notNull(),
    tipe: varchar('tipe', { length: 20 }).notNull().default('bulanan'), // 'bulanan' | 'bebas'
    deskripsi: text('deskripsi'),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('jenis_bayar_ta_idx').on(table.tahun_ajaran_id),
  ]
);

// 17. Tarif Pembayaran per Tingkat / Kelas
export const tarifPembayaran = pgTable(
  'tarif_pembayaran',
  {
    id: serial('id').primaryKey(),
    jenis_pembayaran_id: integer('jenis_pembayaran_id')
      .notNull()
      .references(() => jenisPembayaran.id, { onDelete: 'cascade' }),
    tingkat: varchar('tingkat', { length: 20 }).notNull().default('Semua'), // 'Semua' | '7' | '8' | '9'
    kelas_id: integer('kelas_id').references(() => kelas.id, { onDelete: 'cascade' }),
    nominal: numeric('nominal', { precision: 12, scale: 2 }).notNull().default('0'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('tarif_jenis_idx').on(table.jenis_pembayaran_id),
    index('tarif_kelas_idx').on(table.kelas_id),
  ]
);

// 18. Tagihan Siswa (Generated Massal per Bulan / Semester)
export const tagihanSiswa = pgTable(
  'tagihan_siswa',
  {
    id: serial('id').primaryKey(),
    siswa_id: integer('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    kelas_id: integer('kelas_id')
      .notNull()
      .references(() => kelas.id, { onDelete: 'cascade' }),
    jenis_pembayaran_id: integer('jenis_pembayaran_id')
      .notNull()
      .references(() => jenisPembayaran.id, { onDelete: 'cascade' }),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    bulan: varchar('bulan', { length: 20 }), // 'Juli', 'Agustus', ..., null jika jenis non-bulanan
    nominal: numeric('nominal', { precision: 12, scale: 2 }).notNull().default('0'),
    terbayar: numeric('terbayar', { precision: 12, scale: 2 }).notNull().default('0'),
    sisa: numeric('sisa', { precision: 12, scale: 2 }).notNull().default('0'),
    status: varchar('status', { length: 20 }).notNull().default('belum_bayar'), // 'belum_bayar' | 'sebagian' | 'lunas'
    jatuh_tempo: date('jatuh_tempo'),
    catatan: text('catatan'),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('tagihan_siswa_idx').on(table.siswa_id),
    index('tagihan_kelas_idx').on(table.kelas_id),
    index('tagihan_jenis_idx').on(table.jenis_pembayaran_id),
    index('tagihan_status_idx').on(table.status),
  ]
);

// 19. Transaksi Pembayaran Siswa (Mendukung Cicilan, Kwitansi Otomatis, Tidak Boleh Hapus / Hanya Batal)
export const transaksiPembayaran = pgTable(
  'transaksi_pembayaran',
  {
    id: serial('id').primaryKey(),
    nomor_transaksi: varchar('nomor_transaksi', { length: 50 }).notNull().unique(), // Contoh: 'KWT-202410-0001'
    tagihan_id: integer('tagihan_id')
      .notNull()
      .references(() => tagihanSiswa.id, { onDelete: 'cascade' }),
    siswa_id: integer('siswa_id')
      .notNull()
      .references(() => siswa.id, { onDelete: 'cascade' }),
    jumlah_bayar: numeric('jumlah_bayar', { precision: 12, scale: 2 }).notNull(),
    metode: varchar('metode', { length: 20 }).notNull().default('Tunai'), // 'Tunai' | 'Transfer'
    tanggal_bayar: date('tanggal_bayar').notNull(),
    catatan: text('catatan'),
    created_by_user_id: integer('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    status: varchar('status', { length: 20 }).notNull().default('valid'), // 'valid' | 'dibatalkan'
    alasan_batal: text('alasan_batal'),
    cancelled_at: timestamp('cancelled_at'),
    cancelled_by_user_id: integer('cancelled_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('transaksi_tagihan_idx').on(table.tagihan_id),
    index('transaksi_siswa_idx').on(table.siswa_id),
    index('transaksi_tanggal_idx').on(table.tanggal_bayar),
    index('transaksi_status_idx').on(table.status),
  ]
);

// Relations
export const jenisPembayaranRelations = relations(jenisPembayaran, ({ one, many }) => ({
  tahunAjaran: one(tahunAjaran, {
    fields: [jenisPembayaran.tahun_ajaran_id],
    references: [tahunAjaran.id],
  }),
  tarifList: many(tarifPembayaran),
  tagihanList: many(tagihanSiswa),
}));

export const tarifPembayaranRelations = relations(tarifPembayaran, ({ one }) => ({
  jenisPembayaran: one(jenisPembayaran, {
    fields: [tarifPembayaran.jenis_pembayaran_id],
    references: [jenisPembayaran.id],
  }),
  kelas: one(kelas, {
    fields: [tarifPembayaran.kelas_id],
    references: [kelas.id],
  }),
}));

export const tagihanSiswaRelations = relations(tagihanSiswa, ({ one, many }) => ({
  siswa: one(siswa, {
    fields: [tagihanSiswa.siswa_id],
    references: [siswa.id],
  }),
  kelas: one(kelas, {
    fields: [tagihanSiswa.kelas_id],
    references: [kelas.id],
  }),
  jenisPembayaran: one(jenisPembayaran, {
    fields: [tagihanSiswa.jenis_pembayaran_id],
    references: [jenisPembayaran.id],
  }),
  tahunAjaran: one(tahunAjaran, {
    fields: [tagihanSiswa.tahun_ajaran_id],
    references: [tahunAjaran.id],
  }),
  transaksiList: many(transaksiPembayaran),
}));

export const transaksiPembayaranRelations = relations(transaksiPembayaran, ({ one }) => ({
  tagihan: one(tagihanSiswa, {
    fields: [transaksiPembayaran.tagihan_id],
    references: [tagihanSiswa.id],
  }),
  siswa: one(siswa, {
    fields: [transaksiPembayaran.siswa_id],
    references: [siswa.id],
  }),
  createdByUser: one(users, {
    fields: [transaksiPembayaran.created_by_user_id],
    references: [users.id],
  }),
  cancelledByUser: one(users, {
    fields: [transaksiPembayaran.cancelled_by_user_id],
    references: [users.id],
  }),
}));
export const tahunAjaranRelations = relations(tahunAjaran, ({ many }) => ({
  kelasList: many(kelas),
  siswaMasukList: many(siswa),
  penempatanList: many(penempatanSiswa),
  jadwalList: many(jadwalPelajaran),
}));

export const guruRelations = relations(guru, ({ many }) => ({
  waliKelasList: many(kelas),
  pengajaranList: many(pengajaranGuru),
  jadwalList: many(jadwalPelajaran),
}));

export const kelasRelations = relations(kelas, ({ one, many }) => ({
  tahunAjaran: one(tahunAjaran, {
    fields: [kelas.tahun_ajaran_id],
    references: [tahunAjaran.id],
  }),
  waliKelas: one(guru, {
    fields: [kelas.wali_kelas_id],
    references: [guru.id],
  }),
  siswaList: many(siswa),
  penempatanList: many(penempatanSiswa),
  pengajaranList: many(pengajaranGuru),
  jadwalList: many(jadwalPelajaran),
}));

export const siswaRelations = relations(siswa, ({ one, many }) => ({
  kelas: one(kelas, {
    fields: [siswa.kelas_id],
    references: [kelas.id],
  }),
  tahunAjaranMasuk: one(tahunAjaran, {
    fields: [siswa.tahun_ajaran_masuk_id],
    references: [tahunAjaran.id],
  }),
  penempatanList: many(penempatanSiswa),
  absensiList: many(absensiSiswa),
  nilaiList: many(nilaiSiswa),
  catatanRaporList: many(catatanRaporSiswa),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  guru: one(guru, {
    fields: [users.guru_id],
    references: [guru.id],
  }),
  auditLogs: many(auditLog),
}));

// 20. PPDB (Penerimaan Peserta Didik Baru)
export const ppdbPendaftar = pgTable(
  'ppdb_pendaftar',
  {
    id: serial('id').primaryKey(),
    nomor_pendaftaran: varchar('nomor_pendaftaran', { length: 50 }).notNull().unique(), // Contoh: 'PPDB-2024-0001'
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    jalur_pendaftaran: varchar('jalur_pendaftaran', { length: 50 }).notNull().default('Reguler'), // 'Reguler' | 'Prestasi' | 'Afirmasi' | 'Tahfidz'
    nama_lengkap: varchar('nama_lengkap', { length: 150 }).notNull(),
    nisn: varchar('nisn', { length: 20 }),
    nik: varchar('nik', { length: 20 }),
    jenis_kelamin: varchar('jenis_kelamin', { length: 1 }).notNull(), // 'L' | 'P'
    tempat_lahir: varchar('tempat_lahir', { length: 100 }),
    tanggal_lahir: varchar('tanggal_lahir', { length: 20 }),
    sekolah_asal: varchar('sekolah_asal', { length: 150 }),
    nama_ayah: varchar('nama_ayah', { length: 150 }),
    nama_ibu: varchar('nama_ibu', { length: 150 }),
    telepon_ortu: varchar('telepon_ortu', { length: 30 }),
    email_ortu: varchar('email_ortu', { length: 150 }),
    alamat: text('alamat'),
    berkas_foto_url: text('berkas_foto_url'),
    berkas_ijazah_url: text('berkas_ijazah_url'),
    berkas_akta_url: text('berkas_akta_url'),
    berkas_kk_url: text('berkas_kk_url'),
    status: varchar('status', { length: 30 }).notNull().default('menunggu_verifikasi'), // 'menunggu_verifikasi' | 'terverifikasi' | 'diterima' | 'cadangan' | 'ditolak'
    catatan_verifikasi: text('catatan_verifikasi'),
    verified_by_user_id: integer('verified_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    verified_at: timestamp('verified_at'),
    is_converted: boolean('is_converted').notNull().default(false),
    converted_siswa_id: integer('converted_siswa_id').references(() => siswa.id, {
      onDelete: 'set null',
    }),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('ppdb_ta_idx').on(table.tahun_ajaran_id),
    index('ppdb_status_idx').on(table.status),
    index('ppdb_nomor_idx').on(table.nomor_pendaftaran),
  ]
);

// 21. Pengumuman
export const pengumuman = pgTable(
  'pengumuman',
  {
    id: serial('id').primaryKey(),
    judul: varchar('judul', { length: 255 }).notNull(),
    konten: text('konten').notNull(),
    kategori: varchar('kategori', { length: 50 }).notNull().default('Umum'), // 'Umum' | 'Akademik' | 'Keuangan' | 'Kegiatan' | 'Penting'
    target_audiens: varchar('target_audiens', { length: 50 }).notNull().default('Semua'), // 'Semua' | 'Guru' | 'Siswa' | 'Staf'
    is_pinned: boolean('is_pinned').notNull().default(false),
    is_published: boolean('is_published').notNull().default(true),
    created_by_user_id: integer('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('pengumuman_pinned_idx').on(table.is_pinned),
    index('pengumuman_target_idx').on(table.target_audiens),
  ]
);

// 22. Kalender Akademik
export const kalenderAkademik = pgTable(
  'kalender_akademik',
  {
    id: serial('id').primaryKey(),
    tahun_ajaran_id: integer('tahun_ajaran_id')
      .notNull()
      .references(() => tahunAjaran.id, { onDelete: 'cascade' }),
    judul_kegiatan: varchar('judul_kegiatan', { length: 255 }).notNull(),
    deskripsi: text('deskripsi'),
    tanggal_mulai: varchar('tanggal_mulai', { length: 20 }).notNull(),
    tanggal_selesai: varchar('tanggal_selesai', { length: 20 }).notNull(),
    tipe_kegiatan: varchar('tipe_kegiatan', { length: 50 }).notNull().default('KBM'), // 'KBM' | 'Libur Nasional' | 'Libur Semester' | 'Ujian' | 'PPDB' | 'Rapat' | 'Ekstrakurikuler' | 'Lainnya'
    warna: varchar('warna', { length: 30 }).notNull().default('emerald'), // 'emerald' | 'rose' | 'amber' | 'blue' | 'purple' | 'slate'
    created_at: timestamp('created_at').notNull().defaultNow(),
    updated_at: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('kalender_ta_idx').on(table.tahun_ajaran_id),
    index('kalender_tgl_idx').on(table.tanggal_mulai),
  ]
);

export const ppdbPendaftarRelations = relations(ppdbPendaftar, ({ one }) => ({
  tahunAjaran: one(tahunAjaran, {
    fields: [ppdbPendaftar.tahun_ajaran_id],
    references: [tahunAjaran.id],
  }),
  verifiedBy: one(users, {
    fields: [ppdbPendaftar.verified_by_user_id],
    references: [users.id],
  }),
  convertedSiswa: one(siswa, {
    fields: [ppdbPendaftar.converted_siswa_id],
    references: [siswa.id],
  }),
}));

export const pengumumanRelations = relations(pengumuman, ({ one }) => ({
  author: one(users, {
    fields: [pengumuman.created_by_user_id],
    references: [users.id],
  }),
}));

export const kalenderAkademikRelations = relations(kalenderAkademik, ({ one }) => ({
  tahunAjaran: one(tahunAjaran, {
    fields: [kalenderAkademik.tahun_ajaran_id],
    references: [tahunAjaran.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.user_id],
    references: [users.id],
  }),
}));
