import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { authMiddleware, hashPassword } from '../auth.ts';
import { store } from '../store.ts';
import { StafCreateSchema, StafUpdateSchema } from '../zod-schemas.ts';

export const stafRouter = new Hono<AppContext>();

stafRouter.use('*', authMiddleware);

// Middleware khusus admin
stafRouter.use('*', async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    return c.json(
      {
        success: false,
        message: 'Hanya Administrator yang memiliki akses ke modul ini.',
      },
      403
    );
  }
  await next();
});

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// 1. LIST SEMUA STAF
stafRouter.get('/', async (c) => {
  const staffList = store.getAllStaf();
  return c.json({
    success: true,
    data: staffList,
    message: 'Data staf berhasil diambil.',
  });
});

// 2. TAMBAH STAF BARU
stafRouter.post('/', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const parseResult = StafCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || 'Input data staf tidak valid',
        },
        400
      );
    }

    const { username, nama_lengkap, email, password, staf_role, is_active, permissions } =
      parseResult.data;

    if (store.getUserByUsername(username)) {
      return c.json(
        {
          success: false,
          message: `Username '${username}' sudah digunakan. Silakan gunakan username lain.`,
        },
        400
      );
    }

    const password_hash = await hashPassword(password);

    const defaultPermissions = permissions || [
      { module: 'siswa', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { module: 'guru', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { module: 'kelas', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { module: 'mapel', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { module: 'tahun_ajaran', can_view: true, can_create: false, can_edit: false, can_delete: false },
      { module: 'pengaturan', can_view: false, can_create: false, can_edit: false, can_delete: false },
      { module: 'staf', can_view: false, can_create: false, can_edit: false, can_delete: false },
      { module: 'audit_log', can_view: false, can_create: false, can_edit: false, can_delete: false },
    ];

    const newUser = store.createUser({
      username,
      nama_lengkap,
      email,
      password_hash,
      role: 'staf',
      staf_role,
      is_active,
      must_change_password: false,
      permissions: defaultPermissions,
    });

    const user = c.get('user')!;
    store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'CREATE',
      entity: 'staf',
      details: `Menambahkan akun staf baru: ${username} (${staf_role})`,
      ip_address: getClientIp(c),
    });

    const { password_hash: _, ...safeUser } = newUser;

    return c.json(
      {
        success: true,
        data: safeUser,
        message: 'Akun staf berhasil dibuat.',
      },
      201
    );
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: 'Gagal menambahkan staf baru.',
        error: error?.message,
      },
      500
    );
  }
});

// 3. UPDATE STAF & HAK AKSES
stafRouter.put('/:id', async (c) => {
  try {
    const id = Number(c.req.param('id'));
    const existing = store.getUserById(id);
    if (!existing || existing.role !== 'staf') {
      return c.json(
        {
          success: false,
          message: 'Akun staf tidak ditemukan.',
        },
        404
      );
    }

    const body = await c.req.json().catch(() => ({}));
    const parseResult = StafUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || 'Input data staf tidak valid',
        },
        400
      );
    }

    const { nama_lengkap, email, password, staf_role, is_active, permissions } = parseResult.data;

    const updatePayload: any = {
      nama_lengkap,
      email,
      staf_role,
      is_active,
      permissions,
    };

    if (password && password.trim().length >= 6) {
      updatePayload.password_hash = await hashPassword(password.trim());
    }

    const updated = store.updateUser(id, updatePayload);
    const user = c.get('user')!;

    store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      entity: 'staf',
      details: `Memperbarui data dan hak akses staf ${existing.username} (${staf_role})`,
      ip_address: getClientIp(c),
    });

    const { password_hash: _, ...safeUser } = updated!;

    return c.json({
      success: true,
      data: safeUser,
      message: 'Data staf berhasil diperbarui.',
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: 'Gagal memperbarui staf.',
        error: error?.message,
      },
      500
    );
  }
});

// 4. TOGGLE STATUS AKTIF / NONAKTIF
stafRouter.patch('/:id/status', async (c) => {
  const id = Number(c.req.param('id'));
  const existing = store.getUserById(id);
  if (!existing || existing.role !== 'staf') {
    return c.json(
      {
        success: false,
        message: 'Akun staf tidak ditemukan.',
      },
      404
    );
  }

  const newStatus = !existing.is_active;
  const updated = store.updateUser(id, { is_active: newStatus });
  const user = c.get('user')!;

  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'UPDATE',
    entity: 'staf',
    details: `${newStatus ? 'Mengaktifkan' : 'Menonaktifkan'} akun staf ${existing.username}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    data: updated,
    message: `Akun staf berhasil ${newStatus ? 'diaktifkan' : 'dinonaktifkan'}.`,
  });
});

// 5. HAPUS AKUN STAF
stafRouter.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const existing = store.getUserById(id);
  if (!existing || existing.role !== 'staf') {
    return c.json(
      {
        success: false,
        message: 'Akun staf tidak ditemukan.',
      },
      404
    );
  }

  store.deleteUser(id);
  const user = c.get('user')!;

  store.createAuditLog({
    user_id: user.id,
    username: user.username,
    action: 'DELETE',
    entity: 'staf',
    details: `Menghapus akun staf ${existing.username}`,
    ip_address: getClientIp(c),
  });

  return c.json({
    success: true,
    message: 'Akun staf berhasil dihapus.',
  });
});
