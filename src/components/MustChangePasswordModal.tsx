import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { KeyRound, ShieldAlert, Check } from 'lucide-react';

export function MustChangePasswordModal() {
  const { user, changePassword, logout } = useAuth();
  const { success, error } = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || user.role !== 'admin' || !user.must_change_password) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      error('Mohon lengkapi seluruh kolom password.');
      return;
    }

    if (newPassword.length < 6) {
      error('Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    if (oldPassword === newPassword) {
      error('Password baru tidak boleh sama dengan password default/lama.');
      return;
    }

    try {
      setIsSubmitting(true);
      await changePassword(oldPassword, newPassword);
      success('Password berhasil diperbarui! Anda kini dapat mengakses sistem.');
    } catch (err: any) {
      error(err.message || 'Gagal mengubah password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-md w-full p-6 text-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200 mb-5">
          <ShieldAlert className="w-6 h-6 shrink-0" />
          <div className="text-sm">
            <h4 className="font-semibold">Wajib Ganti Password</h4>
            <p className="text-xs text-amber-800">
              Demi keamanan akun, Anda wajib mengganti password default sebelum mengakses modul madrasah.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password Lama / Default Saat Ini
            </label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan password saat ini (contoh: admin123)"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password Baru (Minimal 6 Karakter)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Masukkan password baru yang kuat"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru"
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 focus:ring-1 focus:ring-emerald-600"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Keluar (Logout)
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Simpan Password Baru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
