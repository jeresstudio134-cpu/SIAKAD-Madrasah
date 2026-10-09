import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { authMiddleware, requirePermission } from '../auth.ts';
import { store } from '../store.ts';

export const akademikRouter = new Hono<AppContext>();

akademikRouter.use('*', authMiddleware);

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// Helper check apakah guru memiliki hak akses ke kelas/mapel tertentu
function checkGuruAccess(
  user: any,
  kelas_id?: number,
  mapel_id?: number,
  tahun_ajaran_id?: number
): { allowed: boolean; message?: string } {
  if (user?.role === 'admin' || (user?.role === 'staf' && !user?.guru_id)) {
    return { allowed: true };
  }

  const guruId = user?.guru_id;
  if (!guruId) {
    return { allowed: true };
  }

  const activeTa = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;
  const scope = store.getGuruAccessScope(guruId, activeTa);

  if (kelas_id && !scope.allowedKelasIds.includes(Number(kelas_id))) {
    return {
      allowed: false,
      message: 'Anda hanya dapat mengakses kelas yang Anda ampu atau di mana Anda menjadi wali kelas.',
    };
  }

  if (mapel_id && !scope.taughtMapelIds.includes(Number(mapel_id))) {
    const isWali = kelas_id && scope.waliKelasIds.includes(Number(kelas_id));
    if (!isWali) {
      return {
        allowed: false,
        message: 'Anda hanya dapat menginput nilai untuk mata pelajaran yang Anda ampu.',
      };
    }
  }

  return { allowed: true };
}

// ==========================================
// 1. SCOPE & AKUN GURU
// ==========================================
akademikRouter.get('/guru-scope', async (c) => {
  const user = c.get('user');
  const activeTa = store.getActiveTahunAjaran()?.id || 1;
  const isGuru = user?.role === 'guru' || Boolean(user?.guru_id);

  if (isGuru && user?.guru_id) {
    const scope = store.getGuruAccessScope(user.guru_id, activeTa);
    return c.json({
      success: true,
      data: {
        isGuru: true,
        guru_id: user.guru_id,
        waliKelasIds: scope.waliKelasIds,
        allowedKelasIds: scope.allowedKelasIds,
        taughtMapelIds: scope.taughtMapelIds,
      },
    });
  }

  return c.json({
    success: true,
    data: {
      isGuru: false,
      guru_id: null,
      waliKelasIds: [],
      allowedKelasIds: store.kelas.map((k) => k.id),
      taughtMapelIds: store.mapel.map((m) => m.id),
    },
  });
});

// ==========================================
// 2. PENEMPATAN SISWA, KENAIKAN KELAS & KELULUSAN
// ==========================================
akademikRouter.get('/penempatan', requirePermission('akademik', 'lihat'), async (c) => {
  const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
  const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
    ? Number(c.req.query('tahun_ajaran_id'))
    : undefined;
  const status = c.req.query('status');

  const list = store.getPenempatanList({
    kelas_id,
    tahun_ajaran_id,
    status,
  });

  return c.json({
    success: true,
    data: list,
  });
});

akademikRouter.get('/penempatan/unassigned', requirePermission('akademik', 'lihat'), async (c) => {
  const taId = c.req.query('tahun_ajaran_id')
    ? Number(c.req.query('tahun_ajaran_id'))
    : store.getActiveTahunAjaran()?.id || 1;

  const unassigned = store.getSiswaTanpaKelas(taId);
  return c.json({
    success: true,
    data: unassigned,
  });
});

