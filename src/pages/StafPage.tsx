import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { User, ModulePermission, StafRole } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  Power,
  KeyRound,
  Check,
  X,
  Lock,
} from 'lucide-react';

const MODULES_LIST: Array<{ id: ModulePermission['module']; label: string }> = [
  { id: 'siswa', label: 'Data Siswa & Impor/Ekspor' },
  { id: 'guru', label: 'Guru & Pegawai' },
  { id: 'kelas', label: 'Kelas & Rombongan Belajar' },
  { id: 'mapel', label: 'Mata Pelajaran' },
  { id: 'tahun_ajaran', label: 'Tahun Ajaran & Semester' },
  { id: 'pengaturan', label: 'Profil & Pengaturan Madrasah' },
  { id: 'akademik', label: 'Modul Akademik & Rapor' },
  { id: 'keuangan', label: 'Modul Keuangan & Pembayaran' },
  { id: 'audit_log', label: 'Log Aktivitas Sistem' },
];

export function StafPage() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<User | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    nama_lengkap: '',
    email: '',
    password: '',
    staf_role: 'TU' as StafRole,
    is_active: true,
    permissions: MODULES_LIST.map((m) => ({
      module: m.id,
      can_view: true,
      can_create: false,
      can_edit: false,
      can_delete: false,
    })),
  });

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Queries
  const { data: stafList = [], isLoading } = useQuery({
    queryKey: ['staf'],
    queryFn: async () => {
      const res = await api.get<User[]>('/api/staf');
      return res.data || [];
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/staf', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staf'] });
      success('Akun staf berhasil dibuat.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal menambahkan staf.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof formData }) =>
      api.put(`/api/staf/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staf'] });
      success('Data dan hak akses staf berhasil diperbarui.');
      setModalOpen(false);
    },
    onError: (err: any) => error(err.message || 'Gagal memperbarui staf.'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/api/staf/${id}/status`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staf'] });
      success('Status staf berhasil diperbarui.');
    },
    onError: (err: any) => error(err.message || 'Gagal mengubah status.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/api/staf/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staf'] });
      success('Akun staf berhasil dihapus.');
      setDeleteId(null);
    },
    onError: (err: any) => error(err.message || 'Gagal menghapus akun staf.'),
  });

  const handleOpenModal = (item?: User) => {
    if (item) {
      setEditingItem(item);
      // Map existing permissions or default
      const currentPerms = MODULES_LIST.map((m) => {
        const found = item.permissions?.find((p) => p.module === m.id);
        return (
          found || {
            module: m.id,
            can_view: false,
            can_create: false,
            can_edit: false,
            can_delete: false,
          }
        );
      });

      setFormData({
        username: item.username,
        nama_lengkap: item.nama_lengkap,
        email: item.email || '',
        password: '',
        staf_role: item.staf_role || 'TU',
        is_active: item.is_active,
        permissions: currentPerms,
      });
    } else {
      setEditingItem(null);
      setFormData({
        username: '',
        nama_lengkap: '',
        email: '',
        password: '',
        staf_role: 'TU',
        is_active: true,
        permissions: MODULES_LIST.map((m) => ({
          module: m.id,
          can_view: true,
          can_create: false,
          can_edit: false,
          can_delete: false,
        })),
      });
    }
    setModalOpen(true);
  };

  const handlePermissionChange = (
    moduleKey: ModulePermission['module'],
    actionKey: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    val: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.map((p) => {
        if (p.module === moduleKey) {
          const updated = { ...p, [actionKey]: val };
          // If view is disabled, disable create/edit/delete as well
          if (actionKey === 'can_view' && !val) {
            updated.can_create = false;
            updated.can_edit = false;
            updated.can_delete = false;
          }
          // If create/edit/delete is enabled, ensure view is enabled
          if (actionKey !== 'can_view' && val) {
            updated.can_view = true;
          }
          return updated;
        }
        return p;
      }),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      if (!formData.password || formData.password.length < 6) {
        error('Password baru staf minimal 6 karakter.');
        return;
      }
      createMutation.mutate(formData);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm">
        Hanya Administrator yang memiliki akses ke modul Manajemen Staf & Hak Akses.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Manajemen Staf & Hak Akses</h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola akun staf TU, Keuangan, dan Akademik. Atur hak akses spesifik per modul (lihat, tambah, ubah, hapus).
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Tambah Akun Staf
        </button>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={4} cols={5} />
          </div>
        ) : stafList.length === 0 ? (
          <EmptyState
            title="Belum Ada Akun Staf"
            description="Tambahkan akun staf madrasah pertama Anda untuk mendelegasikan tugas."
            onAction={() => handleOpenModal()}
            actionText="Tambah Staf Baru"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-4">Nama & Username</th>
                  <th className="py-3.5 px-4">Role Staf</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Status Akun</th>
                  <th className="py-3.5 px-4 text-right">Aksi & Hak Akses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stafList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.nama_lengkap}</div>
                      <div className="text-[11px] text-slate-400 font-mono">@{item.username}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Staf {item.staf_role || 'Umum'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{item.email || '-'}</td>
                    <td className="py-3.5 px-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Check className="w-3 h-3" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <X className="w-3 h-3" />
                          Non-Aktif
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleStatusMutation.mutate(item.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            item.is_active
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={item.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Ubah & Atur Hak Akses"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(item.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Akun"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Staf & Permissions */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Ubah Akun & Hak Akses Staf' : 'Tambah Akun Staf Baru'}
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username Login
              </label>
              <input
                type="text"
                disabled={Boolean(editingItem)}
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Contoh: stafftu1"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 disabled:bg-slate-100"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Staf
              </label>
              <input
                type="text"
                value={formData.nama_lengkap}
                onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                placeholder="Contoh: Ahmad Fauzi, S.Kom"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Role / Bagian Staf
              </label>
              <select
                value={formData.staf_role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    staf_role: e.target.value as 'TU' | 'Keuangan' | 'Akademik',
                  })
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600 bg-white"
              >
                <option value="TU">Tata Usaha (TU)</option>
                <option value="Keuangan">Bagian Keuangan</option>
                <option value="Akademik">Bagian Akademik</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Opsional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@madrasah.sch.id"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {editingItem ? 'Ganti Password (Kosongkan bila tetap)' : 'Password Awal'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingItem ? 'Biarkan kosong jika tidak diubah' : 'Minimal 6 karakter'}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                required={!editingItem}
              />
            </div>
          </div>

          {/* Matriks Pengaturan Hak Akses (Permissions Matrix) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Matriks Hak Akses Per Modul
                </h4>
                <p className="text-[11px] text-slate-500">
                  Tentukan aksi apa saja yang diizinkan untuk staf ini.
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[11px] font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Nama Modul</th>
                    <th className="py-2.5 px-2 text-center">Lihat</th>
                    <th className="py-2.5 px-2 text-center">Tambah</th>
                    <th className="py-2.5 px-2 text-center">Ubah</th>
                    <th className="py-2.5 px-2 text-center">Hapus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MODULES_LIST.map((mod) => {
                    const perm = formData.permissions.find((p) => p.module === mod.id) || {
                      module: mod.id,
                      can_view: false,
                      can_create: false,
                      can_edit: false,
                      can_delete: false,
                    };

                    return (
                      <tr key={mod.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{mod.label}</td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.can_view}
                            onChange={(e) =>
                              handlePermissionChange(mod.id, 'can_view', e.target.checked)
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.can_create}
                            onChange={(e) =>
                              handlePermissionChange(mod.id, 'can_create', e.target.checked)
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.can_edit}
                            onChange={(e) =>
                              handlePermissionChange(mod.id, 'can_edit', e.target.checked)
                            }
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.can_delete}
                            onChange={(e) =>
                              handlePermissionChange(mod.id, 'can_delete', e.target.checked)
                            }
                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 rounded-xl transition-colors cursor-pointer"
            >
              {editingItem ? 'Simpan Perubahan' : 'Buat Akun Staf'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Hapus Akun Staf"
        message="Apakah Anda yakin ingin menghapus akun staf ini? Seluruh hak aksesnya akan dicabut seketika."
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
