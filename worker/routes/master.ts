import { Hono } from 'hono';
import * as XLSX from 'xlsx';
import { AppContext } from '../types.ts';
import { authMiddleware, requirePermission } from '../auth.ts';
import { getStore } from '../store.ts';

import {
  MadrasahProfileSchema,
  TahunAjaranSchema,
  KelasSchema,
  MapelSchema,
  GuruSchema,
  SiswaSchema,
} from '../zod-schemas.ts';
import {
  getSignedUploadParams,
  isCloudinaryConfigured,
} from '../cloudinary.ts';

export const masterRouter = new Hono<AppContext>();

masterRouter.use('*', authMiddleware);

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// ==========================================
// 1. TAHUN AJARAN & SEMESTER
// ==========================================
masterRouter.get('/tahun-ajaran', requirePermission('tahun_ajaran', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const list = await store.getTahunAjaranList();
  return c.json({
    success: true,
    data: list,
    message: 'Data tahun ajaran berhasil diambil.',
  });
});

masterRouter.post('/tahun-ajaran', requirePermission('tahun_ajaran', 'tambah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = TahunAjaranSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input tahun ajaran tidak valid',
      },
      400
    );
  }

  const created = await store.createTahunAjaran(parsed.data as any);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    entity: 'tahun_ajaran',
    details: `Menambah tahun ajaran baru: ${created.tahun} (${created.semester})`,
    ip_address: getClientIp(c),
  });

  return c.json(
    {
      success: true,
      data: created,
      message: 'Tahun ajaran berhasil ditambahkan.',
    },
    201
  );
});

masterRouter.put('/tahun-ajaran/:id', requirePermission('tahun_ajaran', 'ubah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const parsed = TahunAjaranSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input tahun ajaran tidak valid',
      },
      400
    );
  }

  const updated = await store.updateTahunAjaran(id, parsed.data as any);
  if (!updated) {
    return c.json({ success: false, message: 'Tahun ajaran tidak ditemukan' }, 404);
  }

  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'tahun_ajaran',
    details: `Memperbarui tahun ajaran: ${updated.tahun} (${updated.semester})`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Tahun ajaran berhasil diperbarui.',
  });
});

masterRouter.put('/tahun-ajaran/:id/aktifkan', requirePermission('tahun_ajaran', 'ubah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const updated = await store.updateTahunAjaran(id, { is_active: true });
  if (!updated) {
    return c.json({ success: false, message: 'Tahun ajaran tidak ditemukan' }, 404);
  }

  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'tahun_ajaran',
    details: `Mengaktifkan tahun ajaran resmi: ${updated.tahun} (${updated.semester})`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: `Tahun ajaran ${updated.tahun} Semester ${updated.semester} berhasil diaktifkan.`,
  });
});

masterRouter.patch('/tahun-ajaran/:id/activate', requirePermission('tahun_ajaran', 'ubah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const updated = await store.updateTahunAjaran(id, { is_active: true });
  if (!updated) {
    return c.json({ success: false, message: 'Tahun ajaran tidak ditemukan' }, 404);
  }

  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'tahun_ajaran',
    details: `Mengaktifkan tahun ajaran resmi: ${updated.tahun} (${updated.semester})`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: `Tahun ajaran ${updated.tahun} Semester ${updated.semester} berhasil diaktifkan.`,
  });
});

masterRouter.delete('/tahun-ajaran/:id', requirePermission('tahun_ajaran', 'hapus'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const item = await store.getTahunAjaranById(id);
  if (!item) {
    return c.json({ success: false, message: 'Tahun ajaran tidak ditemukan' }, 404);
  }

  if (item.is_active) {
    return c.json(
      {
        success: false,
        message: 'Tidak dapat menghapus tahun ajaran yang sedang aktif!',
      },
      400
    );
  }

  await store.deleteTahunAjaran(id);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    entity: 'tahun_ajaran',
    details: `Menghapus tahun ajaran: ${item.tahun} (${item.semester})`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Tahun ajaran berhasil dihapus.',
  });
});

// ==========================================
// 2. KELAS / ROMBEL
// ==========================================
masterRouter.get('/kelas', requirePermission('kelas', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const tingkat = c.req.query('tingkat');
  const search = c.req.query('search');
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 10);

  const list = await store.getKelasList({ tingkat, search, page, limit });
  return c.json({
    success: true,
    data: list,
    message: 'Data rombel berhasil diambil.',
  });
});

