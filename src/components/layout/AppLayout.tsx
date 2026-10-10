import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { MustChangePasswordModal } from '../MustChangePasswordModal';
import { Modal } from '../ui/Modal';
import {
  LayoutDashboard,
  CalendarCheck,
  Building2,
  BookOpen,
  Users2,
  GraduationCap,
  Settings,
  ShieldCheck,
  History,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
  KeyRound,
  School,
  Sparkles,
  UserPlus,
  ArrowUpRight,
  CalendarDays,
  CheckSquare,
  Award,
  HeartHandshake,
  Printer,
  Wallet,
  CreditCard,
  AlertCircle,
  Layers,
  FileText,
  Bell,
  UserCheck,
} from 'lucide-react';

export function AppLayout() {
  const { user, logout, hasPermission, changePassword } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [changePwdOpen, setChangePwdOpen] = useState(false);

  // Ganti Password Modal Form State
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      // ignore
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) {
      error('Password baru minimal 6 karakter.');
      return;
    }
    if (newPwd !== confirmPwd) {
      error('Konfirmasi password tidak cocok.');
      return;
    }

    try {
      setIsChangingPwd(true);
      await changePassword(oldPwd, newPwd);
      success('Password berhasil diperbarui.');
      setChangePwdOpen(false);
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      error(err.message || 'Gagal mengubah password.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const mainNav = [
    {
      to: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      show: true,
    },
  ];

  const akademikNav = [
    {
      to: '/akademik/penempatan',
      label: 'Penempatan & Kenaikan',
      icon: <ArrowUpRight className="w-5 h-5" />,
      show: hasPermission('akademik', 'lihat'),
    },
    {
      to: '/akademik/penugasan',
      label: 'Penugasan Guru & Wali',
      icon: <Users2 className="w-5 h-5" />,
      show: hasPermission('akademik', 'lihat'),
    },
    {
      to: '/akademik/jadwal',
      label: 'Jadwal Pelajaran',
      icon: <CalendarDays className="w-5 h-5" />,
      show: hasPermission('akademik', 'lihat'),
    },
    {
      to: '/akademik/absensi',
      label: 'Absensi Harian Siswa',
      icon: <CalendarCheck className="w-5 h-5" />,
      show: hasPermission('akademik', 'lihat'),
    },
    {
      to: '/akademik/nilai',
      label: 'Penilaian Siswa',
      icon: <Award className="w-5 h-5" />,
      show: hasPermission('akademik', 'lihat'),
    },
    {
      to: '/akademik/sikap-tahfidz',
      label: 'Sikap & Tahfidz',
      icon: <HeartHandshake className="w-5 h-5" />,
      show: hasPermission('akademik', 'lihat'),
    },
    {
      to: '/akademik/rapor',
      label: 'Cetak Rapor (PDF)',
      icon: <Printer className="w-5 h-5" />,
      show: hasPermission('akademik', 'lihat'),
    },
  ];

  const canAccessKeuangan =
    user?.role === 'admin' ||
    user?.staf_role === 'Keuangan' ||
    hasPermission('keuangan', 'lihat');

  const keuanganNav = [
    {
      to: '/keuangan',
      label: 'Dashboard Keuangan',
      icon: <Wallet className="w-5 h-5" />,
      show: canAccessKeuangan,
    },
    {
      to: '/keuangan/pembayaran',
      label: 'Kasir & Pembayaran',
      icon: <CreditCard className="w-5 h-5" />,
      show: canAccessKeuangan,
    },
    {
      to: '/keuangan/tagihan',
      label: 'Tagihan Siswa',
      icon: <FileText className="w-5 h-5" />,
      show: canAccessKeuangan,
    },
    {
      to: '/keuangan/tunggakan',
      label: 'Daftar Tunggakan',
      icon: <AlertCircle className="w-5 h-5" />,
      show: canAccessKeuangan,
    },
    {
      to: '/keuangan/jenis',
      label: 'Pos & Tarif Bayar',
      icon: <Layers className="w-5 h-5" />,
      show: canAccessKeuangan,
    },
    {
      to: '/keuangan/laporan',
      label: 'Laporan Keuangan',
      icon: <Printer className="w-5 h-5" />,
      show: canAccessKeuangan,
    },
  ];

  const canAccessPPDB =
    user?.role === 'admin' ||
    user?.staf_role === 'TU' ||
    (user?.role === 'staf' && user?.staf_role !== 'Keuangan') ||
    hasPermission('ppdb', 'lihat');

  const ppdbNav = [
    {
      to: '/ppdb/admin',
      label: 'PPDB & Admisi Santri',
      icon: <UserCheck className="w-5 h-5" />,
      show: canAccessPPDB,
    },
  ];

  const informasiNav = [
    {
      to: '/pengumuman',
      label: 'Pengumuman Madrasah',
      icon: <Bell className="w-5 h-5" />,
      show: true,
    },
    {
      to: '/kalender',
      label: 'Kalender Akademik',
      icon: <CalendarDays className="w-5 h-5" />,
      show: true,
    },
  ];

  const masterNav = [
    {
      to: '/tahun-ajaran',
      label: 'Tahun Ajaran',
      icon: <CalendarCheck className="w-5 h-5" />,
      show: hasPermission('tahun_ajaran', 'lihat'),
    },
    {
      to: '/kelas',
      label: 'Kelas / Rombel',
      icon: <Building2 className="w-5 h-5" />,
      show: hasPermission('kelas', 'lihat'),
    },
    {
      to: '/mapel',
      label: 'Mata Pelajaran',
      icon: <BookOpen className="w-5 h-5" />,
      show: hasPermission('mapel', 'lihat'),
    },
    {
      to: '/guru',
      label: 'Guru & Pegawai',
      icon: <Users2 className="w-5 h-5" />,
      show: hasPermission('guru', 'lihat'),
    },
    {
      to: '/siswa',
      label: 'Data Siswa',
      icon: <GraduationCap className="w-5 h-5" />,
      show: hasPermission('siswa', 'lihat'),
    },
  ];

  const systemNav = [
    {
      to: '/pengaturan',
      label: 'Profil Madrasah',
      icon: <Settings className="w-5 h-5" />,
      show: hasPermission('pengaturan', 'lihat'),
    },
    {
      to: '/staf',
      label: 'Manajemen Staf',
      icon: <ShieldCheck className="w-5 h-5" />,
      show: user?.role === 'admin',
    },
    {
      to: '/audit-log',
      label: 'Audit Log',
      icon: <History className="w-5 h-5" />,
      show: hasPermission('audit_log', 'lihat'),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      <MustChangePasswordModal />

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 h-screen z-40 w-72 bg-emerald-950 text-slate-100 flex flex-col justify-between transition-transform duration-300 ease-in-out shrink-0 border-r border-emerald-900 shadow-xl ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Brand Header */}
          <div className="p-5 border-b border-emerald-900/80 flex items-center justify-between bg-emerald-950/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 flex items-center justify-center text-white shadow-md">
                <School className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  SIAKAD <span className="text-amber-400 font-extrabold text-xs px-1.5 py-0.5 rounded-sm bg-amber-400/10 border border-amber-400/30">MADRASAH</span>
                </h1>
                <p className="text-[11px] text-emerald-300">Sistem Akademik Terpadu</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-emerald-900/50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto custom-scrollbar">
            {/* Menu Utama */}
            <div className="space-y-1">
              {mainNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/50 border border-emerald-600/50'
                        : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                    }`
                  }
                >
                  <span className="text-emerald-300 group-hover:text-amber-300 transition-colors">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Modul Akademik */}
            {akademikNav.some((i) => i.show) && (
              <div className="space-y-1 pt-1">
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-amber-400/90 flex items-center justify-between">
                  <span>Modul Akademik</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400/20 text-amber-300 font-bold">Baru</span>
                </div>
                {akademikNav
                  .filter((item) => item.show)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/50 border border-emerald-600/50 font-bold'
                            : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                        }`
                      }
                    >
                      <span className="text-emerald-300 group-hover:text-amber-300 transition-colors">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
              </div>
            )}

            {/* Modul Keuangan */}
            {keuanganNav.some((i) => i.show) && (
              <div className="space-y-1 pt-1">
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-emerald-300 flex items-center justify-between">
                  <span>Modul Keuangan</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/30 text-emerald-200 font-bold">
                    Keu
                  </span>
                </div>
                {keuanganNav
                  .filter((item) => item.show)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/50 border border-emerald-600/50 font-bold'
                            : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                        }`
                      }
                    >
                      <span className="text-emerald-300 group-hover:text-amber-300 transition-colors">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
              </div>
            )}

            {/* Modul PPDB */}
            {ppdbNav.some((i) => i.show) && (
              <div className="space-y-1 pt-1">
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-amber-300 flex items-center justify-between">
                  <span>Kesiswaan & Admisi</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-400/20 text-amber-300 font-bold">
                    PPDB
                  </span>
                </div>
                {ppdbNav
                  .filter((item) => item.show)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/50 border border-emerald-600/50 font-bold'
                            : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                        }`
                      }
                    >
                      <span className="text-emerald-300 group-hover:text-amber-300 transition-colors">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
              </div>
            )}

            {/* Informasi & Agenda */}
            <div className="space-y-1 pt-1">
              <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-emerald-400/80">
                Informasi & Agenda
              </div>
              {informasiNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/50 border border-emerald-600/50 font-bold'
                        : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                    }`
                  }
                >
                  <span className="text-emerald-300 group-hover:text-amber-300 transition-colors">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>

            {/* Data Master */}
            {masterNav.some((i) => i.show) && (
              <div className="space-y-1 pt-1">
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-emerald-400/80">
                  Data Master
                </div>
                {masterNav
                  .filter((item) => item.show)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/50 border border-emerald-600/50 font-bold'
                            : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                        }`
                      }
                    >
                      <span className="text-emerald-300 group-hover:text-amber-300 transition-colors">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
              </div>
            )}

            {/* Pengaturan & Sistem */}
            {systemNav.some((i) => i.show) && (
              <div className="space-y-1 pt-1">
                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider uppercase text-emerald-400/80">
                  Pengaturan
                </div>
                {systemNav
                  .filter((item) => item.show)
                  .map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all group ${
                          isActive
                            ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/50 border border-emerald-600/50 font-bold'
                            : 'text-emerald-100/80 hover:bg-emerald-900/60 hover:text-white'
                        }`
                      }
                    >
                      <span className="text-emerald-300 group-hover:text-amber-300 transition-colors">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
              </div>
            )}
          </nav>

          {/* User Profile Card in Sidebar Footer */}
          <div className="p-4 border-t border-emerald-900/80 bg-emerald-950/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-emerald-800 border border-emerald-700 flex items-center justify-center font-bold text-amber-300 text-sm shrink-0">
                  {user?.nama_lengkap.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate">
                    {user?.nama_lengkap}
                  </p>
                  <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {user?.role === 'admin'
                      ? 'Administrator'
                      : user?.role === 'guru'
                      ? 'Guru Pendidik'
                      : `Staf (${user?.staf_role || 'TU'})`}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar dari akun"
                className="p-2 text-emerald-300 hover:text-rose-400 hover:bg-emerald-900/80 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Madrasah Digital Mandiri Berprestasi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                  {user?.nama_lengkap.charAt(0) || 'A'}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-800">{user?.username}</div>
                  <div className="text-[10px] text-slate-500 capitalize">{user?.role}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
              </button>

              {userDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-20 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-semibold text-slate-800">
                        {user?.nama_lengkap}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{user?.email || '-'}</div>
                    </div>
                    {user?.role === 'admin' && (
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setChangePwdOpen(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                      >
                        <KeyRound className="w-4 h-4 text-amber-500" />
                        Ganti Password
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Modal Mandiri Ganti Password (Hanya Admin) */}
      {user?.role === 'admin' && (
        <Modal
          isOpen={changePwdOpen}
          onClose={() => setChangePwdOpen(false)}
          title="Ganti Password Akun"
          maxWidth="md"
        >
          <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password Lama
              </label>
              <input
                type="password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password Baru (Minimal 6 Karakter)
              </label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Konfirmasi Password Baru
              </label>
              <input
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-emerald-600"
                required
              />
            </div>
            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setChangePwdOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isChangingPwd}
                className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                {isChangingPwd ? 'Menyimpan...' : 'Simpan Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
