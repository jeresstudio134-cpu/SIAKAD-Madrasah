import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { authMiddleware, requirePermission } from '../auth.ts';
import { store } from '../store.ts';

export const informasiRouter = new Hono<AppContext>();

// ==========================================
// 1. PENGUMUMAN
// ==========================================

// Daftar pengumuman (bisa diakses publik atau sesuai role user)
informasiRouter.get('/pengumuman', async (c) => {
  try {
    const target_audiens = c.req.query('target_audiens');
    const kategori = c.req.query('kategori');
    const search = c.req.query('search');

    const list = store.getPengumumanList({
      target_audiens,
      kategori,
      search,
    });
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

informasiRouter.get('/pengumuman/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const item = store.getPengumumanById(id);
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
      const created = store.createPengumuman(
        {
          judul,
          konten,
          kategori,
          target_audiens,
          is_pinned,
          is_published,
        },
        user.id,
        user.nama_lengkap || user.username
      );

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
      const id = Number(c.req.param('id'));
      const body = await c.req.json().catch(() => ({}));
      const user = c.get('user')!;
      const updated = store.updatePengumuman(
        id,
        body,
        user.id,
        user.nama_lengkap || user.username
      );

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
      const id = Number(c.req.param('id'));
      const user = c.get('user')!;
      const ok = store.deletePengumuman(
        id,
        user.id,
        user.nama_lengkap || user.username
      );

      if (!ok) {
        return c.json({ success: false, message: 'Pengumuman tidak ditemukan.' }, 404);
      }

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
    const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const search = c.req.query('search');

    const list = store.getKalenderList({
      tahun_ajaran_id,
      search,
    });
    return c.json({ success: true, data: list });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

informasiRouter.get('/kalender/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const item = store.getKalenderById(id);
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

      const user = c.get('user')!;
      const created = store.createKalender(
        {
          tahun_ajaran_id: tahun_ajaran_id || 1,
          judul_kegiatan,
          deskripsi,
          tanggal_mulai,
          tanggal_selesai,
          tipe_kegiatan,
          warna,
        },
        user.id,
        user.nama_lengkap || user.username
      );

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
      const id = Number(c.req.param('id'));
      const body = await c.req.json().catch(() => ({}));
      const user = c.get('user')!;
      const updated = store.updateKalender(
        id,
        body,
        user.id,
        user.nama_lengkap || user.username
      );

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
      const id = Number(c.req.param('id'));
      const user = c.get('user')!;
      const ok = store.deleteKalender(
        id,
        user.id,
        user.nama_lengkap || user.username
      );

      if (!ok) {
        return c.json({ success: false, message: 'Agenda kalender tidak ditemukan.' }, 404);
      }

      return c.json({
        success: true,
        message: 'Agenda kalender akademik berhasil dihapus.',
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 400);
    }
  }
);
