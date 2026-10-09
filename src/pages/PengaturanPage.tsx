import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../lib/api';
import { MadrasahProfile } from '../types';
import { CardSkeleton } from '../components/ui/Skeleton';
import { School, Save, Upload, CheckCircle2 } from 'lucide-react';

export function PengaturanPage() {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const canEdit = hasPermission('pengaturan', 'ubah');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['pengaturan'],
    queryFn: async () => {
      const res = await api.get<MadrasahProfile>('/api/pengaturan');
      return res.data;
    },
  });

  const [formData, setFormData] = useState<Partial<MadrasahProfile>>({});

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<MadrasahProfile>) => api.put('/api/pengaturan', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengaturan'] });
      success('Pengaturan profil madrasah berhasil disimpan.');
    },
    onError: (err: any) => error(err.message || 'Gagal menyimpan profil madrasah.'),
  });

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logo_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <CardSkeleton />;
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Profil & Pengaturan Madrasah</h2>
        <p className="text-xs text-slate-500 mt-1">
          Identitas resmi madrasah, Nomor Statistik Madrasah (NSM), NPSN Kemenag, dan data pimpinan.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Utama */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <School className="w-4 h-4 text-emerald-600" />
            Identitas Lembaga Madrasah
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Resmi Madrasah
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.nama || ''}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600 font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NSM (Nomor Statistik Madrasah)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.nsm || ''}
                onChange={(e) => setFormData({ ...formData, nsm: e.target.value })}
                placeholder="12 digit angka NSM"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NPSN (Nomor Pokok Sekolah Nasional)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.npsn || ''}
                onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                placeholder="8 digit NPSN"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kepala Madrasah
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.kepala_madrasah || ''}
                onChange={(e) => setFormData({ ...formData, kepala_madrasah: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIP Kepala Madrasah (Opsional)
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={formData.nip_kepala_madrasah || ''}
                onChange={(e) => setFormData({ ...formData, nip_kepala_madrasah: e.target.value })}
                placeholder="NIP ASN / Pimpinan"
                className="w-full px-3.5 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>
          </div>

          {/* Logo Madrasah */}
          <div className="pt-2">
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Logo / Lambang Madrasah
            </label>
            <div className="flex items-center gap-4">
              {formData.logo_url ? (
                <img
                  src={formData.logo_url}
                  alt="Logo"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                  <School className="w-8 h-8" />
                </div>
              )}
              {canEdit && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Gunakan logo transparan resolusi tinggi (PNG/SVG/JPG).
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lokasi & Kontak */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-800 border-b border-slate-100 pb-3">
            Alamat & Saluran Kontak
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Lengkap Madrasah
              </label>
              <textarea
                rows={2}
                disabled={!canEdit}
                value={formData.alamat || ''}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kecamatan</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.kecamatan || ''}
                  onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kabupaten / Kota</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.kabupaten_kota || ''}
                  onChange={(e) => setFormData({ ...formData, kabupaten_kota: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Provinsi</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.provinsi || ''}
                  onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">No. Telepon Kantor</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.telepon || ''}
                  onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Resmi</label>
                <input
                  type="email"
                  disabled={!canEdit}
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website Lembaga</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-400 text-white rounded-xl text-sm font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