masterRouter.get('/kelas/simple', async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const list = await store.getAllKelasSimple();
  return c.json({ success: true, data: list });
});

masterRouter.post('/kelas', requirePermission('kelas', 'tambah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = KelasSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input kelas tidak valid',
      },
      400
    );
  }

  const created = await store.createKelas(parsed.data as any);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    entity: 'kelas',
    details: `Menambah kelas baru: ${created.nama} (Tingkat ${created.tingkat})`,
    ip_address: getClientIp(c),
  });

  return c.json(
    {
      success: true,
      data: created,
      message: 'Kelas berhasil ditambahkan.',
    },
    201
  );
});

masterRouter.put('/kelas/:id', requirePermission('kelas', 'ubah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const parsed = KelasSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input kelas tidak valid',
      },
      400
    );
  }

  const updated = await store.updateKelas(id, parsed.data as any);
  if (!updated) {
    return c.json({ success: false, message: 'Kelas tidak ditemukan' }, 404);
  }

  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'kelas',
    details: `Memperbarui data kelas: ${updated.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Kelas berhasil diperbarui.',
  });
});

masterRouter.delete('/kelas/:id', requirePermission('kelas', 'hapus'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const item = await store.getKelasById(id);
  if (!item) {
    return c.json({ success: false, message: 'Kelas tidak ditemukan' }, 404);
  }

  await store.deleteKelas(id);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    entity: 'kelas',
    details: `Menghapus kelas: ${item.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Kelas berhasil dihapus.',
  });
});

// ==========================================
// 3. MATA PELAJARAN
// ==========================================
masterRouter.get('/mapel', requirePermission('mapel', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const kelompok = c.req.query('kelompok');
  const search = c.req.query('search');
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 15);

  const list = await store.getMapelList({ kelompok, search, page, limit });
  return c.json({
    success: true,
    data: list,
    message: 'Data mata pelajaran berhasil diambil.',
  });
});

masterRouter.get('/mapel/simple', async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const list = await store.getAllMapelSimple();
  return c.json({ success: true, data: list });
});

masterRouter.post('/mapel', requirePermission('mapel', 'tambah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = MapelSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input mata pelajaran tidak valid',
      },
      400
    );
  }

  const created = await store.createMapel(parsed.data as any);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    entity: 'mapel',
    details: `Menambah mapel baru: ${created.nama} (${created.kode})`,
    ip_address: getClientIp(c),
  });

  return c.json(
    {
      success: true,
      data: created,
      message: 'Mata pelajaran berhasil ditambahkan.',
    },
    201
  );
});

masterRouter.put('/mapel/:id', requirePermission('mapel', 'ubah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const parsed = MapelSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input mata pelajaran tidak valid',
      },
      400
    );
  }

  const updated = await store.updateMapel(id, parsed.data as any);
  if (!updated) {
    return c.json({ success: false, message: 'Mata pelajaran tidak ditemukan' }, 404);
  }

  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'mapel',
    details: `Memperbarui mata pelajaran: ${updated.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Mata pelajaran berhasil diperbarui.',
  });
});

masterRouter.delete('/mapel/:id', requirePermission('mapel', 'hapus'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const item = await store.getMapelById(id);
  if (!item) {
    return c.json({ success: false, message: 'Mata pelajaran tidak ditemukan' }, 404);
  }

  await store.deleteMapel(id);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    entity: 'mapel',
    details: `Menghapus mata pelajaran: ${item.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Mata pelajaran berhasil dihapus.',
  });
});

// ==========================================
// 4. GURU & PEGAWAI
// ==========================================
masterRouter.get('/guru', requirePermission('guru', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const search = c.req.query('search');
  const status = c.req.query('status');
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 10);

  const result = await store.getGuruList({
    search,
    status,
    page,
    limit,
  });
  return c.json({ success: true, data: result });
});

masterRouter.get('/guru/simple', async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const result = await store.getAllGuruSimple();
  return c.json({ success: true, data: result });
});

masterRouter.get('/guru/:id', requirePermission('guru', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const item = await store.getGuruById(id);
  if (!item) {
    return c.json({ success: false, message: 'Data guru tidak ditemukan' }, 404);
  }
  return c.json({ success: true, data: item });
});

