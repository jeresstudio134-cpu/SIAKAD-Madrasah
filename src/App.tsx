import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TahunAjaranPage } from './pages/TahunAjaranPage';
import { KelasPage } from './pages/KelasPage';
import { MapelPage } from './pages/MapelPage';
import { GuruPage } from './pages/GuruPage';
import { SiswaPage } from './pages/SiswaPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { StafPage } from './pages/StafPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { PenempatanKelasPage } from './pages/akademik/PenempatanKelasPage';
import { PenugasanGuruPage } from './pages/akademik/PenugasanGuruPage';
import { JadwalPelajaranPage } from './pages/akademik/JadwalPelajaranPage';
import { AbsensiPage } from './pages/akademik/AbsensiPage';
import { NilaiPage } from './pages/akademik/NilaiPage';
import { SikapTahfidzPage } from './pages/akademik/SikapTahfidzPage';
import { RaporPage } from './pages/akademik/RaporPage';
import { DashboardKeuanganPage } from './pages/keuangan/DashboardKeuanganPage';
import { JenisPembayaranPage } from './pages/keuangan/JenisPembayaranPage';
import { TagihanPage } from './pages/keuangan/TagihanPage';
import { PembayaranPage } from './pages/keuangan/PembayaranPage';
import { TunggakanPage } from './pages/keuangan/TunggakanPage';
import { LaporanKeuanganPage } from './pages/keuangan/LaporanKeuanganPage';
import { PPDBPublicPage } from './pages/ppdb/PPDBPublicPage';
import { PPDBAdminPage } from './pages/ppdb/PPDBAdminPage';
import { PengumumanPage } from './pages/informasi/PengumumanPage';
import { KalenderAkademikPage } from './pages/informasi/KalenderAkademikPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { School } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="relative flex items-center justify-center mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/60 border border-emerald-400/30">
            <School className="w-7 h-7 text-white" />
          </div>
          <div className="absolute -inset-1.5 border-2 border-emerald-500/20 border-t-emerald-400 rounded-2xl animate-spin" />
        </div>
        <div className="w-36 h-1.5 bg-emerald-950/80 rounded-full overflow-hidden border border-emerald-800/30">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse w-2/3" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                {/* Public Login Route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected App Routes */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<DashboardPage />} />
                  <Route path="tahun-ajaran" element={<TahunAjaranPage />} />
                  <Route path="kelas" element={<KelasPage />} />
                  <Route path="mapel" element={<MapelPage />} />
                  <Route path="guru" element={<GuruPage />} />
                  <Route path="siswa" element={<SiswaPage />} />
                  <Route path="pengaturan" element={<PengaturanPage />} />
                  <Route path="staf" element={<StafPage />} />
                  <Route path="audit-log" element={<AuditLogPage />} />

                  {/* Modul Akademik Routes */}
                  <Route path="akademik/penempatan" element={<PenempatanKelasPage />} />
                  <Route path="akademik/penugasan" element={<PenugasanGuruPage />} />
                  <Route path="akademik/jadwal" element={<JadwalPelajaranPage />} />
                  <Route path="akademik/absensi" element={<AbsensiPage />} />
                  <Route path="akademik/nilai" element={<NilaiPage />} />
                  <Route path="akademik/sikap-tahfidz" element={<SikapTahfidzPage />} />
                  <Route path="akademik/rapor" element={<RaporPage />} />

                  {/* Modul Keuangan Routes */}
                  <Route path="keuangan" element={<DashboardKeuanganPage />} />
                  <Route path="keuangan/jenis" element={<JenisPembayaranPage />} />
                  <Route path="keuangan/tagihan" element={<TagihanPage />} />
                  <Route path="keuangan/pembayaran" element={<PembayaranPage />} />
                  <Route path="keuangan/tunggakan" element={<TunggakanPage />} />
                  <Route path="keuangan/laporan" element={<LaporanKeuanganPage />} />

                  {/* Modul PPDB Internal (Admin / Staf TU) */}
                  <Route path="ppdb/admin" element={<PPDBAdminPage />} />

                  {/* Pengumuman & Kalender Akademik */}
                  <Route path="pengumuman" element={<PengumumanPage />} />
                  <Route path="kalender" element={<KalenderAkademikPage />} />
                </Route>

                {/* Rute Publik PPDB (Tanpa Login) */}
                <Route path="ppdb" element={<PPDBPublicPage />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
