import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as schema from './schema.ts';

dotenv.config();

export async function runSeed(customDb?: any) {
  let db = customDb;

  if (!db) {
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️ DATABASE_URL tidak ditemukan. Lewati seed Neon PostgreSQL.');
      return;
    }
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql, { schema });
  }

  console.log('🌱 Memulai proses seeding data master & akademik SIAKAD Madrasah...');

  // 1. Seed Admin Default
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const staffPassword = await bcrypt.hash('staf123', 10);
  const guruPassword = await bcrypt.hash('guru123', 10);
  
  await db.insert(schema.users).values({
    username: 'admin',
    nama_lengkap: 'Administrator Madrasah',
    email: 'admin@madrasah.sch.id',
    password_hash: hashedPassword,
    role: 'admin',
    staf_role: null,
    guru_id: null,
    is_active: true,
    must_change_password: true,
    permissions: null,
  }).onConflictDoNothing();

  // 2. Seed Profil Madrasah
  await db.insert(schema.madrasahProfile).values({
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
  }).onConflictDoNothing();

  // 3. Seed Tahun Ajaran
  const [taAktif] = await db.insert(schema.tahunAjaran).values([
    {
      tahun: '2024/2025',
      semester: 'Ganjil',
      is_active: true,
      tanggal_mulai: '2024-07-15',
      tanggal_selesai: '2024-12-20',
    },
    {
      tahun: '2024/2025',
      semester: 'Genap',
      is_active: false,
      tanggal_mulai: '2025-01-06',
      tanggal_selesai: '2025-06-21',
    },
  ]).returning();

  // 4. Seed Mata Pelajaran
  await db.insert(schema.mapel).values([
    { kode: 'QH-01', nama: "Al-Qur'an Hadis", kelompok: 'PAI', kkm: 78, jam_pelajaran: 2, tingkat: 'Semua' },
    { kode: 'AA-01', nama: 'Akidah Akhlak', kelompok: 'PAI', kkm: 78, jam_pelajaran: 2, tingkat: 'Semua' },
    { kode: 'FKH-01', nama: 'Fikih', kelompok: 'PAI', kkm: 78, jam_pelajaran: 2, tingkat: 'Semua' },
    { kode: 'SKI-01', nama: 'Sejarah Kebudayaan Islam (SKI)', kelompok: 'PAI', kkm: 75, jam_pelajaran: 2, tingkat: 'Semua' },
    { kode: 'BAR-01', nama: 'Bahasa Arab', kelompok: 'PAI', kkm: 75, jam_pelajaran: 3, tingkat: 'Semua' },
    { kode: 'BIN-01', nama: 'Bahasa Indonesia', kelompok: 'Umum', kkm: 75, jam_pelajaran: 4, tingkat: 'Semua' },
    { kode: 'MAT-01', nama: 'Matematika', kelompok: 'Umum', kkm: 75, jam_pelajaran: 4, tingkat: 'Semua' },
    { kode: 'IPA-01', nama: 'Ilmu Pengetahuan Alam (IPA)', kelompok: 'Umum', kkm: 75, jam_pelajaran: 4, tingkat: 'Semua' },
    { kode: 'IPS-01', nama: 'Ilmu Pengetahuan Sosial (IPS)', kelompok: 'Umum', kkm: 75, jam_pelajaran: 3, tingkat: 'Semua' },
    { kode: 'BIG-01', nama: 'Bahasa Inggris', kelompok: 'Umum', kkm: 75, jam_pelajaran: 3, tingkat: 'Semua' },
  ]).onConflictDoNothing();

  // 5. Seed Guru
  const [guru1, guru2] = await db.insert(schema.guru).values([
    {
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
    },
    {
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
    },
  ]).returning();

  // 6. Seed Staf & Akun Guru
  await db.insert(schema.users).values([
    {
      username: 'stafftu',
      nama_lengkap: 'Nurul Hidayati, S.AP',
      email: 'nurul.tu@madrasah.sch.id',
      password_hash: staffPassword,
      role: 'staf',
      staf_role: 'TU',
      guru_id: null,
      is_active: true,
      must_change_password: false,
      permissions: [
        { module: 'siswa', can_view: true, can_create: true, can_edit: true, can_delete: false },
        { module: 'akademik', can_view: true, can_create: true, can_edit: true, can_delete: false },
      ],
    },
    {
      username: 'guruzul',
      nama_lengkap: 'Ust. Muhammad Zulkarnain, M.Pd.I',
      email: 'zulkarnain@madrasah.sch.id',
      password_hash: guruPassword,
      role: 'guru',
      staf_role: 'Guru',
      guru_id: guru1?.id || 1,
      is_active: true,
      must_change_password: false,
      permissions: [
        { module: 'akademik', can_view: true, can_create: true, can_edit: true, can_delete: false },
      ],
    },
    {
      username: 'gurusiti',
      nama_lengkap: 'Hj. Siti Fatimah, S.Pd.',
      email: 'fatimah@madrasah.sch.id',
      password_hash: guruPassword,
      role: 'guru',
      staf_role: 'Guru',
      guru_id: guru2?.id || 2,
      is_active: true,
      must_change_password: false,
      permissions: [
        { module: 'akademik', can_view: true, can_create: true, can_edit: true, can_delete: false },
      ],
    },
    {
      username: 'bendahara',
      nama_lengkap: 'Hj. Maryam Fauziah, S.E.',
      email: 'bendahara@madrasah.sch.id',
      password_hash: staffPassword,
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
    },
  ]).onConflictDoNothing();

  // 7. Seed Kelas
  let kelasList: any[] = [];
  if (taAktif?.id) {
    kelasList = await db.insert(schema.kelas).values([
      {
        nama: '7-A',
        tingkat: '7',
        tahun_ajaran_id: taAktif.id,
        wali_kelas_id: guru1?.id || null,
        kapasitas: 32,
      },
      {
        nama: '7-B',
        tingkat: '7',
        tahun_ajaran_id: taAktif.id,
        wali_kelas_id: guru2?.id || null,
        kapasitas: 32,
      },
      {
        nama: '8-A',
        tingkat: '8',
        tahun_ajaran_id: taAktif.id,
        wali_kelas_id: null,
        kapasitas: 32,
      },
      {
        nama: '9-A',
        tingkat: '9',
        tahun_ajaran_id: taAktif.id,
        wali_kelas_id: null,
        kapasitas: 32,
      },
    ]).returning();
  }

  // 8. Seed Siswa
  const kelas7AId = kelasList[0]?.id;
  const kelas7BId = kelasList[1]?.id;
  const [s1, s2, s3, s4] = await db.insert(schema.siswa).values([
    {
      nis: '242507001',
      nisn: '0091234567',
      nama: 'Muhammad Fatih Al-Ayyubi',
      jenis_kelamin: 'L',
      tempat_lahir: 'Bogor',
      tanggal_lahir: '2011-09-14',
      kelas_id: kelas7AId,
      tahun_ajaran_masuk_id: taAktif?.id,
      nama_ayah: 'Dedi Ramadhan',
      nama_ibu: 'Fitri Handayani',
      telepon_ortu: '081211112222',
      alamat: 'Jl. Pemuda No. 12, Bogor',
      status: 'aktif',
    },
    {
      nis: '242507002',
      nisn: '0092345678',
      nama: 'Aisyah Rahmadani',
      jenis_kelamin: 'P',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '2011-04-20',
      kelas_id: kelas7AId,
      tahun_ajaran_masuk_id: taAktif?.id,
      nama_ayah: 'Bambang Supriyanto',
      nama_ibu: 'Ratna Sari',
      telepon_ortu: '081333334444',
      alamat: 'Jl. Sudirman No. 45, Bogor Barat',
      status: 'aktif',
    },
    {
      nis: '242507003',
      nisn: '0093456789',
      nama: 'Rizky Pratama',
      jenis_kelamin: 'L',
      tempat_lahir: 'Sukabumi',
      tanggal_lahir: '2011-12-05',
      kelas_id: kelas7AId,
      tahun_ajaran_masuk_id: taAktif?.id,
      nama_ayah: 'Irfan Hakim',
      nama_ibu: 'Maya Lestari',
      telepon_ortu: '081555556666',
      alamat: 'Jl. Merdeka No. 88, Tanah Sareal',
      status: 'aktif',
    },
    {
      nis: '242507004',
      nisn: '0094857697',
      nama: 'Siti Maryam Al-Khadijah',
      jenis_kelamin: 'P',
      tempat_lahir: 'Bogor',
      tanggal_lahir: '2011-08-11',
      kelas_id: kelas7BId,
      tahun_ajaran_masuk_id: taAktif?.id,
      nama_ayah: 'Ahmad Dahlan',
      nama_ibu: 'Zubaedah',
      telepon_ortu: '081777778888',
      alamat: 'Jl. Pajajaran No. 19, Bogor',
      status: 'aktif',
    },
  ]).returning();

  // 9. Seed Bobot Nilai & Akademik Records
  if (taAktif?.id) {
    await db.insert(schema.bobotNilai).values({
      tahun_ajaran_id: taAktif.id,
      bobot_tugas: 20,
      bobot_uh: 20,
      bobot_uts: 25,
      bobot_uas: 25,
      bobot_keterampilan: 10,
    }).onConflictDoNothing();

    // Penempatan Siswa
    if (kelas7AId && s1 && s2 && s3) {
      await db.insert(schema.penempatanSiswa).values([
        { siswa_id: s1.id, kelas_id: kelas7AId, tahun_ajaran_id: taAktif.id, status: 'aktif', catatan: 'Diterima gelombang 1' },
        { siswa_id: s2.id, kelas_id: kelas7AId, tahun_ajaran_id: taAktif.id, status: 'aktif', catatan: 'Diterima gelombang 1' },
        { siswa_id: s3.id, kelas_id: kelas7AId, tahun_ajaran_id: taAktif.id, status: 'aktif', catatan: 'Diterima gelombang 1' },
      ]).onConflictDoNothing();

      // Absensi contoh
      const today = new Date().toISOString().slice(0, 10);
      await db.insert(schema.absensiSiswa).values([
        { siswa_id: s1.id, kelas_id: kelas7AId, tahun_ajaran_id: taAktif.id, tanggal: today, status: 'H', catatan: 'Tepat waktu' },
        { siswa_id: s2.id, kelas_id: kelas7AId, tahun_ajaran_id: taAktif.id, tanggal: today, status: 'H', catatan: '' },
        { siswa_id: s3.id, kelas_id: kelas7AId, tahun_ajaran_id: taAktif.id, tanggal: today, status: 'S', catatan: 'Flu dan demam' },
      ]).onConflictDoNothing();

      // Catatan Rapor
      await db.insert(schema.catatanRaporSiswa).values({
        siswa_id: s1.id,
        kelas_id: kelas7AId,
        tahun_ajaran_id: taAktif.id,
        sikap_spiritual: 'Sangat Baik',
        deskripsi_spiritual: 'Selalu tertib shalat berjamaah dan berdoa dengan khusyuk.',
        sikap_sosial: 'Sangat Baik',
        deskripsi_sosial: 'Sopan, santun, dan peduli kepada sesama teman.',
        juz_hafalan: 'Juz 30 (An-Naba s.d. An-Nas)',
        surah_terakhir: 'Surah Al-Buruj ayat 1-22',
        predikat_tahfidz: 'Mutqin',
        catatan_wali_kelas: 'Prestasi dan akhlak sangat membanggakan. Pertahankan!',
        status_akhir: 'Naik Kelas',
        naik_ke_kelas: '8-A',
      }).onConflictDoNothing();

      // 10. Seed Jenis Pembayaran & Tarif
      const [posSpp, posGedung, posSeragam] = await db.insert(schema.jenisPembayaran).values([
        {
          nama: 'SPP Bulanan',
          tipe: 'bulanan',
          deskripsi: 'Sumbangan Pembinaan Pendidikan (SPP) rutin per bulan',
          tahun_ajaran_id: taAktif.id,
          is_active: true,
        },
        {
          nama: 'Infaq Pembangunan / Uang Gedung',
          tipe: 'bebas',
          deskripsi: 'Dana pengembangan sarana dan prasarana madrasah (bisa dicicil)',
          tahun_ajaran_id: taAktif.id,
          is_active: true,
        },
        {
          nama: 'Paket Seragam & Kitab Siswa',
          tipe: 'bebas',
          deskripsi: 'Pengadaan seragam dan kitab kuning',
          tahun_ajaran_id: taAktif.id,
          is_active: true,
        },
      ]).returning();

      if (posSpp) {
        await db.insert(schema.tarifPembayaran).values([
          { jenis_pembayaran_id: posSpp.id, tingkat: '7', nominal: '250000' },
          { jenis_pembayaran_id: posSpp.id, tingkat: '8', nominal: '250000' },
          { jenis_pembayaran_id: posSpp.id, tingkat: '9', nominal: '275000' },
          { jenis_pembayaran_id: posGedung.id, tingkat: 'Semua', nominal: '1500000' },
          { jenis_pembayaran_id: posSeragam.id, tingkat: '7', nominal: '750000' },
        ]).onConflictDoNothing();

        // 11. Seed Tagihan Siswa
        const [tagihan1, tagihan2, tagihan3] = await db.insert(schema.tagihanSiswa).values([
          {
            siswa_id: s1.id,
            kelas_id: kelas7AId,
            jenis_pembayaran_id: posSpp.id,
            tahun_ajaran_id: taAktif.id,
            bulan: 'Juli',
            nominal: '250000',
            terbayar: '250000',
            sisa: '0',
            status: 'lunas',
            jatuh_tempo: '2024-07-10',
          },
          {
            siswa_id: s1.id,
            kelas_id: kelas7AId,
            jenis_pembayaran_id: posSpp.id,
            tahun_ajaran_id: taAktif.id,
            bulan: 'Agustus',
            nominal: '250000',
            terbayar: '0',
            sisa: '250000',
            status: 'belum_bayar',
            jatuh_tempo: '2024-08-10',
          },
          {
            siswa_id: s1.id,
            kelas_id: kelas7AId,
            jenis_pembayaran_id: posGedung.id,
            tahun_ajaran_id: taAktif.id,
            bulan: null,
            nominal: '1500000',
            terbayar: '750000',
            sisa: '750000',
            status: 'sebagian',
            jatuh_tempo: '2024-12-31',
          },
        ]).returning();

        // 12. Seed Transaksi Pembayaran
        if (tagihan1) {
          await db.insert(schema.transaksiPembayaran).values([
            {
              nomor_transaksi: 'KWT-202407-0001',
              tagihan_id: tagihan1.id,
              siswa_id: s1.id,
              jumlah_bayar: '250000',
              metode: 'Tunai',
              tanggal_bayar: '2024-07-08',
              catatan: 'Pembayaran SPP Juli di kasir madrasah',
              status: 'valid',
            },
          ]).onConflictDoNothing();
        }
      }
    }
  }

  console.log('✅ Seeding database master, akademik & keuangan selesai!');
}

if (process.argv[1]?.endsWith('seed.ts')) {
  runSeed().catch((err) => {
    console.error('❌ Gagal menjalankan seed:', err);
    process.exit(1);
  });
}