masterRouter.post('/guru', requirePermission('guru', 'tambah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = GuruSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input data guru tidak valid',
      },
      400
    );
  }

  const created = await store.createGuru(parsed.data as any);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    entity: 'guru',
    details: `Menambah guru/pegawai baru: ${created.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json(
    {
      success: true,
      data: created,
      message: 'Data guru berhasil ditambahkan.',
    },
    201
  );
});

masterRouter.put('/guru/:id', requirePermission('guru', 'ubah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const parsed = GuruSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input data guru tidak valid',
      },
      400
    );
  }

  const updated = await store.updateGuru(id, parsed.data as any);
  if (!updated) {
    return c.json({ success: false, message: 'Data guru tidak ditemukan' }, 404);
  }

  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'guru',
    details: `Memperbarui data guru: ${updated.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Data guru berhasil diperbarui.',
  });
});

masterRouter.delete('/guru/:id', requirePermission('guru', 'hapus'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const item = await store.getGuruById(id);
  if (!item) {
    return c.json({ success: false, message: 'Data guru tidak ditemukan' }, 404);
  }

  await store.deleteGuru(id);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    entity: 'guru',
    details: `Menghapus guru: ${item.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Data guru berhasil dihapus.',
  });
});

// ==========================================
// 5. DATA SISWA & IMPORT / EXPORT EXCEL
// ==========================================
masterRouter.get('/siswa', requirePermission('siswa', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const search = c.req.query('search');
  const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
  const status = c.req.query('status');
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 10);

  const result = await store.getSiswaList({
    search,
    kelas_id,
    status,
    page,
    limit,
  });
  return c.json({ success: true, data: result });
});

// EKSPOR KE EXCEL (.xlsx)
masterRouter.get('/siswa/export', requirePermission('siswa', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
  const status = c.req.query('status');

  const siswaData = await store.getAllSiswaForExport({
    kelas_id,
    status,
  });

  const exportRows = siswaData.map((s, index) => ({
    No: index + 1,
    NIS: s.nis,
    NISN: s.nisn,
    'Nama Lengkap': s.nama,
    'L/P': s.jenis_kelamin,
    Kelas: s.kelas_nama || '-',
    'Tempat Lahir': s.tempat_lahir || '-',
    'Tanggal Lahir': s.tanggal_lahir || '-',
    Status: s.status.toUpperCase(),
    'Nama Ayah': s.nama_ayah || '-',
    'Nama Ibu': s.nama_ibu || '-',
    'No HP Ortu': s.telepon_ortu || '-',
    Alamat: s.alamat || '-',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportRows);

  const wscols = [
    { wch: 5 },
    { wch: 14 },
    { wch: 14 },
    { wch: 28 },
    { wch: 6 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 10 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
    { wch: 35 },
  ];
  ws['!cols'] = wscols;

  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'EXPORT',
    entity: 'siswa',
    details: `Mengekspor ${siswaData.length} data siswa ke Excel`,
    ip_address: getClientIp(c),
  });

  const filename = `Data_Siswa_Madrasah_${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// TEMPLATE EXCEL UNTUK IMPOR
masterRouter.get('/siswa/template', requirePermission('siswa', 'lihat'), async (c) => {
  const templateRows = [
    {
      nis: '242507010',
      nisn: '0091122334',
      nama: 'Ahmad Dahlan Putra',
      jenis_kelamin: 'L',
      nama_kelas: '7-A',
      tempat_lahir: 'Bogor',
      tanggal_lahir: '2011-08-17',
      nama_ayah: 'Dahlan Ramli',
      nama_ibu: 'Siti Maryam',
      telepon_ortu: '081234567890',
      alamat: 'Jl. Surya Kencana No. 10',
      status: 'aktif',
    },
    {
      nis: '242507011',
      nisn: '0092233445',
      nama: 'Khadijah Fitriani',
      jenis_kelamin: 'P',
      nama_kelas: '7-B',
      tempat_lahir: 'Jakarta',
      tanggal_lahir: '2011-11-25',
      nama_ayah: 'Fitriyadi',
      nama_ibu: 'Aisyah',
      telepon_ortu: '081298765432',
      alamat: 'Komplek Permata Hijau B12',
      status: 'aktif',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Template Impor Siswa');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="Template_Impor_Siswa.xlsx"',
    },
  });
});

// IMPOR SISWA DARI FILE EXCEL / CSV
masterRouter.post('/siswa/import', requirePermission('siswa', 'tambah'), async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const { rows } = body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return c.json(
        {
          success: false,
          message: 'Data siswa untuk diimpor tidak ditemukan atau format kosong.',
        },
        400
      );
    }

    const activeTa = await store.getActiveTahunAjaran();
    const allKelas = await store.getAllKelasSimple();

    const validList: any[] = [];
    const errors: string[] = [];

    rows.forEach((row: any, idx: number) => {
      const rowNum = idx + 2;
      const nis = String(row.nis || row.NIS || '').trim();
      const nisn = String(row.nisn || row.NISN || '').trim();
      const nama = String(row.nama || row['Nama Lengkap'] || row.Nama || '').trim();
      const jk = String(row.jenis_kelamin || row['L/P'] || row.JK || 'L').toUpperCase().slice(0, 1);
      const kelasNama = String(row.nama_kelas || row.Kelas || '').trim();

      if (!nis || !nisn || !nama) {
        errors.push(`Baris ${rowNum}: NIS, NISN, dan Nama Siswa wajib diisi.`);
        return;
      }

      if (nisn.length !== 10) {
        errors.push(`Baris ${rowNum} (${nama}): NISN harus 10 digit.`);
        return;
      }

      let matchedKelasId: number | null = null;
      if (kelasNama) {
        const found = allKelas.find(
          (k) => k.nama.toLowerCase() === kelasNama.toLowerCase()
        );
        if (found) matchedKelasId = found.id;
      }

      validList.push({
        nis,
        nisn,
        nama,
        jenis_kelamin: jk === 'P' ? 'P' : 'L',
        kelas_id: matchedKelasId,
        tahun_ajaran_masuk_id: activeTa?.id || null,
        tempat_lahir: row.tempat_lahir || row['Tempat Lahir'] || null,
        tanggal_lahir: row.tanggal_lahir || row['Tanggal Lahir'] || null,
        nama_ayah: row.nama_ayah || row['Nama Ayah'] || null,
        nama_ibu: row.nama_ibu || row['Nama Ibu'] || null,
        nama_wali: row.nama_wali || row['Nama Wali'] || null,
        telepon_ortu: row.telepon_ortu || row['No HP Ortu'] || null,
        alamat: row.alamat || row.Alamat || null,
        status: ['aktif', 'lulus', 'pindah'].includes(String(row.status || '').toLowerCase())
          ? String(row.status).toLowerCase()
          : 'aktif',
        foto_url: null,
      });
    });

    if (validList.length === 0) {
      return c.json(
        {
          success: false,
          message: 'Tidak ada baris data siswa yang valid untuk diimpor.',
          errors,
        },
        400
      );
    }

    const imported = await store.batchCreateSiswa(validList);
    const user = c.get('user')!;

    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'IMPORT',
      entity: 'siswa',
      details: `Mengimpor ${imported.length} siswa baru (dari ${rows.length} total baris)`,
      ip_address: getClientIp(c),
    });

    return c.json({
      success: true,
      data: {
        importedCount: imported.length,
        skippedCount: rows.length - imported.length,
        errors: errors.slice(0, 10),
      },
      message: `Berhasil mengimpor ${imported.length} siswa.${
        errors.length ? ` Terdapat ${errors.length} peringatan/lewati.` : ''
      }`,
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: 'Gagal memproses berkas impor.',
        error: error?.message,
      },
      500
    );
  }
});

