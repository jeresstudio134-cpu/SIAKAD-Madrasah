// worker/memory-store.ts
// Store in-memory untuk prototipe (AI Studio) tanpa database Neon.
// Meniru method DbStore di worker/store.ts. Data kembali ke awal saat server restart.
import { hashPassword } from './auth.ts';

type Row = Record<string, any>;

function makeTable(seed: Row[] = []) {
  const rows: Row[] = seed.map((r) => ({ created_at: new Date(), updated_at: new Date(), ...r }));
  let seq = rows.reduce((m, r) => Math.max(m, r.id || 0), 0);
  return {
    rows,
    find: (id: number) => rows.find((r) => r.id === id) || null,
    insert: (d: Row) => {
      const r = { created_at: new Date(), updated_at: new Date(), ...d, id: ++seq };
      rows.push(r);
      return r;
    },
    update: (id: number, d: Row) => {
      const r = rows.find((x) => x.id === id);
      if (!r) return null;
      Object.assign(r, d, { updated_at: new Date() });
      return r;
    },
    remove: (id: number) => {
      const i = rows.findIndex((x) => x.id === id);
      if (i < 0) return false;
      rows.splice(i, 1);
      return true;
    },
    removeWhere: (fn: (r: Row) => boolean) => {
      for (let i = rows.length - 1; i >= 0; i--) if (fn(rows[i])) rows.splice(i, 1);
    },
  };
}

function paginate<T>(list: T[], page?: number, limit?: number, def = 20) {
  const p = Math.max(1, Number(page) || 1);
  const l = Math.max(1, Number(limit) || def);
  const total = list.length;
  return {
    items: list.slice((p - 1) * l, p * l),
    pagination: { total, page: p, limit: l, totalPages: Math.ceil(total / l) || 1 },
  };
}

const like = (v: any, q?: string) => !q || String(v ?? '').toLowerCase().includes(q.toLowerCase());
const byNama = (a: Row, b: Row) => String(a.nama).localeCompare(String(b.nama));

function hitungNilai(bobot: Row, i: Row) {
  const t = Number(i.nilai_tugas) || 0;
  const uh = Number(i.nilai_uh) || 0;
  const uts = Number(i.nilai_uts) || 0;
  const uas = Number(i.nilai_uas) || 0;
  const ket = Number(i.nilai_keterampilan) || 0;
  const total = bobot.bobot_tugas + bobot.bobot_uh + bobot.bobot_uts + bobot.bobot_uas + bobot.bobot_keterampilan;
  const akhir = total > 0
    ? Math.round(((t * bobot.bobot_tugas + uh * bobot.bobot_uh + uts * bobot.bobot_uts + uas * bobot.bobot_uas + ket * bobot.bobot_keterampilan) / total) * 100) / 100
    : 0;
  const predikat = akhir >= 90 ? 'A' : akhir >= 80 ? 'B' : akhir >= 70 ? 'C' : 'D';
  return { t, uh, uts, uas, ket, akhir, predikat };
}

