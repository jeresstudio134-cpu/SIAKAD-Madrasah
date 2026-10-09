import { Context, MiddlewareHandler } from 'hono';
import { sign, verify } from 'hono/jwt';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import bcrypt from 'bcryptjs';
import { AppContext, Bindings } from './types.ts';
import { store } from './store.ts';

export const TOKEN_COOKIE_NAME = 'siakad_token';

export interface TokenPayload {
  userId: number;
  username: string;
  role: 'admin' | 'staf' | 'guru';
  stafRole?: string | null;
  guruId?: number | null;
  mustChangePassword?: boolean;
  exp?: number;
}

export function getJwtSecret(env?: Bindings): string {
  return env?.JWT_SECRET || 'siakad_madrasah_default_secret_key_2025';
}

export async function generateToken(payload: TokenPayload, env?: Bindings): Promise<string> {
  const secret = getJwtSecret(env);
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 hari
  return await sign({ ...payload, exp }, secret, 'HS256');
}

export async function verifyToken(token: string, env?: Bindings): Promise<TokenPayload | null> {
  try {
    const secret = getJwtSecret(env);
    const decoded = await verify(token, secret, 'HS256');
    return decoded as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function setAuthCookie(c: Context<AppContext>, token: string) {
  setCookie(c, TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearAuthCookie(c: Context<AppContext>) {
  deleteCookie(c, TOKEN_COOKIE_NAME, {
    path: '/',
    secure: true,
    sameSite: 'Lax',
  });
}

/**
 * Middleware otentikasi utama untuk Hono
 */
export const authMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  let token = getCookie(c, TOKEN_COOKIE_NAME);
  if (!token) {
    const authHeader = c.req.header('authorization') || c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return c.json(
      {
        success: false,
        message: 'Akses ditolak. Sesi tidak ditemukan atau telah kedaluwarsa.',
      },
      401
    );
  }

  const payload = await verifyToken(token, c.env);
  if (!payload) {
    return c.json(
      {
        success: false,
        message: 'Token otentikasi tidak valid.',
      },
      401
    );
  }

  const user = store.getUserById(payload.userId);
  if (!user || !user.is_active) {
    return c.json(
      {
        success: false,
        message: 'Akun tidak ditemukan atau telah dinonaktifkan.',
      },
      401
    );
  }

  const { password_hash, ...safeUser } = user;
  c.set('user', safeUser as any);
  await next();
};

/**
 * Middleware izin modul & peran (RBAC)
 */
export function requirePermission(
  module:
    | 'tahun_ajaran'
    | 'kelas'
    | 'mapel'
    | 'guru'
    | 'siswa'
    | 'pengaturan'
    | 'staf'
    | 'audit_log'
    | 'akademik'
    | 'keuangan'
    | 'ppdb'
    | 'pengumuman'
    | 'kalender',
  action: 'lihat' | 'tambah' | 'ubah' | 'hapus'
): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) {
      return c.json(
        {
          success: false,
          message: 'Tidak terotentikasi.',
        },
        401
      );
    }

    if (user.must_change_password) {
      return c.json(
        {
          success: false,
          mustChangePassword: true,
          message: 'Anda wajib mengubah password sebelum dapat mengakses sistem.',
        },
        403
      );
    }

    if (user.role === 'admin') {
      return await next();
    }

    if (user.role === 'guru' || user.guru_id) {
      if (
        module === 'akademik' ||
        module === 'kelas' ||
        module === 'mapel' ||
        module === 'siswa'
      ) {
        return await next();
      }
      if (module === 'keuangan') {
        return c.json(
          {
            success: false,
            message: 'Akses ditolak. Guru tidak memiliki wewenang mengakses modul keuangan.',
          },
          403
        );
      }
    }

    if (module === 'staf') {
      return c.json(
        {
          success: false,
          message: 'Hanya Administrator yang memiliki akses ke manajemen akun staf.',
        },
        403
      );
    }

    if (module === 'keuangan') {
      if (user.staf_role === 'Keuangan') {
        return await next();
      }
      const hasKeuanganPerm = (user.permissions || []).some(
        (p: any) => p.module === 'keuangan' && p.can_view
      );
      if (hasKeuanganPerm) {
        return await next();
      }
      return c.json(
        {
          success: false,
          message:
            'Akses ditolak. Modul keuangan hanya dapat diakses oleh Administrator dan Staf Keuangan.',
        },
        403
      );
    }

    if (module === 'ppdb') {
      if (user.staf_role === 'TU') {
        return await next();
      }
      const hasPpdbPerm = (user.permissions || []).some(
        (p: any) =>
          p.module === 'ppdb' && (action === 'lihat' ? p.can_view : p.can_edit)
      );
      if (hasPpdbPerm) {
        return await next();
      }
      return c.json(
        {
          success: false,
          message:
            'Akses ditolak. Modul PPDB hanya dapat dikelola oleh Administrator dan Staf Tata Usaha.',
        },
        403
      );
    }

    if (module === 'pengumuman' || module === 'kalender') {
      if (action === 'lihat') {
        return await next();
      }
      if (user.role === 'staf') {
        return await next();
      }
      return c.json(
        {
          success: false,
          message:
            'Akses ditolak. Hanya Administrator atau Staf yang dapat mengelola informasi.',
        },
        403
      );
    }

    const permissions = user.permissions || [];
    const modulePerm = permissions.find((p: any) => p.module === module);

    if (!modulePerm) {
      return c.json(
        {
          success: false,
          message: `Anda tidak memiliki hak akses untuk modul ${module}.`,
        },
        403
      );
    }

    const actionKeyMap: Record<string, string> = {
      lihat: 'can_view',
      tambah: 'can_create',
      ubah: 'can_edit',
      hapus: 'can_delete',
    };

    const permKey = actionKeyMap[action];
    if (!permKey || !modulePerm[permKey]) {
      return c.json(
        {
          success: false,
          message: `Anda tidak memiliki izin untuk melakukan aksi '${action}' pada modul ${module}.`,
        },
        403
      );
    }

    await next();
  };
}
