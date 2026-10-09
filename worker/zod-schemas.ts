import { z } from 'zod';

export const LoginSchema = z.object({
  username: z.string().min(3, 'Username minimal 3 karakter').max(50),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

export const ChangePasswordSchema = z.object({
  old_password: z.string().min(1, 'Password lama harus diisi'),
  new_password: z
    .string()
    .min(6, 'Password baru minimal 6 karakter')
    .max(100, 'Password baru terlalu panjang'),
});

export const PermissionItemSchema = z.object({
  module: z.enum([
    'tahun_ajaran',
    'kelas',
    'mapel',
    'guru',
    'siswa',
    'pengaturan',
    'staf',
    'audit_log',
  ]),
  can_view: z.boolean(),
  can_create: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});

export const StafCreateSchema = z.object({
  username: z.string().min(3).max(50),
  nama_lengkap: z.string().min(2).max(150),
  email: z.string().email('Format email tidak valid').optional().nullable(),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  staf_role: z.enum(['TU', 'Keuangan', 'Akademik']),
  is_active: z.boolean().default(true),
  permissions: z.array(PermissionItemSchema).optional(),
});

export const StafUpdateSchema = z.object({
  nama_lengkap: z.string().min(2).max(150),
  email: z.string().email('Format email tidak valid').optional().nullable(),
  password: z.string().min(6).optional().or(z.literal('')),
  staf_role: z.enum(['TU', 'Keuangan', 'Akademik']),
  is_active: z.boolean().default(true),
  permissions: z.array(PermissionItemSchema).optional(),
});

export const MadrasahProfileSchema = z.object({
  nama: z.string().min(3, 'Nama madrasah wajib diisi'),
  nsm: z.string().min(5, 'NSM wajib diisi'),
  npsn: z.string().min(5, 'NPSN wajib diisi'),
  alamat: z.string().optional().nullable(),
  kelurahan: z.string().optional().nullable(),
  kecamatan: z.string().optional().nullable(),
  kabupaten_kota: z.string().optional().nullable(),
  provinsi: z.string().optional().nullable(),
  kode_pos: z.string().optional().nullable(),
  telepon: z.string().optional().nullable(),
  email: z.string().email('Email madrasah tidak valid').optional().nullable(),
  website: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  kepala_madrasah: z.string().min(3, 'Nama kepala madrasah wajib diisi'),
  nip_kepala_madrasah: z.string().optional().nullable(),
});

export const TahunAjaranSchema = z.object({
  tahun: z.string().regex(/^\d{4}\/\d{4}$/, 'Format tahun ajaran harus YYYY/YYYY (contoh: 2024/2025)'),
  semester: z.enum(['Ganjil', 'Genap']),
  is_active: z.boolean().default(false),
  tanggal_mulai: z.string().optional().nullable(),
  tanggal_selesai: z.string().optional().nullable(),
});

export const KelasSchema = z.object({
  tingkat: z.string().min(1, 'Tingkat wajib diisi'),
  nama: z.string().min(1, 'Nama kelas wajib diisi'),
  tahun_ajaran_id: z.coerce.number().int().positive('Tahun ajaran harus dipilih'),
  wali_kelas_id: z.coerce.number().int().positive().optional().nullable(),
  kapasitas: z.coerce.number().int().min(1).max(60).default(32),
});

export const MapelSchema = z.object({
  kode: z.string().min(2, 'Kode mapel minimal 2 karakter').max(20),
  nama: z.string().min(3, 'Nama mata pelajaran wajib diisi'),
  kelompok: z.enum(['PAI', 'Umum', 'Muatan Lokal']),
  kkm: z.coerce.number().int().min(0).max(100).default(75),
  jam_pelajaran: z.coerce.number().int().min(1).max(10).default(2),
  tingkat: z.string().optional().nullable(),
});

export const GuruSchema = z.object({
  nip: z.string().optional().nullable(),
  nuptk: z.string().optional().nullable(),
  nama: z.string().min(2, 'Nama guru wajib diisi'),
  gelar_depan: z.string().optional().nullable(),
  gelar_belakang: z.string().optional().nullable(),
  jenis_kelamin: z.enum(['L', 'P']),
  tempat_lahir: z.string().optional().nullable(),
  tanggal_lahir: z.string().optional().nullable(),
  jabatan: z.string().default('Guru Mapel'),
  pendidikan_terakhir: z.string().optional().nullable(),
  jurusan: z.string().optional().nullable(),
  telepon: z.string().optional().nullable(),
  email: z.string().email('Email tidak valid').optional().nullable(),
  status_kepegawaian: z.string().default('GTY'),
  foto_url: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const SiswaSchema = z.object({
  nis: z.string().min(3, 'NIS wajib diisi'),
  nisn: z.string().length(10, 'NISN harus 10 digit').regex(/^\d+$/, 'NISN hanya berupa angka'),
  nama: z.string().min(2, 'Nama siswa wajib diisi'),
  jenis_kelamin: z.enum(['L', 'P']),
  tempat_lahir: z.string().optional().nullable(),
  tanggal_lahir: z.string().optional().nullable(),
  kelas_id: z.coerce.number().int().positive().optional().nullable(),
  tahun_ajaran_masuk_id: z.coerce.number().int().positive().optional().nullable(),
  nama_ayah: z.string().optional().nullable(),
  nama_ibu: z.string().optional().nullable(),
  nama_wali: z.string().optional().nullable(),
  pekerjaan_ortu: z.string().optional().nullable(),
  telepon_ortu: z.string().optional().nullable(),
  alamat: z.string().optional().nullable(),
  status: z.enum(['aktif', 'lulus', 'pindah']).default('aktif'),
  foto_url: z.string().optional().nullable(),
});