masterRouter.get('/siswa/:id', requirePermission('siswa', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const item = await store.getSiswaById(id);
  if (!item) {
    return c.json({ success: false, message: 'Data siswa tidak ditemukan' }, 404);
  }
  return c.json({ success: true, data: item });
});

masterRouter.post('/siswa', requirePermission('siswa', 'tambah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = SiswaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input data siswa tidak valid',
      },
      400
    );
  }

  const created = await store.createSiswa(parsed.data as any);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    entity: 'siswa',
    details: `Menambah data siswa baru: ${created.nama} (NIS: ${created.nis})`,
    ip_address: getClientIp(c),
  });

  return c.json(
    {
      success: true,
      data: created,
      message: 'Data siswa berhasil ditambahkan.',
    },
    201
  );
});

masterRouter.put('/siswa/:id', requirePermission('siswa', 'ubah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const parsed = SiswaSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input data siswa tidak valid',
      },
      400
    );
  }

  const updated = await store.updateSiswa(id, parsed.data as any);
  if (!updated) {
    return c.json({ success: false, message: 'Data siswa tidak ditemukan' }, 404);
  }

  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'siswa',
    details: `Memperbarui data siswa: ${updated.nama} (NIS: ${updated.nis})`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Data siswa berhasil diperbarui.',
  });
});