akademikRouter.post('/penempatan/batch', requirePermission('akademik', 'tambah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { siswa_ids, kelas_id, tahun_ajaran_id } = body;
  if (!siswa_ids || !Array.isArray(siswa_ids) || siswa_ids.length === 0 || !kelas_id) {
    return c.json(
      {
        success: false,
        message: 'Daftar siswa dan kelas tujuan harus dipilih.',
      },
      400
    );
  }

  const taId = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;
  const result = store.batchTempatkanSiswa(siswa_ids, Number(kelas_id), Number(taId));

  const user = c.get('user')!;
  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'akademik',
    details: `Menempatkan ${siswa_ids.length} siswa ke kelas ID ${kelas_id}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: result,
    message: `Berhasil menempatkan ${result.length} siswa ke kelas.`,
  });
});

akademikRouter.post('/penempatan/kenaikan-kelas', requirePermission('akademik', 'ubah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { siswa_ids, kelas_tujuan_id, tahun_ajaran_tujuan_id, aksi } = body;
  if (!siswa_ids || !Array.isArray(siswa_ids) || siswa_ids.length === 0 || !kelas_tujuan_id) {
    return c.json(
      {
        success: false,
        message: 'Pilih siswa dan kelas tujuan kenaikan kelas.',
      },
      400
    );
  }

  const taId = tahun_ajaran_tujuan_id || store.getActiveTahunAjaran()?.id || 1;
  const result = store.batchKenaikanKelas(
    siswa_ids,
    Number(kelas_tujuan_id),
    Number(taId),
    aksi === 'tinggal' ? 'tinggal' : 'naik'
  );

  const user = c.get('user')!;
  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'akademik',
    details: `Proses kenaikan kelas massal: ${siswa_ids.length} siswa (${aksi || 'naik'})`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: result,
    message: `Berhasil memproses kenaikan kelas untuk ${result.length} siswa.`,
  });
});

akademikRouter.post('/penempatan/kelulusan', requirePermission('akademik', 'ubah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { siswa_ids, tahun_ajaran_id } = body;
  if (!siswa_ids || !Array.isArray(siswa_ids) || siswa_ids.length === 0) {
    return c.json(
      {
        success: false,
        message: 'Pilih siswa yang akan dinyatakan lulus.',
      },
      400
    );
  }

  const taId = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;
  const result = store.batchKelulusan(siswa_ids, Number(taId));

  const user = c.get('user')!;
  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'akademik',
    details: `Kelulusan massal: ${siswa_ids.length} siswa dinyatakan lulus`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: result,
    message: `Berhasil memproses kelulusan untuk ${result.length} siswa.`,
  });
});

// ==========================================
// 3. PENUGASAN GURU (PENGAJARAN) & WALI KELAS
// ==========================================
akademikRouter.get('/pengajaran', requirePermission('akademik', 'lihat'), async (c) => {
  const guru_id = c.req.query('guru_id') ? Number(c.req.query('guru_id')) : undefined;
  const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
  const mapel_id = c.req.query('mapel_id') ? Number(c.req.query('mapel_id')) : undefined;
  const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
    ? Number(c.req.query('tahun_ajaran_id'))
    : undefined;

  const list = store.getPengajaranList({
    guru_id,
    kelas_id,
    mapel_id,
    tahun_ajaran_id,
  });

  return c.json({
    success: true,
    data: list,
  });
});

akademikRouter.post('/pengajaran', requirePermission('akademik', 'tambah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { guru_id, mapel_id, kelas_id, tahun_ajaran_id, beban_jp } = body;
  if (!guru_id || !mapel_id || !kelas_id) {
    return c.json(
      {
        success: false,
        message: 'Guru, Mata Pelajaran, dan Kelas wajib dipilih.',
      },
      400
    );
  }

  const taId = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;
  const created = store.createPengajaran({
    guru_id: Number(guru_id),
    mapel_id: Number(mapel_id),
    kelas_id: Number(kelas_id),
    tahun_ajaran_id: Number(taId),
    beban_jp: Number(beban_jp) || 2,
  });

  const user = c.get('user')!;
  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'CREATE',
    entity: 'akademik',
    details: `Menugaskan guru ID ${guru_id} untuk mapel ID ${mapel_id} di kelas ID ${kelas_id}`,
    ip_address: getClientIp(c),
  });

  return c.json(
    {
      success: true,
      data: created,
      message: 'Penugasan guru berhasil disimpan.',
    },
    201
  );
});

akademikRouter.delete('/pengajaran/:id', requirePermission('akademik', 'hapus'), async (c) => {
  const id = Number(c.req.param('id'));
  store.deletePengajaran(id);

  return c.json({
    success: true,
    message: 'Penugasan guru berhasil dihapus.',
  });
});

akademikRouter.post('/wali-kelas', requirePermission('akademik', 'ubah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { kelas_id, guru_id } = body;
  if (!kelas_id) {
    return c.json({ success: false, message: 'Kelas harus dipilih.' }, 400);
  }

  const updated = store.setWaliKelas(
    Number(kelas_id),
    guru_id ? Number(guru_id) : null
  );

  const user = c.get('user')!;
  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'akademik',
    details: `Menetapkan wali kelas untuk kelas ID ${kelas_id}: guru ID ${guru_id || 'kosong'}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Wali kelas berhasil ditetapkan.',
  });
});

