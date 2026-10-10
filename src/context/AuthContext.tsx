import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, ModulePermission } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  checkAuth: () => Promise<void>;
  hasPermission: (
    module: ModulePermission['module'],
    action: 'lihat' | 'tambah' | 'ubah' | 'hapus'
  ) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper membaca data user tersimpan di localStorage secara sinkron
const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('siakad_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.id && parsed.username) {
        return parsed as User;
      }
    }
  } catch (e) {
    console.warn('Gagal membaca data user dari localStorage:', e);
  }
  return null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inisialisasi state user dari localStorage secara sinkron
  const [user, setUser] = useState<User | null>(getStoredUser);
  // Kalau data user tersimpan, set loading = false dari awal
  const [isLoading, setIsLoading] = useState<boolean>(() => !getStoredUser());

  const checkAuth = useCallback(async () => {
    try {
      // Verifikasi sesi di latar belakang tanpa memblokir tampilan jika user sudah ada
      const res = await api.get<{ user: User }>('/api/auth/me');
      if (res.success && res.data?.user) {
        setUser(res.data.user);
        // Simpan profil & permission untuk tampilan (bukan token sensitif)
        localStorage.setItem('siakad_user', JSON.stringify(res.data.user));
      } else {
        setUser(null);
        localStorage.removeItem('siakad_user');
        localStorage.removeItem('siakad_token');
      }
    } catch (err: any) {
      // Jika 401 Unauthorized / 403 Forbidden, bersihkan cache dan arahkan login
      if (err?.status === 401 || err?.status === 403) {
        setUser(null);
        localStorage.removeItem('siakad_user');
        localStorage.removeItem('siakad_token');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username: string, password: string): Promise<User> => {
    const res = await api.post<{ user: User; token: string }>('/api/auth/login', {
      username,
      password,
    });

    if (res.data?.token) {
      localStorage.setItem('siakad_token', res.data.token);
    }

    if (res.data?.user) {
      setUser(res.data.user);
      localStorage.setItem('siakad_user', JSON.stringify(res.data.user));
      return res.data.user;
    }

    throw new Error('Gagal memproses data otentikasi pengguna');
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      localStorage.removeItem('siakad_token');
      localStorage.removeItem('siakad_user');
      setUser(null);
    }
  };

  const changePassword = async (old_password: string, new_password: string) => {
    const res = await api.post('/api/auth/change-password', {
      old_password,
      new_password,
    });

    if (res.success) {
      setUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, must_change_password: false };
        localStorage.setItem('siakad_user', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const hasPermission = (
    module: ModulePermission['module'],
    action: 'lihat' | 'tambah' | 'ubah' | 'hapus'
  ): boolean => {
    if (!user) return false;
    // Administrator memiliki akses tak terbatas
    if (user.role === 'admin') return true;

    // Guru otomatis memiliki akses ke modul akademik & data terkait
    if (user.role === 'guru' || user.guru_id) {
      if (module === 'akademik' || module === 'kelas' || module === 'mapel' || module === 'siswa') {
        return true;
      }
    }

    // Modul staf hanya untuk admin
    if (module === 'staf') return false;

    const perms = user.permissions || [];
    const modPerm = perms.find((p) => p.module === module);
    if (!modPerm) return false;

    const map: Record<string, keyof ModulePermission> = {
      lihat: 'can_view',
      tambah: 'can_create',
      ubah: 'can_edit',
      hapus: 'can_delete',
    };

    const key = map[action];
    return Boolean(key && modPerm[key]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        changePassword,
        checkAuth,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
