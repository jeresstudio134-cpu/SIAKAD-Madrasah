import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { authMiddleware } from '../auth.ts';
import { getStore } from '../store.ts';
import { getSignedUploadParams, isCloudinaryConfigured } from '../cloudinary.ts';

export const ppdbRouter = new Hono<AppContext>();

function ensurePPDBStaff(c: any, next: () => Promise<void>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ success: false, message: 'Tidak terotentikasi.' }, 401);
  }

  if (
    user.role === 'admin' ||
    user.staf_role === 'TU' ||
    (user.role === 'staf' && user.staf_role !== 'Keuangan')
  ) {
    return next();
  }

  const hasPerm = (user.permissions || []).some(
    (p: any) => p.module === 'ppdb' && p.can_view
  );
  if (hasPerm) return next();

  return c.json(
    {
      success: false,
      message:
        'Akses ditolak. Pengelolaan PPDB hanya dapat diakses oleh Administrator dan Staf Tata Usaha.',
    },
    403
  );
}

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// ==========================================
// 1. PUBLIC ROUTES (Tanpa Login)
// ==========================================

// Info publik PPDB
ppdbRouter.get('/info', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const taAktif = await store.getActiveTahunAjaran();
    const stats = await store.getPPDBStats(taAktif?.id);
    const profile = (await store.getMadrasahProfile()) || {
      nama: 'Madrasah Tsanawiyah',
      nsm: '-',
      npsn: '-',
      alamat: '-',
      telepon: '-',
      email: '-',
      logo_url: null,
    };

    return c.json({
      success: true,
      data: {
        tahunAjaran: taAktif,
        madrasah: {
          nama: profile.nama,
          nsm: profile.nsm,
          npsn: profile.npsn,
          alamat: profile.alamat,
          telepon: profile.telepon,
          email: profile.email,
          logo_url: profile.logo_url,
        },
        jalurPendaftaran: [
          {
            nama: 'Reguler',
            deskripsi: 'Jalur seleksi tes potensi akademik dan wawancara dasar.',
            kuota: 60,
          },
          {
            nama: 'Prestasi',
            deskripsi:
              'Jalur tanpa tes tertulis bagi pemenang kompetisi sains, seni, atau olahraga minimal tingkat kota/kabupaten.',
            kuota: 25,
          },
          {
            nama: 'Tahfidz',
            deskripsi:
              'Jalur khusus santri dengan hafalan Al-Qur`an minimal 1 Juz mutqin.',
            kuota: 25,
          },
          {
            nama: 'Afirmasi',
            deskripsi:
              'Jalur khusus pemegang KIP/PKH dan santri prasejahtera berprestasi.',
            kuota: 10,
          },
        ],
        syaratBerkas: [
          'Pas Foto Calon Santri (Latar Merah/Biru, format JPG/PNG)',
          'Scan Ijazah / Surat Keterangan Lulus (SKL) SD/MI',
          'Scan Akta Kelahiran Asli',
          'Scan Kartu Keluarga (KK)',
        ],
        stats: {
          totalPendaftar: stats.total,
          targetKuota: 120,
        },
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// Upload berkas pendaftaran (mendukung Cloudinary via base64 / direct upload)
ppdbRouter.post('/upload', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { file, folder } = body;
    if (!file) {
      return c.json({ success: false, message: 'File wajib disertakan.' }, 400);
    }

    const targetFolder = folder || 'siakad_ppdb';
    if (isCloudinaryConfigured(c.env)) {
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
            message: 'Berkas berhasil diunggah ke Cloudinary.',
          });
        }
      }
    }

    // Fallback: simpan base64 data URI langsung
    return c.json({
      success: true,
      data: { url: file },
      message: 'Berkas berhasil disimpan.',
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: err.message || 'Gagal mengunggah berkas.',
      },
      500
    );
  }
});