// ==========================================
// 4. JADWAL PELAJARAN (DETEKSI BENTROK)
// ==========================================
akademikRouter.get('/jadwal', requirePermission('akademik', 'lihat'), async (c) => {
  const tahun_ajaran_id = c.req.query('tahun_ajaran_id')
    ? Number(c.req.query('tahun_ajaran_id'))
    : undefined;
  const kelas_id = c.req.query('kelas_id') ? Number(c.req.query('kelas_id')) : undefined;
  const guru_id = c.req.query('guru_id') ? Number(c.req.query('guru_id')) : undefined;
  const hari = c.req.query('hari');

  const list = store.getJadwalList({
    tahun_ajaran_id,
    kelas_id,
    guru_id,
    hari,
  });

  return c.json({
    success: true,
    data: list,
  });
});

akademikRouter.post('/jadwal', requirePermission('akademik', 'tambah'), async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const {
      tahun_ajaran_id,
      kelas_id,
      mapel_id,
      guru_id,
      hari,
      jam_ke,
      jam_mulai,
      jam_selesai,
      ruang,
    } = body;

    if (!kelas_id || !mapel_id || !guru_id || !hari || !jam_ke) {
      return c.json(
        {
          success: false,
          message: 'Data jadwal belum lengkap (Hari, Jam Ke, Kelas, Mapel, Guru wajib diisi).',
        },
        400
      );
    }

    const taId = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;

    const created = store.createJadwal({
      tahun_ajaran_id: Number(taId),
      kelas_id: Number(kelas_id),
      mapel_id: Number(mapel_id),
      guru_id: Number(guru_id),
      hari,
      jam_ke: Number(jam_ke),
      jam_mulai: jam_mulai || '07:15',
      jam_selesai: jam_selesai || '08:35',
      ruang: ruang || 'Ruang Kelas',
    });

    const user = c.get('user')!;
    store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      entity: 'akademik',
      details: `Menambah jadwal pelajaran: ${hari} Jam Ke-${jam_ke} Kelas ID ${kelas_id}`,
      ip_address: getClientIp(c),
    });

    return c.json(
      {
        success: true,
        data: created,
        message: 'Jadwal pelajaran berhasil ditambahkan tanpa bentrok.',
      },
      201
    );
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: err.message || 'Gagal menambahkan jadwal pelajaran.',
      },
      400
    );
  }
});

akademikRouter.put('/jadwal/:id', requirePermission('akademik', 'ubah'), async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const body = await c.req.json().catch(() => ({}));
    const updated = store.updateJadwal(id, body);
    if (!updated) {
      return c.json({ success: false, message: 'Jadwal tidak ditemukan' }, 404);
    }

    return c.json({
      success: true,
      data: updated,
      message: 'Jadwal pelajaran berhasil diperbarui.',
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        message: err.message || 'Gagal memperbarui jadwal.',
      },
      400
    );
  }
});

akademikRouter.delete('/jadwal/:id', requirePermission('akademik', 'hapus'), async (c) => {
  const id = Number(c.req.param('id'));
  store.deleteJadwal(id);

  return c.json({
    success: true,
    message: 'Jadwal pelajaran berhasil dihapus.',
  });
});

// ==========================================
// 5. ABSENSI HARIAN SISWA & REKAP
// ==========================================
akademikRouter.get('/absensi', requirePermission('akademik', 'lihat'), async (c) => {
  const kelas_id = c.req.query('kelas_id');
  const tanggal = c.req.query('tanggal');
  const tahun_ajaran_id = c.req.query('tahun_ajaran_id');

  if (!kelas_id) {
    return c.json({ success: false, message: 'Kelas harus dipilih.' }, 400);
  }

  const access = checkGuruAccess(c.get('user'), Number(kelas_id));
  if (!access.allowed) {
    return c.json({ success: false, message: access.message }, 403);
  }

  const tgl = tanggal ? String(tanggal) : new Date().toISOString().slice(0, 10);
  const taId = tahun_ajaran_id ? Number(tahun_ajaran_id) : store.getActiveTahunAjaran()?.id || 1;

  const data = store.getAbsensiByTanggal(Number(kelas_id), tgl, taId);
  return c.json({
    success: true,
    data,
  });
});

