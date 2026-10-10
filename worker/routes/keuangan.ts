import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { authMiddleware, requirePermission } from '../auth.ts';
import { getStore } from '../store.ts';

export const keuanganRouter = new Hono<AppContext>();

keuanganRouter.use('*', authMiddleware);

// Middleware khusus: Hanya Admin dan Staf Keuangan yang boleh mengakses modul keuangan
keuanganRouter.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ success: false, message: 'Tidak terotentikasi.' }, 401);
  }

  if (user.role === 'admin' || user.staf_role === 'Keuangan') {
    return await next();
  }

  const hasPerm = (user.permissions || []).some(
    (p: any) => p.module === 'keuangan' && p.can_view
  );

  if (hasPerm) {
    return await next();
  }

  return c.json(
    {
      success: false,
      message: 'Akses ditolak. Modul keuangan hanya boleh diakses oleh Administrator dan Staf Keuangan.',
    },
    403
  );
});

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// ==========================================
// 1. DASHBOARD KEUANGAN
// ==========================================
keuanganRouter.get('/dashboard', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const stats = await store.getDashboardKeuanganStats(taId);
    return c.json({
      success: true,
      data: stats,
    });
  } catch (err: any) {
    return c.json(
      { success: false, message: err.message || 'Gagal memuat statistik keuangan.' },
      500
    );
  }
});

