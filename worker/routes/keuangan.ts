import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { authMiddleware, requirePermission } from '../auth.ts';
import { store } from '../store.ts';

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
    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const stats = store.getDashboardKeuanganStats(taId);
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
    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const list = store.getJenisPembayaranList(taId);
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
    const id = Number(c.req.param('id'));
    const item = store.getJenisPembayaranById(id);
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

    const created = store.createJenisPembayaran(
      {
        nama,
        tipe,
        deskripsi: deskripsi || null,
        tahun_ajaran_id: Number(tahun_ajaran_id),
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
      tarifList
    );

    const user = c.get('user')!;
    store.createAuditLog({
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
    const id = Number(c.req.param('id'));
    const body = await c.req.json().catch(() => ({}));
    const { nama, tipe, deskripsi, tahun_ajaran_id, is_active, tarifList } = body;

    const updated = store.updateJenisPembayaran(
      id,
      {
        nama,
        tipe,
        deskripsi: deskripsi !== undefined ? deskripsi : undefined,
        tahun_ajaran_id: tahun_ajaran_id ? Number(tahun_ajaran_id) : undefined,
        is_active: is_active !== undefined ? Boolean(is_active) : undefined,
      },
      tarifList
    );

    if (!updated) {
      return c.json({ success: false, message: 'Jenis pembayaran tidak ditemukan.' }, 404);
    }

    const user = c.get('user')!;
    store.createAuditLog({
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
    const id = Number(c.req.param('id'));
    const jenis = store.getJenisPembayaranById(id);
    if (!jenis) {
      return c.json({ success: false, message: 'Jenis pembayaran tidak ditemukan.' }, 404);
    }

    store.deleteJenisPembayaran(id);
    const user = c.get('user')!;

    store.createAuditLog({
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
    const result = store.generateTagihanMassal({
      jenis_pembayaran_id: Number(jenis_pembayaran_id),
      tahun_ajaran_id: Number(tahun_ajaran_id),
      bulan: bulan || undefined,
      tingkat: tingkat || undefined,
      kelas_id: kelas_id ? Number(kelas_id) : undefined,
      jatuh_tempo: jatuh_tempo || undefined,
      user_id: user.id,
      username: user.username,
    });

    return c.json({
      success: true,
      data: result,
      message: `Berhasil membuat ${result.generatedCount} tagihan massal (Rp ${result.totalNominal.toLocaleString('id-ID')}). ${result.skippedCount} siswa dilewati karena sudah ada tagihan.`,
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
    const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
    const siswa_id = c.req.query('siswa_id') ? Number(c.req.query('siswa_id')) : undefined;
    const jenis_pembayaran_id = c.req.query('jenis_pembayaran_id')
      ? Number(c.req.query('jenis_pembayaran_id'))
      : undefined;
    const status = c.req.query('status');
    const bulan = c.req.query('bulan');
    const search = c.req.query('search');
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 20);

    const result = store.getTagihanList({
      tahun_ajaran_id,
      kelas_id,
      siswa_id,
      jenis_pembayaran_id,
      status,
      bulan,
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
    const siswaId = Number(c.req.param('siswaId'));
    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const tagihanList = store.getTagihanBySiswa(siswaId, taId);
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
    const id = Number(c.req.param('id'));
    const tagihan = store.getTagihanById(id);
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
    const result = store.createTransaksiPembayaran({
      tagihan_id: Number(tagihan_id),
      siswa_id: Number(siswa_id),
      jumlah_bayar: Number(jumlah_bayar),
      metode: metode || 'Tunai',
      tanggal_bayar: tanggal_bayar || new Date().toISOString().slice(0, 10),
      catatan: catatan || null,
      user_id: user.id,
      username: user.nama_lengkap || user.username,
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
    const result = store.cancelTransaksiPembayaran(
      id,
      alasan_batal,
      user.id,
      user.nama_lengkap || user.username
    );

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
    const search = c.req.query('search');
    const status = c.req.query('status');
    const metode = c.req.query('metode');
    const jenis_id = c.req.query('jenis_id') ? Number(c.req.query('jenis_id')) : undefined;
    const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 20);

    const result = store.getTransaksiList({
      search,
      status,
      metode,
      jenis_id,
      kelas_id,
      startDate,
      endDate,
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
  // Alias untuk /pembayaran laporan keuangan
  try {
    const search = c.req.query('search');
    const status = c.req.query('status');
    const metode = c.req.query('metode');
    const jenis_id = c.req.query('jenis_id') ? Number(c.req.query('jenis_id')) : undefined;
    const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 500);

    const result = store.getTransaksiList({
      search,
      status,
      metode,
      jenis_id,
      kelas_id,
      startDate,
      endDate,
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
    const id = Number(c.req.param('id'));
    const tx = store.getTransaksiById(id);
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
    const id = Number(c.req.param('id'));
    const data = store.getKwitansiData(id);
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
    const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
    const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const search = c.req.query('search');

    const list = store.getTunggakanList({
      kelas_id,
      tahun_ajaran_id,
      search,
    });

    return c.json({
      success: true,
      data: list,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

keuanganRouter.get('/tunggakan/rekap-kelas', async (c) => {
  try {
    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const summary = store.getTunggakanSummaryByKelas(taId);
    return c.json({
      success: true,
      data: summary,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});