export function createMemoryStore(): any {
  const ISO = (d: Date) => d.toISOString().slice(0, 10);

  // ---------- SEED ----------
  const users = makeTable([]);
  let usersReady: Promise<void> | null = null;
  const ensureUsers = () =>
    (usersReady ??= (async () => {
      const seed = async (u: Row, pw: string) =>
        users.insert({
          email: null, is_active: true, must_change_password: false, permissions: null,
          staf_role: null, guru_id: null, ...u, password_hash: await hashPassword(pw),
        });
      await seed({ username: 'admin', nama_lengkap: 'Administrator Madrasah', role: 'admin' }, 'admin123');
      await seed({ username: 'stafftu', nama_lengkap: 'Nurul Hidayati, S.AP', role: 'staf', staf_role: 'TU' }, 'staf123');
      await seed({ username: 'guruzul', nama_lengkap: 'Ust. Muhammad Zulkarnain', role: 'guru', guru_id: 1 }, 'guru123');
    })());

  const ta = makeTable([
    { id: 1, tahun: '2026/2027', semester: 'Ganjil', is_active: true, tanggal_mulai: '2026-07-13', tanggal_selesai: '2026-12-19' },
    { id: 2, tahun: '2026/2027', semester: 'Genap', is_active: false, tanggal_mulai: '2027-01-04', tanggal_selesai: '2027-06-19' },
  ]);

  const guru = makeTable([
    { id: 1, nama: 'Muhammad Zulkarnain', gelar_depan: 'Ust.', gelar_belakang: null, nip: '198001012005011001', nuptk: '1234567890123456', email: 'zul@madrasah.sch.id', jabatan: 'Guru Mapel', status_kepegawaian: 'PNS', is_active: true },
    { id: 2, nama: 'Aisyah Nurani', gelar_depan: 'Ustzh.', gelar_belakang: 'S.Pd', nip: '198505052010012002', nuptk: '1234567890123457', email: 'aisyah@madrasah.sch.id', jabatan: 'Guru Mapel', status_kepegawaian: 'PNS', is_active: true },
    { id: 3, nama: 'Ahmad Fauzi', gelar_depan: 'Ust.', gelar_belakang: 'S.Ag', nip: null, nuptk: '1234567890123458', email: 'fauzi@madrasah.sch.id', jabatan: 'Guru Tahfidz', status_kepegawaian: 'Honorer', is_active: true },
  ]);

  const kelas = makeTable([
    { id: 1, tingkat: '7', nama: '7-A', tahun_ajaran_id: 1, wali_kelas_id: 1, kapasitas: 32 },
    { id: 2, tingkat: '7', nama: '7-B', tahun_ajaran_id: 1, wali_kelas_id: 2, kapasitas: 32 },
    { id: 3, tingkat: '8', nama: '8-A', tahun_ajaran_id: 1, wali_kelas_id: 3, kapasitas: 32 },
  ]);

  const mapel = makeTable([
    { id: 1, kode: 'AQD', nama: 'Akidah Akhlak', kelompok: 'A', kkm: 75 },
    { id: 2, kode: 'FQH', nama: 'Fikih', kelompok: 'A', kkm: 75 },
    { id: 3, kode: 'BIN', nama: 'Bahasa Indonesia', kelompok: 'A', kkm: 75 },
    { id: 4, kode: 'MTK', nama: 'Matematika', kelompok: 'A', kkm: 70 },
    { id: 5, kode: 'BAR', nama: 'Bahasa Arab', kelompok: 'B', kkm: 75 },
  ]);

  const siswa = makeTable([
    { id: 1, nis: '242507002', nisn: '0092345678', nama: 'Aisyah Rahmadani', jenis_kelamin: 'P', tempat_lahir: 'Bogor', tanggal_lahir: '2012-03-14', kelas_id: 1, tahun_ajaran_masuk_id: 1, nama_ayah: 'Rahmad', nama_ibu: 'Siti', nama_wali: null, pekerjaan_ortu: 'Wiraswasta', telepon_ortu: '081234567801', alamat: 'Jl. Melati No. 1', status: 'aktif', foto_url: null },
    { id: 2, nis: '242507003', nisn: '0092345679', nama: 'Ahmad Dahlan Putra', jenis_kelamin: 'L', tempat_lahir: 'Bogor', tanggal_lahir: '2012-08-17', kelas_id: 1, tahun_ajaran_masuk_id: 1, nama_ayah: 'Dahlan', nama_ibu: 'Maryam', nama_wali: null, pekerjaan_ortu: 'PNS', telepon_ortu: '081234567802', alamat: 'Jl. Mawar No. 2', status: 'aktif', foto_url: null },
    { id: 3, nis: '242507004', nisn: '0092345680', nama: 'Khadijah Fitriani', jenis_kelamin: 'P', tempat_lahir: 'Jakarta', tanggal_lahir: '2012-11-25', kelas_id: 2, tahun_ajaran_masuk_id: 1, nama_ayah: 'Fitriyadi', nama_ibu: 'Aisyah', nama_wali: null, pekerjaan_ortu: 'Guru', telepon_ortu: '081234567803', alamat: 'Jl. Kenanga No. 3', status: 'aktif', foto_url: null },
    { id: 4, nis: '242507005', nisn: '0092345681', nama: 'Umar Abdullah', jenis_kelamin: 'L', tempat_lahir: 'Depok', tanggal_lahir: '2012-01-05', kelas_id: 2, tahun_ajaran_masuk_id: 1, nama_ayah: 'Abdullah', nama_ibu: 'Fatimah', nama_wali: null, pekerjaan_ortu: 'Pedagang', telepon_ortu: '081234567804', alamat: 'Jl. Anggrek No. 4', status: 'aktif', foto_url: null },
    { id: 5, nis: '232507001', nisn: '0082345682', nama: 'Zainab Salsabila', jenis_kelamin: 'P', tempat_lahir: 'Bekasi', tanggal_lahir: '2011-06-30', kelas_id: 3, tahun_ajaran_masuk_id: 1, nama_ayah: 'Salim', nama_ibu: 'Nur', nama_wali: null, pekerjaan_ortu: 'Karyawan', telepon_ortu: '081234567805', alamat: 'Jl. Dahlia No. 5', status: 'aktif', foto_url: null },
    { id: 6, nis: '232507002', nisn: '0082345683', nama: 'Yusuf Maulana', jenis_kelamin: 'L', tempat_lahir: 'Bogor', tanggal_lahir: '2011-09-09', kelas_id: null, tahun_ajaran_masuk_id: 1, nama_ayah: 'Maulana', nama_ibu: 'Halimah', nama_wali: null, pekerjaan_ortu: 'Petani', telepon_ortu: '081234567806', alamat: 'Jl. Flamboyan No. 6', status: 'aktif', foto_url: null },
  ]);

  const penempatan = makeTable(
    siswa.rows.filter((s) => s.kelas_id).map((s) => ({ siswa_id: s.id, kelas_id: s.kelas_id, tahun_ajaran_id: 1, status: 'aktif', catatan: null }))
  );

  const pengajaran = makeTable([
    { guru_id: 1, mapel_id: 1, kelas_id: 1, tahun_ajaran_id: 1, beban_jp: 2 },
    { guru_id: 1, mapel_id: 2, kelas_id: 2, tahun_ajaran_id: 1, beban_jp: 2 },
    { guru_id: 2, mapel_id: 3, kelas_id: 1, tahun_ajaran_id: 1, beban_jp: 4 },
    { guru_id: 2, mapel_id: 4, kelas_id: 2, tahun_ajaran_id: 1, beban_jp: 4 },
  ]);

  const jadwal = makeTable([
    { tahun_ajaran_id: 1, kelas_id: 1, mapel_id: 1, guru_id: 1, hari: 'Senin', jam_ke: 1, jam_mulai: '07:00', jam_selesai: '07:40', ruang: 'R-01' },
    { tahun_ajaran_id: 1, kelas_id: 1, mapel_id: 3, guru_id: 2, hari: 'Senin', jam_ke: 2, jam_mulai: '07:40', jam_selesai: '08:20', ruang: 'R-01' },
    { tahun_ajaran_id: 1, kelas_id: 2, mapel_id: 4, guru_id: 2, hari: 'Selasa', jam_ke: 1, jam_mulai: '07:00', jam_selesai: '07:40', ruang: 'R-02' },
  ]);

  const bobot = makeTable([
    { tahun_ajaran_id: 1, bobot_tugas: 20, bobot_uh: 20, bobot_uts: 25, bobot_uas: 25, bobot_keterampilan: 10 },
  ]);

  const nilai = makeTable([]);
  [[1, 88, 90, 85, 92, 90], [2, 80, 78, 82, 85, 80], [3, 92, 95, 90, 94, 93]].forEach(([mid, t, uh, uts, uas, ket]) => {
    const h = hitungNilai(bobot.rows[0], { nilai_tugas: t, nilai_uh: uh, nilai_uts: uts, nilai_uas: uas, nilai_keterampilan: ket });
    nilai.insert({ siswa_id: 1, mapel_id: mid, kelas_id: 1, tahun_ajaran_id: 1, nilai_tugas: String(t), nilai_uh: String(uh), nilai_uts: String(uts), nilai_uas: String(uas), nilai_keterampilan: String(ket), nilai_akhir: String(h.akhir), predikat: h.predikat, catatan: null });
  });

  const catatan = makeTable([
    { siswa_id: 1, kelas_id: 1, tahun_ajaran_id: 1, sikap_spiritual: 'Baik', deskripsi_spiritual: 'Menunjukkan ketaatan beribadah dan akhlak terpuji.', sikap_sosial: 'Baik', deskripsi_sosial: 'Menunjukkan kepedulian sosial, sopan santun, dan kerja sama yang baik.', juz_hafalan: 'Juz 30', surah_terakhir: 'An-Naba', predikat_tahfidz: 'Jayyid', catatan_wali_kelas: 'Pertahankan prestasimu.', status_akhir: 'Belum Ditentukan', naik_ke_kelas: null },
  ]);

  const absensi = makeTable([]);
  ['2026-08-03', '2026-08-04', '2026-08-05', '2026-09-07', '2026-09-08'].forEach((tgl, di) => {
    siswa.rows.filter((s) => s.kelas_id === 1).forEach((s, si) => {
      const st = di === 1 && si === 0 ? 'S' : di === 3 && si === 1 ? 'I' : 'H';
      absensi.insert({ siswa_id: s.id, kelas_id: 1, tahun_ajaran_id: 1, tanggal: tgl, status: st, catatan: null, created_by_user_id: null });
    });
  });

  const jenis = makeTable([
    { id: 1, nama: 'SPP Bulanan', tipe: 'bulanan', tahun_ajaran_id: 1, deskripsi: 'Iuran bulanan' },
    { id: 2, nama: 'Uang Gedung', tipe: 'sekali', tahun_ajaran_id: 1, deskripsi: 'Uang pangkal' },
  ]);
  const tarif = makeTable([
    { jenis_pembayaran_id: 1, tingkat: 'Semua', kelas_id: null, nominal: '250000' },
    { jenis_pembayaran_id: 2, tingkat: 'Semua', kelas_id: null, nominal: '1500000' },
  ]);
  const tagihan = makeTable([]);
  [['Agustus', 1], ['September', 1], ['Agustus', 2]].forEach(([b, sid]) =>
    tagihan.insert({ siswa_id: sid, kelas_id: 1, jenis_pembayaran_id: 1, tahun_ajaran_id: 1, bulan: b, nominal: '250000', terbayar: '0', sisa: '250000', status: 'belum_bayar', jatuh_tempo: '2026-09-10' })
  );
  const transaksi = makeTable([]);

  const ppdb = makeTable([
    { nomor_pendaftaran: 'PPDB-2026-0001', tahun_ajaran_id: 1, jalur_pendaftaran: 'Reguler', nama_lengkap: 'Hafidz Ramadhan', nisn: '0112345678', nik: null, jenis_kelamin: 'L', tempat_lahir: 'Bogor', tanggal_lahir: '2014-04-02', sekolah_asal: 'SDN 1 Bogor', nama_ayah: 'Ramadhan', nama_ibu: 'Laila', telepon_ortu: '081300000001', email_ortu: null, alamat: 'Jl. Cempaka 7', berkas_foto_url: null, berkas_ijazah_url: null, berkas_akta_url: null, berkas_kk_url: null, status: 'menunggu_verifikasi', catatan_verifikasi: null, verified_by_user_id: null, verified_at: null, is_converted: false, converted_siswa_id: null },
    { nomor_pendaftaran: 'PPDB-2026-0002', tahun_ajaran_id: 1, jalur_pendaftaran: 'Tahfidz', nama_lengkap: 'Maryam Azzahra', nisn: '0112345679', nik: null, jenis_kelamin: 'P', tempat_lahir: 'Depok', tanggal_lahir: '2014-07-21', sekolah_asal: 'MI Al-Hidayah', nama_ayah: 'Azzam', nama_ibu: 'Sarah', telepon_ortu: '081300000002', email_ortu: null, alamat: 'Jl. Teratai 3', berkas_foto_url: null, berkas_ijazah_url: null, berkas_akta_url: null, berkas_kk_url: null, status: 'diterima', catatan_verifikasi: 'Lengkap', verified_by_user_id: 1, verified_at: new Date(), is_converted: false, converted_siswa_id: null },
  ]);

  const pengumuman = makeTable([
    { judul: 'Penerimaan Rapor Semester Ganjil', konten: 'Pembagian rapor dilaksanakan 20 Desember 2026.', kategori: 'Akademik', target_audiens: 'Semua', is_pinned: true, is_published: true, created_by_user_id: 1 },
    { judul: 'Libur Maulid Nabi', konten: 'Kegiatan belajar diliburkan.', kategori: 'Umum', target_audiens: 'Semua', is_pinned: false, is_published: true, created_by_user_id: 1 },
  ]);
  const kalender = makeTable([
    { tahun_ajaran_id: 1, judul_kegiatan: 'Ujian Tengah Semester', deskripsi: 'UTS Ganjil', tanggal_mulai: '2026-09-21', tanggal_selesai: '2026-09-25', kategori: 'Ujian' },
    { tahun_ajaran_id: 1, judul_kegiatan: 'Ujian Akhir Semester', deskripsi: 'UAS Ganjil', tanggal_mulai: '2026-12-07', tanggal_selesai: '2026-12-12', kategori: 'Ujian' },
  ]);
  const audit = makeTable([]);
  let profile: Row | null = {
    id: 1, nama: 'Madrasah Islamiyah Al Munawwariyyah', nsm: '121232010001', npsn: '20105432',
    alamat: 'Jl. Pendidikan Karakter No. 45, Kompleks Islamic Centre', telepon: '0251-8321456',
    email: 'info@mtsn1teladan.sch.id', logo_url: '', kepala_madrasah: 'Dr. H. Abdul Karim, M.Pd', nip_kepala: '197001011995031001',
  };

  // ---------- HELPERS ----------
  const kelasObj = (id: number | null) => {
    const k = id ? kelas.find(id) : null;
    return k ? { id: k.id, nama: k.nama, tingkat: k.tingkat } : null;
  };
  const siswaView = (s: Row) => {
    const k = s.kelas_id ? kelas.find(s.kelas_id) : null;
    const t = s.tahun_ajaran_masuk_id ? ta.find(s.tahun_ajaran_masuk_id) : null;
    return {
      ...s, kelas_nama: k?.nama ?? null, kelas_tingkat: k?.tingkat ?? null, ta_tahun: t?.tahun ?? null,
      kelas: k ? { id: k.id, nama: k.nama, tingkat: k.tingkat } : null,
      tahun_ajaran_masuk: t ? { id: t.id, tahun: t.tahun } : null,
    };
  };
  const activeTa = () => ta.rows.find((t) => t.is_active) || [...ta.rows].sort((a, b) => b.id - a.id)[0] || null;
  const siswaDiKelas = (kelas_id: number, tahun_ajaran_id: number) => {
    const p = penempatan.rows.filter((x) => x.kelas_id === kelas_id && x.tahun_ajaran_id === tahun_ajaran_id).map((x) => siswa.find(x.siswa_id)).filter(Boolean) as Row[];
    const list = p.length ? p : siswa.rows.filter((s) => s.kelas_id === kelas_id && s.status === 'aktif');
    return [...list].sort(byNama).map((s) => ({ siswa_id: s.id, nama: s.nama, nis: s.nis, jenis_kelamin: s.jenis_kelamin }));
  };
  const kelasView = (k: Row) => {
    const w = k.wali_kelas_id ? guru.find(k.wali_kelas_id) : null;
    const t = k.tahun_ajaran_id ? ta.find(k.tahun_ajaran_id) : null;
    return {
      ...k,
      total_siswa: siswa.rows.filter((s) => s.kelas_id === k.id && s.status === 'aktif').length,
      wali_kelas: w ? { id: w.id, nama: w.nama, nip: w.nip, gelar_depan: w.gelar_depan, gelar_belakang: w.gelar_belakang } : null,
      tahun_ajaran: t ? { id: t.id, tahun: t.tahun, semester: t.semester } : null,
    };
  };
  const jenisView = (j: Row) => ({
    ...j,
    tarifList: tarif.rows.filter((t) => t.jenis_pembayaran_id === j.id).map((t) => ({
      ...t, nominal: Number(t.nominal), kelas: t.kelas_id ? { id: t.kelas_id, nama: kelas.find(t.kelas_id)?.nama } : null,
    })),
  });
  const tagihanView = (t: Row) => {
    const s = siswa.find(t.siswa_id); const k = kelas.find(t.kelas_id); const j = jenis.find(t.jenis_pembayaran_id);
    return {
      ...t, nominal: Number(t.nominal), terbayar: Number(t.terbayar), sisa: Number(t.sisa),
      siswa_nama: s?.nama, siswa_nis: s?.nis, kelas_nama: k?.nama, jenis_nama: j?.nama, jenis_tipe: j?.tipe,
      siswa: { id: t.siswa_id, nama: s?.nama, nis: s?.nis },
      kelas: { id: t.kelas_id, nama: k?.nama },
      jenisPembayaran: { id: t.jenis_pembayaran_id, nama: j?.nama, tipe: j?.tipe },
    };
  };
  const txView = (x: Row) => {
    const tg = tagihan.find(x.tagihan_id); const s = siswa.find(x.siswa_id);
    const k = tg ? kelas.find(tg.kelas_id) : null; const j = tg ? jenis.find(tg.jenis_pembayaran_id) : null;
    const u = x.created_by_user_id ? users.find(x.created_by_user_id) : null;
    return {
      ...x, jumlah_bayar: Number(x.jumlah_bayar), nominal_tagihan: Number(tg?.nominal || 0),
      siswa_nama: s?.nama, siswa_nis: s?.nis, kelas_nama: k?.nama, jenis_nama: j?.nama, bulan: tg?.bulan, kasir_nama: u?.nama_lengkap,
      siswa: { id: x.siswa_id, nama: s?.nama, nis: s?.nis }, kelas: { nama: k?.nama },
      tagihan: { jenis_nama: j?.nama, bulan: tg?.bulan }, kasir: { nama: u?.nama_lengkap },
    };
  };
  const authorView = (p: Row) => {
    const u = p.created_by_user_id ? users.find(p.created_by_user_id) : null;
    return { ...p, author: u ? { id: u.id, nama_lengkap: u.nama_lengkap } : null };
  };
  const ppdbStats = (tahun_ajaran_id?: number) => {
    const list = ppdb.rows.filter((p) => !tahun_ajaran_id || p.tahun_ajaran_id === tahun_ajaran_id);
    const c = (st: string) => list.filter((p) => p.status === st).length;
    const j = (x: string) => list.filter((p) => p.jalur_pendaftaran === x).length;
    return {
      total: list.length, menunggu: c('menunggu_verifikasi'), terverifikasi: c('terverifikasi'), diterima: c('diterima'),
      ditolak: c('ditolak'), cadangan: c('cadangan'), dikonversi: list.filter((p) => p.is_converted).length,
      jalur: { Reguler: j('Reguler'), Prestasi: j('Prestasi'), Afirmasi: j('Afirmasi'), Tahfidz: j('Tahfidz') },
    };
  };
  const guruScope = (guru_id: number, tahun_ajaran_id: number) => {
    const waliKelasIds = kelas.rows.filter((k) => k.wali_kelas_id === guru_id).map((k) => k.id);
    const ajar = pengajaran.rows.filter((p) => p.guru_id === guru_id && p.tahun_ajaran_id === tahun_ajaran_id);
    return {
      allowedKelasIds: Array.from(new Set([...waliKelasIds, ...ajar.map((a) => a.kelas_id)])),
      taughtMapelIds: Array.from(new Set(ajar.map((a) => a.mapel_id))),
      waliKelasIds,
    };
  };
  const jadwalConflict = (d: Row, excludeId?: number) => {
    const same = (j: Row) => j.id !== excludeId && j.tahun_ajaran_id === d.tahun_ajaran_id && j.hari === d.hari && j.jam_ke === d.jam_ke;
    if (jadwal.rows.some((j) => same(j) && j.guru_id === d.guru_id)) return { conflict: true, reason: 'Guru sudah mengajar di kelas lain pada jam dan hari ini.' };
    if (jadwal.rows.some((j) => same(j) && j.kelas_id === d.kelas_id)) return { conflict: true, reason: 'Kelas ini sudah memiliki jadwal mata pelajaran lain pada jam ini.' };
    return { conflict: false } as any;
  };
  const nextNomor = (prefix: string, list: Row[], key: string) => {
    const nums = list.filter((r) => String(r[key]).startsWith(prefix)).map((r) => parseInt(String(r[key]).split('-').pop() || '0', 10) || 0);
    return `${prefix}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
  };

  // ---------- STORE ----------
  return {
    // 0. Audit
    async createAuditLog(d: Row) { audit.insert({ user_id: null, details: null, ip_address: null, ...d }); },
    async getAuditLogs(p: Row) {
      const list = audit.rows
        .filter((a) => (!p.entity || a.entity === p.entity) && (!p.action || a.action === p.action) && (!p.user_id || a.user_id === p.user_id) && (!p.search || like(a.details, p.search) || like(a.username, p.search)))
        .sort((a, b) => b.id - a.id);
      return paginate(list, p.page, p.limit, 20);
    },

    // 1. Profil
    async getMadrasahProfile() { return profile; },
    async updateMadrasahProfile(d: Row) { profile = { ...(profile || { id: 1 }), ...d, updated_at: new Date() }; return profile; },

    // 2. Users
    async getUserByUsername(u: string) { await ensureUsers(); return users.rows.find((x) => x.username === u) || null; },
    async getUserById(id: number) { await ensureUsers(); return users.find(id); },
    async getAllStaf() {
      await ensureUsers();
      return [...users.rows].sort((a, b) => String(a.nama_lengkap).localeCompare(String(b.nama_lengkap))).map((u) => {
        const { password_hash, ...rest } = u;
        const g = u.guru_id ? guru.find(u.guru_id) : null;
        return { ...rest, guru_nama: g?.nama ?? null, guru: g ? { id: g.id, nama: g.nama } : null };
      });
    },
    async createUser(d: Row) { await ensureUsers(); return users.insert({ is_active: true, must_change_password: false, permissions: null, ...d }); },
    async updateUser(id: number, d: Row) { await ensureUsers(); return users.update(id, d); },
    async deleteUser(id: number) { await ensureUsers(); return users.remove(id); },

    // 3. Tahun ajaran
    async getTahunAjaranList() { return [...ta.rows].sort((a, b) => b.id - a.id); },
    async getActiveTahunAjaran() { return activeTa(); },
    async getTahunAjaranById(id: number) { return ta.find(id); },
    async createTahunAjaran(d: Row) { if (d.is_active) ta.rows.forEach((t) => (t.is_active = false)); return ta.insert(d); },
    async updateTahunAjaran(id: number, d: Row) { if (d.is_active) ta.rows.forEach((t) => (t.is_active = false)); return ta.update(id, d); },
    async deleteTahunAjaran(id: number) { return ta.remove(id); },

    // 4. Kelas
    async getKelasList(p: Row) {
      const list = kelas.rows
        .filter((k) => (!p.tingkat || p.tingkat === 'Semua' || String(k.tingkat) === String(p.tingkat)) && like(k.nama, p.search))
        .sort((a, b) => String(a.tingkat).localeCompare(String(b.tingkat)) || String(a.nama).localeCompare(String(b.nama)));
      const r = paginate(list, p.page, p.limit, 20);
      return { ...r, items: r.items.map(kelasView) };
    },
    async getAllKelasSimple() {
      return [...kelas.rows].sort((a, b) => String(a.tingkat).localeCompare(String(b.tingkat)) || String(a.nama).localeCompare(String(b.nama)))
        .map((k) => ({ id: k.id, nama: k.nama, tingkat: k.tingkat, tahun_ajaran_id: k.tahun_ajaran_id, wali_kelas_id: k.wali_kelas_id }));
    },
    async getKelasById(id: number) { const k = kelas.find(id); return k ? kelasView(k) : null; },
    async createKelas(d: Row) { return kelas.insert(d); },
    async updateKelas(id: number, d: Row) { return kelas.update(id, d); },
    async deleteKelas(id: number) { return kelas.remove(id); },

    // 5. Mapel
    async getMapelList(p: Row) {
      const list = mapel.rows.filter((m) => (!p.kelompok || p.kelompok === 'Semua' || m.kelompok === p.kelompok) && (!p.search || like(m.nama, p.search) || like(m.kode, p.search)))
        .sort((a, b) => String(a.kode).localeCompare(String(b.kode)));
      return paginate(list, p.page, p.limit, 20);
    },
    async getAllMapelSimple() { return [...mapel.rows].sort(byNama); },
    async getMapelById(id: number) { return mapel.find(id); },
    async createMapel(d: Row) { return mapel.insert(d); },
    async updateMapel(id: number, d: Row) { return mapel.update(id, d); },
    async deleteMapel(id: number) { return mapel.remove(id); },

    // 6. Guru
    async getGuruList(p: Row) {
      const list = guru.rows.filter((g) =>
        (p.status === 'aktif' ? g.is_active : p.status === 'nonaktif' ? !g.is_active : true) &&
        (!p.search || like(g.nama, p.search) || like(g.nip, p.search) || like(g.nuptk, p.search) || like(g.email, p.search))
      ).sort(byNama);
      return paginate(list, p.page, p.limit, 20);
    },
    async getAllGuruSimple() {
      return guru.rows.filter((g) => g.is_active).sort(byNama)
        .map((g) => ({ id: g.id, nama: g.nama, nip: g.nip, gelar_depan: g.gelar_depan, gelar_belakang: g.gelar_belakang, jabatan: g.jabatan }));
    },
    async getGuruById(id: number) { return guru.find(id); },
    async createGuru(d: Row) { return guru.insert({ is_active: true, ...d }); },
    async updateGuru(id: number, d: Row) { return guru.update(id, d); },
    async deleteGuru(id: number) { return guru.remove(id); },

    // 7. Siswa
    async getSiswaList(p: Row) {
      const list = siswa.rows.filter((s) =>
        (!p.kelas_id || s.kelas_id === p.kelas_id) && (!p.status || p.status === 'semua' || s.status === p.status) &&
        (!p.search || like(s.nama, p.search) || like(s.nis, p.search) || like(s.nisn, p.search))
      ).sort(byNama);
      const r = paginate(list, p.page, p.limit, 20);
      return { ...r, items: r.items.map(siswaView) };
    },
    async getAllSiswaForExport(p: Row) {
      return siswa.rows.filter((s) => (!p.kelas_id || s.kelas_id === p.kelas_id) && (!p.status || p.status === 'semua' || s.status === p.status)).sort(byNama).map(siswaView);
    },
    async getSiswaById(id: number) { const s = siswa.find(id); return s ? siswaView(s) : null; },
    async createSiswa(d: Row) {
      const c = siswa.insert(d); const t = activeTa();
      if (c.kelas_id && t) penempatan.insert({ siswa_id: c.id, kelas_id: c.kelas_id, tahun_ajaran_id: t.id, status: 'aktif', catatan: null });
      return c;
    },
    async batchCreateSiswa(list: Row[]) { const out: Row[] = []; for (const d of list) out.push(await this.createSiswa(d)); return out; },
    async updateSiswa(id: number, d: Row) { return siswa.update(id, d); },
    async deleteSiswa(id: number) { return siswa.remove(id); },

    // 8. Penempatan
    async getPenempatanList(p: Row) {
      return penempatan.rows.filter((x) => x.tahun_ajaran_id === p.tahun_ajaran_id && (!p.kelas_id || x.kelas_id === p.kelas_id))
        .map((x) => ({ x, s: siswa.find(x.siswa_id), k: kelas.find(x.kelas_id) })).filter((r) => r.s && r.k)
        .sort((a, b) => byNama(a.s!, b.s!))
        .map(({ x, s, k }) => ({
          id: x.id, siswa_id: x.siswa_id, kelas_id: x.kelas_id, tahun_ajaran_id: x.tahun_ajaran_id, status: x.status, catatan: x.catatan, created_at: x.created_at,
          siswa: { id: s!.id, nama: s!.nama, nis: s!.nis, nisn: s!.nisn, jenis_kelamin: s!.jenis_kelamin },
          kelas: { id: k!.id, nama: k!.nama, tingkat: k!.tingkat },
        }));
    },
    async getSiswaTanpaKelas(tahun_ajaran_id: number) {
      const assigned = new Set(penempatan.rows.filter((x) => x.tahun_ajaran_id === tahun_ajaran_id).map((x) => x.siswa_id));
      return siswa.rows.filter((s) => s.status === 'aktif' && !assigned.has(s.id)).sort(byNama)
        .map((s) => ({ id: s.id, nis: s.nis, nisn: s.nisn, nama: s.nama, jenis_kelamin: s.jenis_kelamin }));
    },
    async batchTempatkanSiswa(siswa_ids: number[], kelas_id: number, tahun_ajaran_id: number) {
      if (!siswa_ids.length) return { count: 0 };
      penempatan.removeWhere((x) => siswa_ids.includes(x.siswa_id) && x.tahun_ajaran_id === tahun_ajaran_id);
      siswa_ids.forEach((sid) => { penempatan.insert({ siswa_id: sid, kelas_id, tahun_ajaran_id, status: 'aktif', catatan: null }); siswa.update(sid, { kelas_id }); });
      return { count: siswa_ids.length };
    },
    async batchKenaikanKelas(p: Row) {
      let n = 0;
      for (const sid of p.siswa_ids) {
        penempatan.rows.filter((x) => x.siswa_id === sid && x.tahun_ajaran_id === p.tahun_ajaran_asal_id).forEach((x) => (x.status = p.status));
        penempatan.removeWhere((x) => x.siswa_id === sid && x.tahun_ajaran_id === p.tahun_ajaran_tujuan_id);
        penempatan.insert({ siswa_id: sid, kelas_id: p.kelas_tujuan_id, tahun_ajaran_id: p.tahun_ajaran_tujuan_id, status: 'aktif', catatan: null });
        siswa.update(sid, { kelas_id: p.kelas_tujuan_id }); n++;
      }
      return { count: n };
    },
    async batchKelulusan(siswa_ids: number[], tahun_ajaran_id: number) {
      siswa_ids.forEach((sid) => {
        penempatan.rows.filter((x) => x.siswa_id === sid && x.tahun_ajaran_id === tahun_ajaran_id).forEach((x) => (x.status = 'lulus'));
        siswa.update(sid, { status: 'lulus', kelas_id: null });
      });
      return { count: siswa_ids.length };
    },

    // 9. Pengajaran
    async getPengajaranList(p: Row) {
      return pengajaran.rows.filter((x) => (!p.tahun_ajaran_id || x.tahun_ajaran_id === p.tahun_ajaran_id) && (!p.guru_id || x.guru_id === p.guru_id) && (!p.kelas_id || x.kelas_id === p.kelas_id) && (!p.mapel_id || x.mapel_id === p.mapel_id))
        .map((x) => {
          const g = guru.find(x.guru_id), m = mapel.find(x.mapel_id), k = kelas.find(x.kelas_id), t = ta.find(x.tahun_ajaran_id);
          if (!g || !m || !k || !t) return null;
          return { id: x.id, guru_id: x.guru_id, mapel_id: x.mapel_id, kelas_id: x.kelas_id, tahun_ajaran_id: x.tahun_ajaran_id, beban_jp: x.beban_jp, created_at: x.created_at,
            guru: { id: g.id, nama: g.nama, nip: g.nip }, mapel: { id: m.id, nama: m.nama, kode: m.kode }, kelas: { id: k.id, nama: k.nama, tingkat: k.tingkat }, tahun_ajaran: { id: t.id, tahun: t.tahun } };
        }).filter(Boolean);
    },
    async createPengajaran(d: Row) { return pengajaran.insert(d); },
    async deletePengajaran(id: number) { return pengajaran.remove(id); },
    async setWaliKelas(kelas_id: number, guru_id: number | null) { return kelas.update(kelas_id, { wali_kelas_id: guru_id }); },
    async getGuruAccessScope(guru_id: number, tahun_ajaran_id: number) { return guruScope(guru_id, tahun_ajaran_id); },

    // 10. Jadwal
    async getJadwalList(p: Row) {
      return jadwal.rows.filter((j) => (!p.tahun_ajaran_id || j.tahun_ajaran_id === p.tahun_ajaran_id) && (!p.kelas_id || j.kelas_id === p.kelas_id) && (!p.guru_id || j.guru_id === p.guru_id) && (!p.hari || p.hari === 'Semua' || j.hari === p.hari))
        .map((j) => {
          const m = mapel.find(j.mapel_id), g = guru.find(j.guru_id), k = kelas.find(j.kelas_id);
          if (!m || !g || !k) return null;
          return { ...j, mapel: { id: m.id, nama: m.nama, kode: m.kode }, guru: { id: g.id, nama: g.nama, nip: g.nip }, kelas: { id: k.id, nama: k.nama } };
        }).filter(Boolean).sort((a: any, b: any) => String(a.hari).localeCompare(String(b.hari)) || a.jam_ke - b.jam_ke);
    },
    async checkJadwalConflict(d: Row, excludeId?: number) { return jadwalConflict(d, excludeId); },
    async createJadwal(d: Row) { const c = jadwalConflict(d); if (c.conflict) throw new Error(c.reason); return jadwal.insert(d); },
    async updateJadwal(id: number, d: Row) { const c = jadwalConflict(d, id); if (c.conflict) throw new Error(c.reason); return jadwal.update(id, d); },
    async deleteJadwal(id: number) { return jadwal.remove(id); },

    // 11. Absensi
    async getAbsensiByTanggal(kelas_id: number, tanggal: string, tahun_ajaran_id: number) {
      return siswaDiKelas(kelas_id, tahun_ajaran_id).map((s) => {
        const e = absensi.rows.find((a) => a.siswa_id === s.siswa_id && a.kelas_id === kelas_id && a.tanggal === tanggal && a.tahun_ajaran_id === tahun_ajaran_id);
        return { siswa: { id: s.siswa_id, nama: s.nama, nis: s.nis, jenis_kelamin: s.jenis_kelamin }, ...s, status: e?.status || 'H', catatan: e?.catatan || '' };
      });
    },
    async saveBatchAbsensi(kelas_id: number, tanggal: string, tahun_ajaran_id: number, items: Row[], created_by_user_id?: number) {
      if (!items.length) return { success: true, count: 0 };
      const ids = items.map((i) => i.siswa_id);
      absensi.removeWhere((a) => a.kelas_id === kelas_id && a.tanggal === tanggal && a.tahun_ajaran_id === tahun_ajaran_id && ids.includes(a.siswa_id));
      items.forEach((i) => absensi.insert({ siswa_id: i.siswa_id, kelas_id, tahun_ajaran_id, tanggal, status: i.status, catatan: i.catatan || null, created_by_user_id: created_by_user_id || null }));
      return { success: true, count: items.length };
    },
    async getRekapAbsensi(kelas_id: number, tahun_ajaran_id: number, bulan?: string) {
      const all = absensi.rows.filter((a) => a.kelas_id === kelas_id && a.tahun_ajaran_id === tahun_ajaran_id && (!bulan || String(a.tanggal).startsWith(bulan)));
      return siswaDiKelas(kelas_id, tahun_ajaran_id).map((s) => {
        const r = all.filter((a) => a.siswa_id === s.siswa_id);
        const n = (st: string) => r.filter((x) => x.status === st).length;
        const hadir = n('H'), izin = n('I'), sakit = n('S'), alpa = n('A'), total = hadir + izin + sakit + alpa;
        return { siswa_id: s.siswa_id, nama: s.nama, nis: s.nis, hadir, izin, sakit, alpa, total, persentase: total ? Math.round((hadir / total) * 100) : 100 };
      });
    },

    // 12. Bobot & nilai
    async getBobotNilai(tahun_ajaran_id: number) {
      return bobot.rows.find((b) => b.tahun_ajaran_id === tahun_ajaran_id) || { tahun_ajaran_id, bobot_tugas: 20, bobot_uh: 20, bobot_uts: 25, bobot_uas: 25, bobot_keterampilan: 10 };
    },
    async saveBobotNilai(tahun_ajaran_id: number, d: Row) {
      const e = bobot.rows.find((b) => b.tahun_ajaran_id === tahun_ajaran_id);
      return e ? bobot.update(e.id, d) : bobot.insert({ tahun_ajaran_id, ...d });
    },
    async getNilaiByKelasMapel(kelas_id: number, mapel_id: number, tahun_ajaran_id: number) {
      return siswaDiKelas(kelas_id, tahun_ajaran_id).map((s) => {
        const e = nilai.rows.find((n) => n.siswa_id === s.siswa_id && n.kelas_id === kelas_id && n.mapel_id === mapel_id && n.tahun_ajaran_id === tahun_ajaran_id);
        const num = (k: string) => (e ? Number(e[k]) : 0);
        return { siswa: { id: s.siswa_id, nama: s.nama, nis: s.nis }, siswa_id: s.siswa_id, nama: s.nama, nis: s.nis,
          nilai_tugas: num('nilai_tugas'), nilai_uh: num('nilai_uh'), nilai_uts: num('nilai_uts'), nilai_uas: num('nilai_uas'),
          nilai_keterampilan: num('nilai_keterampilan'), nilai_akhir: num('nilai_akhir'), predikat: e?.predikat || 'C', catatan: e?.catatan || '' };
      });
    },
    async saveBatchNilai(kelas_id: number, mapel_id: number, tahun_ajaran_id: number, items: Row[]) {
      const b = await this.getBobotNilai(tahun_ajaran_id);
      for (const it of items) {
        const h = hitungNilai(b, it);
        const data = { nilai_tugas: String(h.t), nilai_uh: String(h.uh), nilai_uts: String(h.uts), nilai_uas: String(h.uas), nilai_keterampilan: String(h.ket), nilai_akhir: String(h.akhir), predikat: h.predikat, catatan: it.catatan || null };
        const e = nilai.rows.find((n) => n.siswa_id === it.siswa_id && n.mapel_id === mapel_id && n.kelas_id === kelas_id && n.tahun_ajaran_id === tahun_ajaran_id);
        if (e) nilai.update(e.id, data); else nilai.insert({ siswa_id: it.siswa_id, mapel_id, kelas_id, tahun_ajaran_id, ...data });
      }
      return { success: true, count: items.length };
    },

    // 13. Catatan rapor & rapor lengkap
    async getCatatanRaporByKelas(kelas_id: number, tahun_ajaran_id: number) {
      return siswaDiKelas(kelas_id, tahun_ajaran_id).map((s) => {
        const c = catatan.rows.find((x) => x.siswa_id === s.siswa_id && x.kelas_id === kelas_id && x.tahun_ajaran_id === tahun_ajaran_id);
        return { siswa: { id: s.siswa_id, nama: s.nama, nis: s.nis }, siswa_id: s.siswa_id, nama: s.nama, nis: s.nis,
          sikap_spiritual: c?.sikap_spiritual || 'Baik', deskripsi_spiritual: c?.deskripsi_spiritual || '', sikap_sosial: c?.sikap_sosial || 'Baik', deskripsi_sosial: c?.deskripsi_sosial || '',
          juz_hafalan: c?.juz_hafalan || '', surah_terakhir: c?.surah_terakhir || '', predikat_tahfidz: c?.predikat_tahfidz || 'Jayyid',
          catatan_wali_kelas: c?.catatan_wali_kelas || '', status_akhir: c?.status_akhir || 'Belum Ditentukan', naik_ke_kelas: c?.naik_ke_kelas || '' };
      });
    },
    async saveCatatanRapor(kelas_id: number, tahun_ajaran_id: number, items: Row[]) {
      items.forEach((it) => {
        const e = catatan.rows.find((x) => x.siswa_id === it.siswa_id && x.kelas_id === kelas_id && x.tahun_ajaran_id === tahun_ajaran_id);
        if (e) catatan.update(e.id, it); else catatan.insert({ kelas_id, tahun_ajaran_id, ...it });
      });
      return { success: true, count: items.length };
    },
    async getRaporLengkap(siswa_id: number, tahun_ajaran_id: number) {
      const s = await this.getSiswaById(siswa_id);
      if (!s) return null;
      const t = ta.find(tahun_ajaran_id) || activeTa();
      const k = s.kelas_id ? await this.getKelasById(s.kelas_id) : null;
      const wali = k?.wali_kelas_id ? guru.find(k.wali_kelas_id) : null;
      const nl = nilai.rows.filter((n) => n.siswa_id === siswa_id && n.tahun_ajaran_id === tahun_ajaran_id)
        .map((n) => ({ n, m: mapel.find(n.mapel_id) })).filter((r) => r.m).sort((a, b) => String(a.m!.kode).localeCompare(String(b.m!.kode)))
        .map(({ n, m }) => ({
          mapel_id: n.mapel_id, nama: m!.nama, kode: m!.kode, kelompok: m!.kelompok, kkm: Number(m!.kkm) || 75,
          nilai_tugas: Number(n.nilai_tugas), nilai_uh: Number(n.nilai_uh), nilai_uts: Number(n.nilai_uts), nilai_uas: Number(n.nilai_uas),
          nilai_keterampilan: Number(n.nilai_keterampilan), nilai_akhir: Number(n.nilai_akhir), predikat: n.predikat || 'C', catatan: n.catatan || '',
          mapel: { id: m!.id, nama: m!.nama, kode: m!.kode, kelompok: m!.kelompok, kkm: Number(m!.kkm) || 75 },
        }));
      const ab = absensi.rows.filter((a) => a.siswa_id === siswa_id && a.tahun_ajaran_id === tahun_ajaran_id);
      const c = (st: string) => ab.filter((a) => a.status === st).length;
      const absensiObj = { hadir: c('H'), izin: c('I'), sakit: c('S'), alpa: c('A') };
      const cat = catatan.rows.find((x) => x.siswa_id === siswa_id && x.tahun_ajaran_id === tahun_ajaran_id) || {
        sikap_spiritual: 'Baik', deskripsi_spiritual: 'Menunjukkan ketaatan beribadah dan akhlak terpuji.', sikap_sosial: 'Baik',
        deskripsi_sosial: 'Menunjukkan kepedulian sosial, sopan santun, dan kerja sama yang baik.', juz_hafalan: 'Juz 30', surah_terakhir: 'An-Naba',
        predikat_tahfidz: 'Jayyid', catatan_wali_kelas: 'Tingkatkan terus prestasi belajar dan kedisiplinan.', status_akhir: 'Naik Kelas', naik_ke_kelas: null,
      };
      return { siswa: s, madrasah: profile, tahun_ajaran: t, tahunAjaran: t, kelas: k || { id: 0, nama: '-', tingkat: '-' },
        waliKelas: wali, wali_kelas: wali, nilai: nl, nilaiList: nl, absensi: absensiObj, rekapAbsensi: absensiObj, catatan: cat, catatanRapor: cat };
    },

    // 14. Jenis & tarif pembayaran
    async getJenisPembayaranList(tahun_ajaran_id?: number) {
      return jenis.rows.filter((j) => !tahun_ajaran_id || j.tahun_ajaran_id === tahun_ajaran_id).sort((a, b) => b.id - a.id).map(jenisView);
    },
    async getJenisPembayaranById(id: number) { const j = jenis.find(id); return j ? jenisView(j) : null; },
    async createJenisPembayaran(d: Row) {
      const { tarifList, ...rest } = d; const c = jenis.insert(rest);
      (tarifList || []).forEach((t: Row) => tarif.insert({ jenis_pembayaran_id: c.id, tingkat: t.tingkat || 'Semua', kelas_id: t.kelas_id ? Number(t.kelas_id) : null, nominal: String(t.nominal || 0) }));
      return this.getJenisPembayaranById(c.id);
    },
    async updateJenisPembayaran(id: number, d: Row) {
      const { tarifList, ...rest } = d; jenis.update(id, rest);
      if (Array.isArray(tarifList)) {
        tarif.removeWhere((t) => t.jenis_pembayaran_id === id);
        tarifList.forEach((t: Row) => tarif.insert({ jenis_pembayaran_id: id, tingkat: t.tingkat || 'Semua', kelas_id: t.kelas_id ? Number(t.kelas_id) : null, nominal: String(t.nominal || 0) }));
      }
      return this.getJenisPembayaranById(id);
    },
    async deleteJenisPembayaran(id: number) {
      if (tagihan.rows.some((t) => t.jenis_pembayaran_id === id)) throw new Error('Pos pembayaran ini sudah memiliki riwayat tagihan dan tidak dapat dihapus.');
      tarif.removeWhere((t) => t.jenis_pembayaran_id === id);
      return jenis.remove(id);
    },

    // 15. Tagihan
    async generateTagihanMassal(d: Row) {
      const j = await this.getJenisPembayaranById(d.jenis_pembayaran_id);
      if (!j) throw new Error('Jenis pembayaran tidak ditemukan.');
      let target = siswa.rows.filter((s) => s.status === 'aktif');
      if (d.kelas_id) target = target.filter((s) => s.kelas_id === d.kelas_id);
      if (d.tingkat && d.tingkat !== 'Semua') {
        const ids = kelas.rows.filter((k) => String(k.tingkat) === String(d.tingkat)).map((k) => k.id);
        if (!ids.length) return { count: 0, message: 'Tidak ada kelas pada tingkat tersebut.' };
        target = target.filter((s) => ids.includes(s.kelas_id));
      }
      const bulanArr = j.tipe === 'bulanan' && Array.isArray(d.bulan_list) && d.bulan_list.length ? d.bulan_list : [null];
      let count = 0;
      for (const s of target) {
        if (!s.kelas_id) continue;
        let nominal = Number(d.nominal_override) || 0;
        if (!nominal) {
          const tm = j.tarifList.find((t: Row) => t.kelas_id === s.kelas_id) || j.tarifList.find((t: Row) => t.tingkat === 'Semua') || j.tarifList[0];
          nominal = tm ? Number(tm.nominal) : 0;
        }
        for (const b of bulanArr) {
          if (tagihan.rows.some((t) => t.siswa_id === s.id && t.jenis_pembayaran_id === d.jenis_pembayaran_id && t.tahun_ajaran_id === d.tahun_ajaran_id && (!b || t.bulan === b))) continue;
          tagihan.insert({ siswa_id: s.id, kelas_id: s.kelas_id, jenis_pembayaran_id: d.jenis_pembayaran_id, tahun_ajaran_id: d.tahun_ajaran_id, bulan: b, nominal: String(nominal), terbayar: '0', sisa: String(nominal), status: 'belum_bayar', jatuh_tempo: d.jatuh_tempo || null });
          count++;
        }
      }
      return { count };
    },
    async getTagihanList(p: Row) {
      const list = tagihan.rows.map(tagihanView).filter((t) =>
        (!p.kelas_id || t.kelas_id === p.kelas_id) && (!p.status || p.status === 'semua' || t.status === p.status) &&
        (!p.jenis_pembayaran_id || t.jenis_pembayaran_id === p.jenis_pembayaran_id) && (!p.tahun_ajaran_id || t.tahun_ajaran_id === p.tahun_ajaran_id) &&
        (!p.search || like(t.siswa_nama, p.search) || like(t.siswa_nis, p.search) || like(t.jenis_nama, p.search))
      ).sort((a, b) => b.id - a.id);
      return paginate(list, p.page, p.limit, 20);
    },
    async getTagihanBySiswa(siswa_id: number, tahun_ajaran_id?: number) {
      return tagihan.rows.filter((t) => t.siswa_id === siswa_id && (!tahun_ajaran_id || t.tahun_ajaran_id === tahun_ajaran_id)).map(tagihanView);
    },
    async getTagihanById(id: number) {
      const t = tagihan.find(id); if (!t) return null;
      return { ...tagihanView(t), transaksiList: transaksi.rows.filter((x) => x.tagihan_id === id).sort((a, b) => b.id - a.id).map((x) => ({ ...x, jumlah_bayar: Number(x.jumlah_bayar) })) };
    },

    // 16. Transaksi
    async createTransaksiPembayaran(d: Row) {
      const tg: any = await this.getTagihanById(d.tagihan_id);
      if (!tg) throw new Error('Tagihan tidak ditemukan.');
      const jumlah = Number(d.jumlah_bayar);
      if (jumlah <= 0) throw new Error('Jumlah pembayaran harus lebih dari 0.');
      if (jumlah > tg.sisa) throw new Error(`Jumlah pembayaran (Rp ${jumlah}) melebihi sisa tagihan (Rp ${tg.sisa}).`);
      const n = new Date();
      const prefix = `KWT-${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}`;
      const tx = transaksi.insert({ nomor_transaksi: nextNomor(prefix, transaksi.rows, 'nomor_transaksi'), tagihan_id: d.tagihan_id, siswa_id: d.siswa_id, jumlah_bayar: String(jumlah), metode: d.metode || 'Tunai', tanggal_bayar: d.tanggal_bayar, catatan: d.catatan || null, created_by_user_id: d.user_id, status: 'valid', alasan_batal: null, cancelled_at: null });
      const terbayar = tg.terbayar + jumlah, sisa = Math.max(0, tg.nominal - terbayar), status = sisa <= 0 ? 'lunas' : 'sebagian';
      tagihan.update(d.tagihan_id, { terbayar: String(terbayar), sisa: String(sisa), status });
      return { transaksi: { ...tx, jumlah_bayar: Number(tx.jumlah_bayar) }, tagihan: { ...tg, terbayar, sisa, status } };
    },
    async cancelTransaksiPembayaran(id: number, d: Row) {
      const tx = transaksi.find(id);
      if (!tx) throw new Error('Transaksi pembayaran tidak ditemukan.');
      if (tx.status === 'dibatalkan') throw new Error('Transaksi ini sudah dibatalkan sebelumnya.');
      const tg: any = await this.getTagihanById(tx.tagihan_id);
      if (!tg) throw new Error('Tagihan terkait transaksi ini tidak ditemukan.');
      const up = transaksi.update(id, { status: 'dibatalkan', alasan_batal: d.alasan_batal, cancelled_at: new Date(), cancelled_by_user_id: d.user_id })!;
      const terbayar = Math.max(0, tg.terbayar - Number(tx.jumlah_bayar)), sisa = tg.nominal - terbayar, status = terbayar <= 0 ? 'belum_bayar' : 'sebagian';
      tagihan.update(tx.tagihan_id, { terbayar: String(terbayar), sisa: String(sisa), status });
      return { transaksi: { ...up, jumlah_bayar: Number(up.jumlah_bayar) }, tagihan: { ...tg, terbayar, sisa, status } };
    },
    async getTransaksiList(p: Row) {
      const list = transaksi.rows.map(txView).filter((x) =>
        (!p.status || p.status === 'semua' || x.status === p.status) && (!p.tanggal_mulai || x.tanggal_bayar >= p.tanggal_mulai) && (!p.tanggal_selesai || x.tanggal_bayar <= p.tanggal_selesai) &&
        (!p.search || like(x.nomor_transaksi, p.search) || like(x.siswa_nama, p.search) || like(x.siswa_nis, p.search))
      ).sort((a, b) => b.id - a.id);
      return paginate(list, p.page, p.limit, 20);
    },
    async getTransaksiById(id: number) { const x = transaksi.find(id); return x ? txView(x) : null; },
    async getKwitansiData(id: number) { const tx = await this.getTransaksiById(id); return tx ? { transaksi: tx, madrasah: profile } : null; },
    async getTunggakanList(p: Row) {
      const list = tagihan.rows.filter((t) => t.status !== 'lunas' && (!p.tahun_ajaran_id || t.tahun_ajaran_id === p.tahun_ajaran_id) && (!p.kelas_id || t.kelas_id === p.kelas_id) && (!p.jenis_pembayaran_id || t.jenis_pembayaran_id === p.jenis_pembayaran_id))
        .map(tagihanView).sort((a, b) => b.sisa - a.sisa);
      return paginate(list, p.page, p.limit, 20);
    },
    async getTunggakanSummaryByKelas(tahun_ajaran_id?: number) {
      const map = new Map<number, { total: number; n: number }>();
      tagihan.rows.filter((t) => t.status !== 'lunas' && (!tahun_ajaran_id || t.tahun_ajaran_id === tahun_ajaran_id))
        .forEach((t) => { const m = map.get(t.kelas_id) || { total: 0, n: 0 }; m.total += Number(t.sisa); m.n++; map.set(t.kelas_id, m); });
      return [...map.entries()].map(([kid, m]) => ({ kelas_id: kid, kelas_nama: kelas.find(kid)?.nama, total_tunggakan: m.total, jumlah_tagihan: m.n }))
        .sort((a, b) => String(a.kelas_nama).localeCompare(String(b.kelas_nama)));
    },
    async getDashboardKeuanganStats(tahun_ajaran_id?: number) {
      const list = tagihan.rows.filter((t) => !tahun_ajaran_id || t.tahun_ajaran_id === tahun_ajaran_id);
      const sum = (k: string) => list.reduce((a, t) => a + Number(t[k]), 0);
      const today = ISO(new Date());
      const tx = transaksi.rows.filter((x) => x.status === 'valid' && x.tanggal_bayar === today);
      return { totalTagihan: sum('nominal'), totalPenerimaan: sum('terbayar'), totalTunggakan: sum('sisa'), penerimaanHariIni: tx.reduce((a, x) => a + Number(x.jumlah_bayar), 0), transaksiHariIni: tx.length };
    },

    // 17. PPDB
    async createPPDB(d: Row) {
      const t = activeTa();
      return ppdb.insert({ ...d, nomor_pendaftaran: nextNomor(`PPDB-${new Date().getFullYear()}`, ppdb.rows, 'nomor_pendaftaran'), tahun_ajaran_id: d.tahun_ajaran_id || t?.id || 1, status: 'menunggu_verifikasi', is_converted: false });
    },
    async getPPDBByNomor(nomor: string) { return ppdb.rows.find((p) => p.nomor_pendaftaran === nomor) || null; },
    async getPPDBList(p: Row) {
      const list = ppdb.rows.filter((x) => (!p.status || p.status === 'semua' || x.status === p.status) && (!p.jalur || p.jalur === 'semua' || x.jalur_pendaftaran === p.jalur) && (!p.tahun_ajaran_id || x.tahun_ajaran_id === p.tahun_ajaran_id) &&
        (!p.search || like(x.nama_lengkap, p.search) || like(x.nomor_pendaftaran, p.search) || like(x.nisn, p.search))).sort((a, b) => b.id - a.id);
      return paginate(list, p.page, p.limit, 20);
    },
    async getPPDBById(id: number) {
      const p = ppdb.find(id); if (!p) return null;
      const u = p.verified_by_user_id ? users.find(p.verified_by_user_id) : null;
      return { ...p, verifier_nama: u?.nama_lengkap, verifiedBy: u ? { id: u.id, nama: u.nama_lengkap } : null };
    },
    async verifikasiPPDB(id: number, d: Row) {
      return ppdb.update(id, { status: d.status, catatan_verifikasi: d.catatan_verifikasi || null, verified_by_user_id: d.user_id, verified_at: new Date() });
    },
    async konversiPPDBSiswa(id: number, d: Row) {
      const p = ppdb.find(id);
      if (!p) throw new Error('Data pendaftar PPDB tidak ditemukan.');
      if (p.is_converted) throw new Error('Pendaftar ini sudah pernah dikonversi menjadi siswa.');
      const y = new Date().getFullYear();
      const s = siswa.insert({ nis: d.nis || `S-${y}${String(p.id).padStart(4, '0')}`, nisn: d.nisn || p.nisn || `00${y}${String(p.id).padStart(4, '0')}`, nama: p.nama_lengkap, jenis_kelamin: p.jenis_kelamin,
        tempat_lahir: p.tempat_lahir, tanggal_lahir: p.tanggal_lahir, kelas_id: d.kelas_id, tahun_ajaran_masuk_id: d.tahun_ajaran_id, nama_ayah: p.nama_ayah, nama_ibu: p.nama_ibu,
        telepon_ortu: p.telepon_ortu, alamat: p.alamat, status: 'aktif', foto_url: p.berkas_foto_url });
      penempatan.insert({ siswa_id: s.id, kelas_id: d.kelas_id, tahun_ajaran_id: d.tahun_ajaran_id, status: 'aktif', catatan: null });
      ppdb.update(id, { is_converted: true, converted_siswa_id: s.id });
      return s;
    },
    async getPPDBStats(tahun_ajaran_id?: number) { return ppdbStats(tahun_ajaran_id); },

    // 18. Pengumuman
    async getPengumumanList(p: Row) {
      const list = pengumuman.rows.filter((x) => (!p.kategori || p.kategori === 'Semua' || x.kategori === p.kategori) && (!p.target_audiens || p.target_audiens === 'Semua' || x.target_audiens === p.target_audiens) &&
        (!p.published_only || x.is_published) && (!p.search || like(x.judul, p.search) || like(x.konten, p.search)))
        .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || +new Date(b.created_at) - +new Date(a.created_at));
      const r = paginate(list, p.page, p.limit, 20);
      return { ...r, items: r.items.map(authorView) };
    },
    async getPengumumanById(id: number) { const p = pengumuman.find(id); return p ? authorView(p) : null; },
    async createPengumuman(d: Row) { return pengumuman.insert(d); },
    async updatePengumuman(id: number, d: Row) { return pengumuman.update(id, d); },
    async deletePengumuman(id: number) { return pengumuman.remove(id); },

    // 19. Kalender
    async getKalenderList(p: Row) {
      return kalender.rows.filter((x) => (!p.tahun_ajaran_id || x.tahun_ajaran_id === p.tahun_ajaran_id) && (!p.bulan || String(x.tanggal_mulai).startsWith(p.bulan)) && (!p.search || like(x.judul_kegiatan, p.search) || like(x.deskripsi, p.search)))
        .sort((a, b) => String(a.tanggal_mulai).localeCompare(String(b.tanggal_mulai)));
    },
    async getKalenderById(id: number) { return kalender.find(id); },
    async createKalender(d: Row) { return kalender.insert(d); },
    async updateKalender(id: number, d: Row) { return kalender.update(id, d); },
    async deleteKalender(id: number) { return kalender.remove(id); },

    // 20. Dashboard
    async getDashboardStats(guru_id?: number | null) {
      const cnt = (fn: (s: Row) => boolean) => siswa.rows.filter(fn).length;
      const totalSiswa = siswa.rows.length, siswaAktif = cnt((s) => s.status === 'aktif'), siswaLulus = cnt((s) => s.status === 'lulus'), siswaPindah = cnt((s) => s.status === 'pindah');
      const totalGuru = guru.rows.length, guruAktif = guru.rows.filter((g) => g.is_active).length, guruPNS = guru.rows.filter((g) => g.status_kepegawaian === 'PNS').length;
      const taAktif = activeTa();
      let guruStats: any = null;
      if (guru_id && taAktif) {
        const sc = guruScope(guru_id, taAktif.id);
        guruStats = { totalKelasAjar: sc.allowedKelasIds.length, isWaliKelas: sc.waliKelasIds.length > 0,
          waliKelasNama: sc.waliKelasIds.map((i) => kelas.find(i)?.nama).join(', '),
          totalJadwalMengajar: jadwal.rows.filter((j) => j.guru_id === guru_id && j.tahun_ajaran_id === taAktif.id).length };
      }
      const siswaPerKelas = [...kelas.rows].sort((a, b) => String(a.tingkat).localeCompare(String(b.tingkat)) || String(a.nama).localeCompare(String(b.nama)))
        .map((k) => ({ kelas_id: k.id, nama: k.nama, tingkat: k.tingkat, wali_kelas: (k.wali_kelas_id && guru.find(k.wali_kelas_id)?.nama) || 'Belum ditentukan', kapasitas: k.kapasitas,
          jumlahSiswa: siswa.rows.filter((s) => s.kelas_id === k.id && s.status === 'aktif').length }));
      const bulan = [['07', 'Juli'], ['08', 'Agustus'], ['09', 'September'], ['10', 'Oktober'], ['11', 'November'], ['12', 'Desember']];
      const kehadiranBulanan = bulan.map(([key, label]) => {
        const r = absensi.rows.filter((a) => String(a.tanggal).slice(5, 7) === key);
        const n = (st: string) => r.filter((x) => x.status === st).length;
        const hadir = n('H'), izin = n('I'), sakit = n('S'), alpa = n('A'), total = hadir + izin + sakit + alpa;
        return { bulan: label, hadir, izin, sakit, alpa, persentaseHadir: total ? Math.round((hadir / total) * 100) : 100 };
      });
      return {
        counts: { siswa: totalSiswa, siswaLaki: cnt((s) => s.status === 'aktif' && s.jenis_kelamin === 'L'), siswaPerempuan: cnt((s) => s.status === 'aktif' && s.jenis_kelamin === 'P'), guru: totalGuru, kelas: kelas.rows.length, mapel: mapel.rows.length, alumni: siswaLulus, mutasi: siswaPindah },
        totalSiswa, siswaAktif, siswaLulus, siswaPindah, totalGuru, guruAktif, guruPNS, guruNonPNS: totalGuru - guruPNS,
        totalKelas: kelas.rows.length, totalMapel: mapel.rows.length, tahunAjaranAktif: taAktif, guruStats, kehadiranBulanan, siswaPerKelas,
        ppdbSummary: ppdbStats(taAktif?.id),
        recentAnnouncements: pengumuman.rows.filter((p) => p.is_published).sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned) || +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 3).map(authorView),
        upcomingEvents: [...kalender.rows].sort((a, b) => String(a.tanggal_mulai).localeCompare(String(b.tanggal_mulai))).slice(0, 4),
        recentLogs: [...audit.rows].sort((a, b) => b.id - a.id).slice(0, 5),
      };
    },
  };
}

let singleton: any = null;
/** Singleton supaya data tidak reset di setiap request. */
export function getMemoryStore() {
  return (singleton ??= createMemoryStore());
}