// Pendaftaran santri baru (Publik)
ppdbRouter.post('/daftar', async (c) => {
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
      nama_lengkap,
      nisn,
      nik,
      jenis_kelamin,
      tempat_lahir,
      tanggal_lahir,
      sekolah_asal,
      nama_ayah,
      nama_ibu,
      telepon_ortu,
      email_ortu,
      alamat,
      jalur_pendaftaran,
      tahun_ajaran_id,
      berkas_foto_url,
      berkas_ijazah_url,
      berkas_akta_url,
      berkas_kk_url,
    } = body;

    if (!nama_lengkap || !jenis_kelamin) {
      return c.json(
        {
          success: false,
          message: 'Nama lengkap dan jenis kelamin calon santri wajib diisi.',
        },
        400
      );
    }

    const pendaftar = await store.createPPDB({
      nama_lengkap,
      nisn,
      nik,
      jenis_kelamin,
      tempat_lahir,
      tanggal_lahir,
      sekolah_asal,
      nama_ayah,
      nama_ibu,
      telepon_ortu,
      email_ortu,
      alamat,
      jalur_pendaftaran: jalur_pendaftaran || 'Reguler',
      tahun_ajaran_id: tahun_ajaran_id ? Number(tahun_ajaran_id) : undefined,
      berkas_foto_url,
      berkas_ijazah_url,
      berkas_akta_url,
      berkas_kk_url,
    });

    return c.json(
      {
        success: true,
        data: pendaftar,
        message: `Pendaftaran berhasil! Nomor Pendaftaran Anda: ${pendaftar.nomor_pendaftaran}. Simpan nomor ini untuk memeriksa status seleksi.`,
      },
      201
    );
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

// Cek status pendaftaran secara publik
ppdbRouter.get('/cek/:nomor', async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const nomor = c.req.param('nomor');
    const pendaftar = await store.getPPDBByNomor(nomor);

    if (!pendaftar) {
      return c.json(
        {
          success: false,
          message: `Data pendaftaran dengan nomor "${nomor}" tidak ditemukan. Pastikan nomor yang dimasukkan benar.`,
        },
        404
      );
    }

    return c.json({
      success: true,
      data: pendaftar,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ==========================================
// 2. PROTECTED ROUTES (Admin & Staf TU)
// ==========================================

// Daftar seluruh pendaftar
ppdbRouter.get('/pendaftar', authMiddleware, ensurePPDBStaff, async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const status = c.req.query('status');
    const jalur = c.req.query('jalur');
    const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const search = c.req.query('search');
    const page = Number(c.req.query('page') || 1);
    const limit = Number(c.req.query('limit') || 15);

    const result = await store.getPPDBList({
      status,
      jalur,
      tahun_ajaran_id,
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

// Detail pendaftar
ppdbRouter.get('/pendaftar/:id', authMiddleware, ensurePPDBStaff, async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const id = Number(c.req.param('id'));
    const data = await store.getPPDBById(id);
    if (!data) {
      return c.json({ success: false, message: 'Data pendaftar tidak ditemukan.' }, 404);
    }
    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// Verifikasi pendaftar (Ubah status: terverifikasi, diterima, cadangan, ditolak)
ppdbRouter.put('/pendaftar/:id/verifikasi', authMiddleware, ensurePPDBStaff, async (c) => {
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
    const { status, catatan_verifikasi } = body;

    if (!status) {
      return c.json(
        {
          success: false,
          message: 'Status verifikasi wajib dipilih.',
        },
        400
      );
    }

    const user = c.get('user')!;
    const updated = await store.verifikasiPPDB(id, {
      status,
      catatan_verifikasi,
      user_id: user.id,
    });

    if (!updated) {
      return c.json({ success: false, message: 'Data pendaftar tidak ditemukan.' }, 404);
    }

    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      entity: 'ppdb',
      details: `Verifikasi pendaftaran ${updated.nomor_pendaftaran} menjadi ${updated.status}`,
      ip_address: getClientIp(c),
    });

    return c.json({
      success: true,
      data: updated,
      message: `Status pendaftaran ${updated.nomor_pendaftaran} berhasil diubah menjadi: ${updated.status.toUpperCase()}.`,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

// Konversi calon siswa diterima menjadi siswa aktif
ppdbRouter.post('/pendaftar/:id/konversi', authMiddleware, ensurePPDBStaff, async (c) => {
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
    const { kelas_id, nis } = body;

    const ta = await store.getActiveTahunAjaran();
    const tahun_ajaran_id = ta ? ta.id : 1;

    const user = c.get('user')!;
    const siswaCreated = await store.konversiPPDBSiswa(id, {
      kelas_id: Number(kelas_id),
      nis,
      tahun_ajaran_id,
    });

    await store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      entity: 'ppdb',
      details: `Konversi calon santri PPDB ID: ${id} menjadi siswa aktif (NIS: ${siswaCreated.nis})`,
      ip_address: getClientIp(c),
    });

    return c.json({
      success: true,
      data: siswaCreated,
      message: `Calon siswa ${siswaCreated.nama} berhasil dikonversi menjadi siswa aktif (NIS: ${siswaCreated.nis}).`,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 400);
  }
});

// Statistik PPDB
ppdbRouter.get('/stats', authMiddleware, ensurePPDBStaff, async (c) => {
  try {
    const store = getStore(c.env?.DATABASE_URL);
    if (!store) {
      return c.json(
        { success: false, message: 'Koneksi database Neon gagal (DATABASE_URL tidak ditemukan).' },
        500
      );
    }

    const taId = c.req.query('tahun_ajaran_id')
      ? Number(c.req.query('tahun_ajaran_id'))
      : undefined;
    const stats = await store.getPPDBStats(taId);
    return c.json({ success: true, data: stats });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});
