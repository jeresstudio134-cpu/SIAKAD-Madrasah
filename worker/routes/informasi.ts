import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { authMiddleware, requirePermission } from '../auth.ts';
import { getStore } from '../store.ts';

export const informasiRouter = new Hono<AppContext>();

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// ==========================================
// 1. PENGUMUMAN
// ==========================================

// Daftar pengumuman (bisa diakses publik atau sesuai role user)
informasiRouter.get('/pengumuman', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const target_audiens = c.req.query('target_audiens');
    const kategori = c.req.query('kategori');
    const search = c.req.query('search');

    const result = await store.getPengumumanList({
      target_audiens,
      kategori,
      search,
    });
    return c.json({ success: true, data: result.items });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

informasiRouter.get('/pengumuman/:id', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const id = Number(c.req.param('id'));
    const item = await store.getPengumumanById(id);
    if (!item) {
      return c.json({ success: false, message: 'Pengumuman tidak ditemukan.' }, 404);
    }
    return c.json({ success: true, data: item });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// Buat pengumuman baru (Admin / Staf)
informasiRouter.post(
  '/pengumuman',
  authMiddleware,
  requirePermission('pengumuman', 'tambah'),
  async (c) => {
    try {
      const store = getStore(c.env?.DATABASE_URL);
      if (!store) {
        return c.json(
          { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
          500
        );
      }

      const body = await c.req.json().catch(() => ({}));
      const { judul, konten, kategori, target_audiens, is_pinned, is_published } = body;
      if (!judul || !konten) {
        return c.json(
          {
            success: false,
            message: 'Judul dan konten pengumuman wajib diisi.',
          },
          400
        );
      }

      const user = c.get('user')!;
      const created = await store.createPengumuman({
        judul,
        konten,
        kategori: kategori || 'Umum',
        target_audiens: target_audiens || 'Semua',
        is_pinned: Boolean(is_pinned),
        is_published: is_published !== false,
        created_by_user_id: user.id,
      });

      await store.createAuditLog({
        user_id: user.id,
        username: user.username,
        action: 'CREATE',
        entity: 'pengumuman',
        details: `Membuat pengumuman: ${judul}`,
        ip_address: getClientIp(c),
      });

      return c.json(
        {
          success: true,
          data: created,
          message: 'Pengumuman berhasil diterbitkan.',
        },
        201
      );
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  }
);

// Ubah pengumuman
informasiRouter.put(
  '/pengumuman/:id',
  authMiddleware,
  requirePermission('pengumuman', 'ubah'),
  async (c) => {
    try {
      const store = getStore(c.env?.DATABASE_URL);
      if (!store) {
        return c.json(
          { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
          500
        );
      }

      const id = Number(c.req.param('id'));
      const body = await c.req.json().catch(() => ({}));
      const user = c.get('user')!;
      const updated = await store.updatePengumuman(id, body);

      await store.createAuditLog({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        entity: 'pengumuman',
        details: `Memperbarui pengumuman ID: ${id}`,
        ip_address: getClientIp(c),
      });

      return c.json({
        success: true,
        data: updated,
        message: 'Pengumuman berhasil diperbarui.',
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  }
);

// Hapus pengumuman
informasiRouter.delete(
  '/pengumuman/:id',
  authMiddleware,
  requirePermission('pengumuman', 'hapus'),
  async (c) => {
    try {
      const store = getStore(c.env?.DATABASE_URL);
      if (!store) {
        return c.json(
          { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
          500
        );
      }

      const id = Number(c.req.param('id'));
      const user = c.get('user')!;
      const ok = await store.deletePengumuman(id);

      if (!ok) {
        return c.json({ success: false, message: 'Pengumuman tidak ditemukan.' }, 404);
      }

      await store.createAuditLog({
        user_id: user.id,
        username: user.username,
        action: 'DELETE',
        entity: 'pengumuman',
        details: `Menghapus pengumuman ID: ${id}`,
        ip_address: getClientIp(c),
      });

      return c.json({
        success: true,
        message: 'Pengumuman berhasil dihapus.',
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  }
);

// ==========================================
// 2. KALENDER AKADEMIK
// ==========================================

informasiRouter.get('/kalender', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const bulan = c.req.query('bulan');
    const search = c.req.query('search');

    const list = await store.getKalenderList({
      tahun_ajaran_id,
      bulan,
      search,
    });
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

informasiRouter.get('/kalender/:id', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const id = Number(c.req.param('id'));
    const item = await store.getKalenderById(id);
    if (!item) {
      return c.json({ success: false, message: 'Agenda kalender tidak ditemukan.' }, 404);
    }
    return c.json({ success: true, data: item });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

informasiRouter.post(
  '/kalender',
  authMiddleware,
  requirePermission('kalender', 'tambah'),
  async (c) => {
    try {
      const store = getStore(c.env?.DATABASE_URL);
      if (!store) {
        return c.json(
          { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
          500
        );
      }

      const body = await c.req.json().catch(() => ({}));
      const {
        tahun_ajaran_id,
        judul_kegiatan,
        deskripsi,
        tanggal_mulai,
        tanggal_selesai,
        tipe_kegiatan,
        warna,
      } = body;

      if (!judul_kegiatan || !tanggal_mulai) {
        return c.json(
          {
            success: false,
            message: 'Nama kegiatan dan tanggal mulai wajib diisi.',
          },
          400
        );
      }

      const ta = await store.getActiveTahunAjaran();
      const user = c.get('user')!;
      const created = await store.createKalender({
        tahun_ajaran_id: tahun_ajaran_id ? Number(tahun_ajaran_id) : (ta ? ta.id : 1),
        judul_kegiatan,
        deskripsi: deskripsi || null,
        tanggal_mulai,
        tanggal_selesai: tanggal_selesai || tanggal_mulai,
        tipe_kegiatan: tipe_kegiatan || 'KBM',
        warna: warna || 'emerald',
      });

      await store.createAuditLog({
        user_id: user.id,
        username: user.username,
        action: 'CREATE',
        entity: 'kalender',
        details: `Menambah agenda kalender: ${judul_kegiatan}`,
        ip_address: getClientIp(c),
      });

      return c.json(
        {
          success: true,
          data: created,
          message: 'Agenda kalender akademik berhasil ditambahkan.',
        },
        201
      );
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  }
);

informasiRouter.put(
  '/kalender/:id',
  authMiddleware,
  requirePermission('kalender', 'ubah'),
  async (c) => {
    try {
      const store = getStore(c.env?.DATABASE_URL);
      if (!store) {
        return c.json(
          { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
          500
        );
      }

      const id = Number(c.req.param('id'));
      const body = await c.req.json().catch(() => ({}));
      const user = c.get('user')!;
      const updated = await store.updateKalender(id, body);

      await store.createAuditLog({
        user_id: user.id,
        username: user.username,
        action: 'UPDATE',
        entity: 'kalender',
        details: `Memperbarui agenda kalender ID: ${id}`,
        ip_address: getClientIp(c),
      });

      return c.json({
        success: true,
        data: updated,
        message: 'Agenda kalender akademik berhasil diperbarui.',
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  }
);

informasiRouter.delete(
  '/kalender/:id',
  authMiddleware,
  requirePermission('kalender', 'hapus'),
  async (c) => {
    try {
      const store = getStore(c.env?.DATABASE_URL);
      if (!store) {
        return c.json(
          { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
          500
        );
      }

      const id = Number(c.req.param('id'));
      const user = c.get('user')!;
      const ok = await store.deleteKalender(id);

      if (!ok) {
        return c.json({ success: false, message: 'Agenda kalender tidak ditemukan.' }, 404);
      }

      await store.createAuditLog({
        user_id: user.id,
        username: user.username,
        action: 'DELETE',
        entity: 'kalender',
        details: `Menghapus agenda kalender ID: ${id}`,
        ip_address: getClientIp(c),
      });

      return c.json({
        success: true,
        message: 'Agenda kalender akademik berhasil dihapus.',
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  }
);