masterRouter.delete('/siswa/:id', requirePermission('siswa', 'hapus'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const id = Number(c.req.param('id'));
  const item = await store.getSiswaById(id);
  if (!item) {
    return c.json({ success: false, message: 'Data siswa tidak ditemukan' }, 404);
  }

  await store.deleteSiswa(id);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    entity: 'siswa',
    details: `Menghapus data siswa: ${item.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Data siswa berhasil dihapus.',
  });
});

// ==========================================
// 6. PENGATURAN PROFIL MADRASAH (INTEGRASI DATABASE)
// ==========================================
masterRouter.get('/pengaturan', requirePermission('pengaturan', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const profile = await store.getMadrasahProfile();
  return c.json({
    success: true,
    data: profile,
    message: 'Profil madrasah berhasil diambil.',
  });
});

masterRouter.put('/pengaturan', requirePermission('pengaturan', 'ubah'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = MadrasahProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input profil madrasah tidak valid',
      },
      400
    );
  }

  const updated = await store.updateMadrasahProfile(parsed.data as any);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'pengaturan',
    details: `Memperbarui informasi profil madrasah: ${updated.nama}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Pengaturan profil madrasah berhasil disimpan ke Neon DB.',
  });
});

// Alias endpoint /madrasah-profile jika dipanggil
masterRouter.get('/madrasah-profile', async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const profile = await store.getMadrasahProfile();
  return c.json({
    success: true,
    data: profile,
    message: 'Profil madrasah berhasil diambil dari Neon DB.',
  });
});

masterRouter.put('/madrasah-profile', async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const body = await c.req.json().catch(() => ({}));
  const parsed = MadrasahProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message || 'Input profil tidak valid',
      },
      400
    );
  }

  const updated = await store.updateMadrasahProfile(parsed.data as any);
  const user = c.get('user')!;
  await store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'madrasah_profile',
    details: `Memperbarui profil madrasah via website`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Pengaturan profil madrasah berhasil disimpan ke Neon DB.',
  });
});

// ==========================================
// 7. AUDIT LOG
// ==========================================
masterRouter.get('/audit-log', requirePermission('audit_log', 'lihat'), async (c) => {
  const store = getStore(c.env?.DATABASE_URL);
  if (!store) {
    return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
  }

  const entity = c.req.query('entity');
  const action = c.req.query('action');
  const search = c.req.query('search');
  const page = Number(c.req.query('page') || 1);
  const limit = Number(c.req.query('limit') || 20);

  const result = await store.getAuditLogs({
    entity,
    action,
    search,
    page,
    limit,
  });
  return c.json({ success: true, data: result });
});

// ==========================================
// 8. FILE / FOTO UPLOAD (CLOUDINARY)
// ==========================================
masterRouter.get('/upload/signature', async (c) => {
  const isReady = isCloudinaryConfigured(c.env);
  if (!isReady) {
    return c.json({
      success: false,
      configured: false,
      message:
        'Cloudinary belum dikonfigurasi. Sistem akan menggunakan penyimpanan sementara.',
    });
  }

  const signData = await getSignedUploadParams(c.env, 'siakad_madrasah');
  return c.json({
    success: true,
    configured: true,
    data: signData,
  });
});

masterRouter.post('/upload', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { file, folder } = body;
    if (!file) {
      return c.json(
        {
          success: false,
          message: 'File data URL tidak ditemukan.',
        },
        400
      );
    }

    if (isCloudinaryConfigured(c.env)) {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const targetFolder = folder || 'siakad_madrasah';
      const signature = await getSignedUploadParams(c.env, targetFolder);

      if (signature) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('api_key', c.env.CLOUDINARY_API_KEY!);
        formData.append('timestamp', String(signature.timestamp));
        formData.append('signature', signature.signature);
        formData.append('folder', targetFolder);

        const uploadRes = await fetch(
          `https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
          {
            method: 'POST',
            body: formData,
          }
        );

        if (uploadRes.ok) {
          const resData: any = await uploadRes.json();
          return c.json({
            success: true,
            data: { url: resData.secure_url || resData.url },
            message: 'Foto/berkas berhasil diunggah ke Cloudinary.',
          });
        }
      }
    }

    return c.json({
      success: true,
      data: { url: file },
      message: 'Foto/berkas berhasil disimpan.',
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: 'Gagal mengunggah foto.',
        error: error?.message,
      },
      500
    );
  }
});