akademikRouter.post('/absensi/batch', requirePermission('akademik', 'tambah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { kelas_id, tanggal, tahun_ajaran_id, items } = body;
  if (!kelas_id || !tanggal || !items || !Array.isArray(items)) {
    return c.json({ success: false, message: 'Data absensi tidak lengkap.' }, 400);
  }

  const access = checkGuruAccess(c.get('user'), Number(kelas_id));
  if (!access.allowed) {
    return c.json({ success: false, message: access.message }, 403);
  }

  const user = c.get('user')!;
  const taId = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;
  store.saveBatchAbsensi(Number(kelas_id), String(tanggal), Number(taId), items, user.id);

  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'akademik',
    details: `Input absensi kelas ID ${kelas_id} tanggal ${tanggal} (${items.length} siswa)`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Data absensi harian berhasil disimpan.',
  });
});

akademikRouter.get('/absensi/rekap', requirePermission('akademik', 'lihat'), async (c) => {
  const kelas_id = c.req.query('kelas_id');
  const tahun_ajaran_id = c.req.query('tahun_ajaran_id');
  const bulan = c.req.query('bulan');
  const tahun = c.req.query('tahun');

  if (!kelas_id) {
    return c.json({ success: false, message: 'Kelas harus dipilih.' }, 400);
  }

  const access = checkGuruAccess(c.get('user'), Number(kelas_id));
  if (!access.allowed) {
    return c.json({ success: false, message: access.message }, 403);
  }

  const taId = tahun_ajaran_id ? Number(tahun_ajaran_id) : store.getActiveTahunAjaran()?.id || 1;
  const rekap = store.getRekapAbsensi(
    Number(kelas_id),
    taId,
    bulan ? Number(bulan) : undefined,
    tahun ? Number(tahun) : undefined
  );

  return c.json({
    success: true,
    data: rekap,
  });
});

// ==========================================
// 6. BOBOT PENILAIAN & INPUT NILAI SISWA
// ==========================================
akademikRouter.get('/bobot', async (c) => {
  const taId = c.req.query('tahun_ajaran_id')
    ? Number(c.req.query('tahun_ajaran_id'))
    : store.getActiveTahunAjaran()?.id || 1;

  const bobot = store.getBobotNilai(taId);
  return c.json({
    success: true,
    data: bobot,
  });
});

akademikRouter.post('/bobot', requirePermission('akademik', 'ubah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { tahun_ajaran_id, bobot_tugas, bobot_uh, bobot_uts, bobot_uas, bobot_keterampilan } =
    body;

  const taId = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;
  const total =
    Number(bobot_tugas) +
    Number(bobot_uh) +
    Number(bobot_uts) +
    Number(bobot_uas) +
    Number(bobot_keterampilan);

  if (total !== 100) {
    return c.json(
      {
        success: false,
        message: `Total bobot penilaian harus sama dengan 100% (saat ini ${total}%).`,
      },
      400
    );
  }

  const updated = store.saveBobotNilai(Number(taId), {
    bobot_tugas: Number(bobot_tugas),
    bobot_uh: Number(bobot_uh),
    bobot_uts: Number(bobot_uts),
    bobot_uas: Number(bobot_uas),
    bobot_keterampilan: Number(bobot_keterampilan),
  });

  return c.json({
    success: true,
    data: updated,
    message: 'Konfigurasi bobot penilaian berhasil diperbarui.',
  });
});

