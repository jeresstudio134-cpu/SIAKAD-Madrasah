import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import {
  generateToken,
  comparePassword,
  hashPassword,
  authMiddleware,
  setAuthCookie,
  clearAuthCookie,
} from '../auth.ts';
import { store } from '../store.ts';
import { LoginSchema, ChangePasswordSchema } from '../zod-schemas.ts';

export const authRouter = new Hono<AppContext>();

function getClientIp(c: any): string {
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ||
    '127.0.0.1'
  );
}

// 1. LOGIN
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || 'Input login tidak valid',
        },
        400
      );
    }

    const { username, password } = parseResult.data;
    const user = store.getUserByUsername(username);

    if (!user) {
      return c.json(
        {
          success: false,
          message: 'Username atau password salah.',
        },
        401
      );
    }

    if (!user.is_active) {
      return c.json(
        {
          success: false,
          message: 'Akun Anda dinonaktifkan. Hubungi Administrator.',
        },
        403
      );
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return c.json(
        {
          success: false,
          message: 'Username atau password salah.',
        },
        401
      );
    }

    const token = await generateToken(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        stafRole: user.staf_role,
        guruId: user.guru_id,
        mustChangePassword: user.must_change_password,
      },
      c.env
    );

    setAuthCookie(c, token);

    store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'LOGIN',
      entity: 'auth',
      details: `User ${user.username} (${user.role}) berhasil masuk.`,
      ip_address: getClientIp(c),
    });

    const { password_hash, ...safeUser } = user;

    return c.json({
      success: true,
      data: {
        user: safeUser,
        token,
      },
      message: 'Login berhasil.',
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: 'Terjadi kesalahan internal pada server.',
        error: error?.message,
      },
      500
    );
  }
});

// 2. LOGOUT
authRouter.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user) {
    store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'LOGOUT',
      entity: 'auth',
      details: `User ${user.username} logout dari sistem.`,
      ip_address: getClientIp(c),
    });
  }

  clearAuthCookie(c);
  return c.json({
    success: true,
    message: 'Berhasil keluar dari sistem.',
  });
});

// 3. ME (Session Check)
authRouter.get('/me', authMiddleware, async (c) => {
  return c.json({
    success: true,
    data: {
      user: c.get('user'),
    },
  });
});

// 4. GANTI PASSWORD
authRouter.post('/change-password', authMiddleware, async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const parseResult = ChangePasswordSchema.safeParse(body);
    if (!parseResult.success) {
      return c.json(
        {
          success: false,
          message: parseResult.error.issues[0]?.message || 'Input password tidak valid',
        },
        400
      );
    }

    const userState = c.get('user');
    const { old_password, new_password } = parseResult.data;
    const user = store.getUserById(userState!.id);

    if (!user) {
      return c.json(
        {
          success: false,
          message: 'Pengguna tidak ditemukan.',
        },
        404
      );
    }

    const isMatch = await comparePassword(old_password, user.password_hash);
    if (!isMatch) {
      return c.json(
        {
          success: false,
          message: 'Password lama Anda tidak cocok.',
        },
        400
      );
    }

    const newHash = await hashPassword(new_password);
    user.password_hash = newHash;
    user.must_change_password = false;
    user.updated_at = new Date();

    store.createAuditLog({
      user_id: user.id,
      username: user.username,
      action: 'UPDATE',
      entity: 'auth',
      details: `User ${user.username} memperbarui password akun.`,
      ip_address: getClientIp(c),
    });

    const refreshedToken = await generateToken(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        stafRole: user.staf_role,
        guruId: user.guru_id,
        mustChangePassword: false,
      },
      c.env
    );

    setAuthCookie(c, refreshedToken);

    return c.json({
      success: true,
      data: {
        token: refreshedToken,
      },
      message: 'Password berhasil diubah. Sesi Anda telah diperbarui.',
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: 'Gagal memperbarui password.',
        error: error?.message,
      },
      500
    );
  }
});
