import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { School, Lock, User, ArrowRight, ShieldCheck, Sparkles, Key } from 'lucide-react';

export function LoginPage() {
  const { user, login } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      error('Mohon masukkan username dan password.');
      return;
    }

    try {
      setIsLoading(true);
      setRateLimitMessage(null);
      const loggedUser = await login(username.trim(), password);
      success(`Selamat datang, ${loggedUser.nama_lengkap}!`);
      navigate('/');
    } catch (err: any) {
      if (err.status === 429) {
        setRateLimitMessage(err.message || 'Terlalu banyak percobaan. Silakan coba lagi nanti.');
      } else {
        error(err.message || 'Gagal masuk ke sistem.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white shadow-xl shadow-emerald-950/50 mb-3 border border-amber-400/30">
            <School className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SIAKAD MADRASAH</h1>
          <p className="text-xs text-emerald-200 mt-1">
            Sistem Informasi Akademik Madrasah Tsanawiyah / Aliyah
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-7 shadow-2xl border border-emerald-800/30">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800">Masuk ke Sistem</h2>
            <p className="text-xs text-slate-500">
              Gunakan akun Administrator atau Staf Madrasah Anda.
            </p>
          </div>

          {rateLimitMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {rateLimitMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 disabled:bg-emerald-400 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Akun Contoh Cepat untuk Pengujian */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              Pintasan Akun Bawaan (Klik untuk Isi):
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillQuickCredentials('admin', 'admin123')}
                className="p-2.5 rounded-xl border border-emerald-100 bg-emerald-50/70 hover:bg-emerald-100/80 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-emerald-900 flex items-center justify-between">
                  <span>Admin</span>
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-bold">1st Pwd</span>
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5 truncate">admin</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('stafftu', 'staf123')}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-slate-800">Staf TU</div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">stafftu</div>
              </button>

              <button
                type="button"
                onClick={() => fillQuickCredentials('guruzul', 'guru123')}
                className="p-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-amber-950 flex items-center justify-between">
                  <span>Guru/Wali</span>
                </div>
                <div className="text-[10px] text-amber-800 mt-0.5 truncate">guruzul</div>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3">
              *Admin default wajib mengganti password saat login pertama. Akun Guru hanya dapat mengelola kelas dan mapel yang diampunya.
            </p>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-emerald-300/80 flex items-center justify-center gap-1">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span>SIAKAD Madrasah Dilindungi Enkripsi & JWT HttpOnly</span>
        </div>
      </div>
    </div>
  );
}