akademikRouter.get('/nilai', requirePermission('akademik', 'lihat'), async (c) => {
  const kelas_id = c.req.query('kelas_id');
  const mapel_id = c.req.query('mapel_id');
  const tahun_ajaran_id = c.req.query('tahun_ajaran_id');

  if (!kelas_id || !mapel_id) {
    return c.json(
      {
        success: false,
        message: 'Kelas dan Mata Pelajaran harus dipilih.',
      },
      400
    );
  }

  const access = checkGuruAccess(c.get('user'), Number(kelas_id), Number(mapel_id));
  if (!access.allowed) {
    return c.json({ success: false, message: access.message }, 403);
  }

  const taId = tahun_ajaran_id ? Number(tahun_ajaran_id) : store.getActiveTahunAjaran()?.id || 1;
  const data = store.getNilaiByKelasMapel(Number(kelas_id), Number(mapel_id), taId);

  return c.json({
    success: true,
    data,
  });
});

akademikRouter.post('/nilai/batch', requirePermission('akademik', 'ubah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { kelas_id, mapel_id, tahun_ajaran_id, items } = body;
  if (!kelas_id || !mapel_id || !items || !Array.isArray(items)) {
    return c.json(
      {
        success: false,
        message: 'Data input nilai tidak lengkap.',
      },
      400
    );
  }

  const access = checkGuruAccess(c.get('user'), Number(kelas_id), Number(mapel_id));
  if (!access.allowed) {
    return c.json({ success: false, message: access.message }, 403);
  }

  const taId = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;
  store.saveBatchNilai(Number(kelas_id), Number(mapel_id), Number(taId), items);

  const user = c.get('user')!;
  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'akademik',
    details: `Input nilai mapel ID ${mapel_id} di kelas ID ${kelas_id} (${items.length} siswa)`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Nilai siswa berhasil disimpan dan nilai akhir dihitung otomatis.',
  });
});

// ==========================================
// 7. NILAI SIKAP & TAHFIDZ HAFALAN
// ==========================================
akademikRouter.get('/catatan-rapor', requirePermission('akademik', 'lihat'), async (c) => {
  const kelas_id = c.req.query('kelas_id');
  const tahun_ajaran_id = c.req.query('tahun_ajaran_id');

  if (!kelas_id) {
    return c.json({ success: false, message: 'Kelas harus dipilih.' }, 400);
  }

  const access = checkGuruAccess(c.get('user'), Number(kelas_id));
  if (!access.allowed) {
    return c.json({ success: false, message: access.message }, 403);
  }

  const taId = tahun_ajaran_id ? Number(tahun_ajaran_id) : store.getActiveTahunAjaran()?.id || 1;
  const data = store.getCatatanRaporByKelas(Number(kelas_id), taId);

  return c.json({
    success: true,
    data,
  });
});

akademikRouter.post('/catatan-rapor/batch', requirePermission('akademik', 'ubah'), async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { kelas_id, tahun_ajaran_id, items } = body;
  if (!kelas_id || !items || !Array.isArray(items)) {
    return c.json({ success: false, message: 'Data sikap/tahfidz tidak valid.' }, 400);
  }

  const access = checkGuruAccess(c.get('user'), Number(kelas_id));
  if (!access.allowed) {
    return c.json({ success: false, message: access.message }, 403);
  }

  const taId = tahun_ajaran_id || store.getActiveTahunAjaran()?.id || 1;
  store.saveCatatanRapor(Number(kelas_id), Number(taId), items);

  const user = c.get('user')!;
  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'akademik',
    details: `Menyimpan rekap sikap spiritual, sosial & tahfidz kelas ID ${kelas_id}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Catatan sikap, hafalan tahfidz, dan wali kelas berhasil disimpan.',
  });
});

// ==========================================
// 8. RAPOR DAN TRANSKRIP LENGKAP
// ==========================================
akademikRouter.get('/rapor/:siswa_id', requirePermission('akademik', 'lihat'), async (c) => {
  const siswaId = Number(c.req.param('siswa_id'));
  const taId = c.req.query('tahun_ajaran_id') ? Number(c.req.query('tahun_ajaran_id')) : undefined;

  const data = store.getRaporLengkap(siswaId, taId);
  if (!data) {
    return c.json(
      {
        success: false,
        message: 'Data siswa atau rapor tidak ditemukan.',
      },
      404
    );
  }

  const access = checkGuruAccess(c.get('user'), data.kelas?.id);
  if (!access.allowed) {
    return c.json({ success: false, message: access.message }, 403);
  }

  return c.json({
    success: true,
    data,
  });
});