// ==========================================
// 2. JENIS PEMBAYARAN & TARIF
// ==========================================
keuanganRouter.get('/jenis', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const list = await store.getJenisPembayaranList(taId);
    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

keuanganRouter.get('/jenis/:id', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const id = Number(c.req.param('id'));
    const item = await store.getJenisPembayaranById(id);
    if (!item) {
      return c.json({ success: false, message: 'Jenis pembayaran tidak ditemukan.' }, 404);
    }
    return c.json({ success: true, data: item });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

keuanganRouter.post('/jenis', requirePermission('keuangan', 'tambah'), async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const { nama, tipe, deskripsi, tahun_ajaran_id, is_active, tarifList } = body;

    if (!nama || !tipe || !tahun_ajaran_id) {
      return c.json(
        {
          success: false,
          message: 'Nama pembayaran, tipe, dan tahun ajaran wajib diisi.',
        },
        400
      );
    }

    const created = await store.createJenisPembayaran({
      nama,
      tipe,
      deskripsi: deskripsi || null,
      tahun_ajaran_id: Number(tahun_ajaran_id),
      is_active: is_active !== undefined ? Boolean(is_active) : true,
      tarifList,
    });

    const user = c.get('user')!;
    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      entity: 'keuangan',
      details: `Membuat jenis pembayaran baru: ${nama} (${tipe.toUpperCase()})`,
      ip_address: getClientIp(c),
    });

    return c.json(
      {
        success: true,
        data: created,
        message: 'Jenis pembayaran berhasil dibuat.',
      },
      201
    );
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

keuanganRouter.put('/jenis/:id', requirePermission('keuangan', 'ubah'), async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const id = Number(c.req.param('id'));
    const body = await c.req.json().catch(() => ({}));
    const { nama, tipe, deskripsi, tahun_ajaran_id, is_active, tarifList } = body;

    const updated = await store.updateJenisPembayaran(id, {
      nama,
      tipe,
      deskripsi: deskripsi !== undefined ? deskripsi : undefined,
      tahun_ajaran_id: tahun_ajaran_id ? Number(tahun_ajaran_id) : undefined,
      is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      tarifList,
    });

    if (!updated) {
      return c.json({ success: false, message: 'Jenis pembayaran tidak ditemukan.' }, 404);
    }

    const user = c.get('user')!;
    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      entity: 'keuangan',
      details: `Memperbarui jenis pembayaran: ${updated.nama}`,
      ip_address: getClientIp(c),
    });

    return c.json({
      success: true,
      data: updated,
      message: 'Jenis pembayaran berhasil diperbarui.',
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

keuanganRouter.delete('/jenis/:id', requirePermission('keuangan', 'hapus'), async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const id = Number(c.req.param('id'));
    const jenis = await store.getJenisPembayaranById(id);
    if (!jenis) {
      return c.json({ success: false, message: 'Jenis pembayaran tidak ditemukan.' }, 404);
    }

    await store.deleteJenisPembayaran(id);
    const user = c.get('user')!;

    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'DELETE',
      entity: 'keuangan',
      details: `Menghapus jenis pembayaran: ${jenis.nama}`,
      ip_address: getClientIp(c),
    });

    return c.json({
      success: true,
      message: 'Jenis pembayaran berhasil dihapus.',
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

// ==========================================
// 3. GENERATE TAGIHAN MASSAL
// ==========================================
keuanganRouter.post('/tagihan/generate-massal', requirePermission('keuangan', 'tambah'), async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const {
      jenis_pembayaran_id,
      tahun_ajaran_id,
      bulan,
      tingkat,
      kelas_id,
      jatuh_tempo,
    } = body;

    if (!jenis_pembayaran_id || !tahun_ajaran_id) {
      return c.json(
        {
          success: false,
          message: 'Pilih jenis pembayaran dan tahun ajaran terlebih dahulu.',
        },
        400
      );
    }

    const user = c.get('user')!;
    const result = await store.generateTagihanMassal({
      jenis_pembayaran_id: Number(jenis_pembayaran_id),
      tahun_ajaran_id: Number(tahun_ajaran_id),
      bulan_list: bulan ? [bulan] : undefined,
      tingkat: tingkat || undefined,
      kelas_id: kelas_id ? Number(kelas_id) : undefined,
      jatuh_tempo: jatuh_tempo || undefined,
    });

    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      entity: 'keuangan',
      details: `Generate tagihan massal untuk ${result.count} siswa`,
      ip_address: getClientIp(c),
    });

    return c.json({
      success: true,
      data: result,
      message: `Berhasil membuat ${result.count} tagihan massal.`,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

// ==========================================
// 4. DAFTAR TAGIHAN SISWA
// ==========================================
keuanganRouter.get('/tagihan', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
    const jenis_pembayaran_id = c.req.query('jenis_pembayaran_id')
      ? Number(c.req.query('jenis_pembayaran_id'))
      : undefined;
    const status = c.req.query('status');
    const search = c.req.query('search');
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 20);

    const result = await store.getTagihanList({
      tahun_ajaran_id,
      kelas_id,
      jenis_pembayaran_id,
      status,
      search,
      page,
      limit,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

keuanganRouter.get('/tagihan/siswa/:siswaId', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const siswaId = Number(c.req.param('siswaId'));
    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const tagihanList = await store.getTagihanBySiswa(siswaId, taId);
    return c.json({
      success: true,
      data: tagihanList,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

keuanganRouter.get('/tagihan/:id', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const id = Number(c.req.param('id'));
    const tagihan = await store.getTagihanById(id);
    if (!tagihan) {
      return c.json({ success: false, message: 'Tagihan tidak ditemukan.' }, 404);
    }
    return c.json({ success: true, data: tagihan });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==========================================
// 5. TRANSAKSI PEMBAYARAN (CICILAN & VOID)
// ==========================================
keuanganRouter.post('/pembayaran', requirePermission('keuangan', 'tambah'), async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const {
      tagihan_id,
      siswa_id,
      jumlah_bayar,
      metode,
      tanggal_bayar,
      catatan,
    } = body;

    if (!tagihan_id || !siswa_id || !jumlah_bayar) {
      return c.json(
        {
          success: false,
          message: 'Tagihan, siswa, dan nominal pembayaran wajib diisi.',
        },
        400
      );
    }

    const user = c.get('user')!;
    const result = await store.createTransaksiPembayaran({
      tagihan_id: Number(tagihan_id),
      siswa_id: Number(siswa_id),
      jumlah_bayar: Number(jumlah_bayar),
      metode: (metode as any) || 'Tunai',
      tanggal_bayar: tanggal_bayar || new Date().toISOString().slice(0, 10),
      catatan: catatan || null,
      user_id: user.id,
    });

    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'PAYMENT',
      entity: 'keuangan',
      details: `Mencatat pembayaran ${result.transaksi.nomor_transaksi} sebesar Rp ${Number(jumlah_bayar).toLocaleString('id-ID')}`,
      ip_address: getClientIp(c),
    });

    return c.json(
      {
        success: true,
        data: result,
        message: `Pembayaran ${result.transaksi.nomor_transaksi} berhasil dicatat. Status tagihan: ${result.tagihan.status.toUpperCase()}.`,
      },
      201
    );
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

keuanganRouter.post('/pembayaran/:id/batal', requirePermission('keuangan', 'ubah'), async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const id = Number(c.req.param('id'));
    const body = await c.req.json().catch(() => ({}));
    const { alasan_batal } = body;

    if (!alasan_batal || !alasan_batal.trim()) {
      return c.json(
        {
          success: false,
          message: 'Alasan pembatalan pembayaran wajib disertakan.',
        },
        400
      );
    }

    const user = c.get('user')!;
    const result = await store.cancelTransaksiPembayaran(id, {
      alasan_batal,
      user_id: user.id,
    });

    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'VOID_PAYMENT',
      entity: 'keuangan',
      details: `Membatalkan pembayaran ${result.transaksi.nomor_transaksi}: ${alasan_batal}`,
      ip_address: getClientIp(c),
    });

    return c.json({
      success: true,
      data: result,
      message: `Transaksi pembayaran ${result.transaksi.nomor_transaksi} berhasil dibatalkan. Tagihan dikembalikan.`,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

keuanganRouter.get('/pembayaran', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const search = c.req.query('search');
    const status = c.req.query('status');
    const startDate = c.req.query('startDate') || c.req.query('tanggal_mulai');
    const endDate = c.req.query('endDate') || c.req.query('tanggal_selesai');
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 20);

    const result = await store.getTransaksiList({
      search,
      status,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
      page,
      limit,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

keuanganRouter.get('/laporan', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const search = c.req.query('search');
    const status = c.req.query('status');
    const startDate = c.req.query('startDate') || c.req.query('tanggal_mulai');
    const endDate = c.req.query('endDate') || c.req.query('tanggal_selesai');
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 500);

    const result = await store.getTransaksiList({
      search,
      status,
      tanggal_mulai: startDate,
      tanggal_selesai: endDate,
      page,
      limit,
    });

    return c.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

keuanganRouter.get('/pembayaran/:id', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const id = Number(c.req.param('id'));
    const tx = await store.getTransaksiById(id);
    if (!tx) {
      return c.json({ success: false, message: 'Transaksi tidak ditemukan.' }, 404);
    }
    return c.json({ success: true, data: tx });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==========================================
// 6. KWITANSI RESMI (CETAK / PDF)
// ==========================================
keuanganRouter.get('/pembayaran/:id/kwitansi', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const id = Number(c.req.param('id'));
    const data = await store.getKwitansiData(id);
    if (!data) {
      return c.json({ success: false, message: 'Data kwitansi tidak ditemukan.' }, 404);
    }
    return c.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==========================================
// 7. DAFTAR & REKAP TUNGGAKAN
// ==========================================
keuanganRouter.get('/tunggakan', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
    const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const jenis_pembayaran_id = c.req.query('jenis_pembayaran_id')
      ? Number(c.req.query('jenis_pembayaran_id'))
      : undefined;

    const list = await store.getTunggakanList({
      kelas_id,
      tahun_ajaran_id,
      jenis_pembayaran_id,
    });

    return c.json({
      success: true,
      ...list,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

keuanganRouter.get('/tunggakan/rekap-kelas', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json({ success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' }, 500);
    }

    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const summary = await store.getTunggakanSummaryByKelas(taId);
    return c.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});
