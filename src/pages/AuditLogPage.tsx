import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { AuditLog, PaginatedResult } from '../types';
import { TableSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { History, Search, ShieldCheck, User, Calendar, Activity } from 'lucide-react';

export function AuditLogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data: logData, isLoading } = useQuery({
    queryKey: ['audit-log', searchTerm, entityFilter, actionFilter, page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (entityFilter) params.append('entity', entityFilter);
      if (actionFilter) params.append('action', actionFilter);

      const res = await api.get<PaginatedResult<AuditLog>>(`/api/audit-log?${params.toString()}`);
      return res.data;
    },
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'IMPORT':
      case 'EXPORT':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'LOGIN':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'LOGOUT':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">Audit Log & Rekam Jejak Sistem</h2>
        <p className="text-xs text-slate-500 mt-1">
          Catatan riwayat aktivitas pengguna (siapa yang mengubah apa dan kapan) untuk transparansi tata kelola data madrasah.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            placeholder="Cari aktivitas atau username..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-slate-50/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={entityFilter}
            onChange={(e) => {
              setEntityFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
          >
            <option value="">Semua Modul / Entitas</option>
            <option value="auth">Autentikasi & Akun</option>
            <option value="siswa">Data Siswa</option>
            <option value="guru">Guru & Pegawai</option>
            <option value="kelas">Kelas & Rombel</option>
            <option value="mapel">Mata Pelajaran</option>
            <option value="tahun_ajaran">Tahun Ajaran</option>
            <option value="pengaturan">Profil Madrasah</option>
            <option value="staf">Manajemen Staf</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-emerald-600 bg-white"
          >
            <option value="">Semua Aksi</option>
            <option value="CREATE">CREATE (Tambah)</option>
            <option value="UPDATE">UPDATE (Ubah)</option>
            <option value="DELETE">DELETE (Hapus)</option>
            <option value="IMPORT">IMPORT (Impor)</option>
            <option value="EXPORT">EXPORT (Ekspor)</option>
            <option value="LOGIN">LOGIN</option>
            <option value="PASSWORD_CHANGE">PASSWORD CHANGE</option>
          </select>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <TableSkeleton rows={6} cols={5} />
          </div>
        ) : !logData || logData.data.length === 0 ? (
          <EmptyState
            title="Tidak Ada Catatan Log"
            description="Belum ada aktivitas yang tercatat sesuai dengan kriteria filter."
          />
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Waktu & Tanggal</th>
                    <th className="py-3.5 px-4">Pengguna</th>
                    <th className="py-3.5 px-4">Aksi</th>
                    <th className="py-3.5 px-4">Modul</th>
                    <th className="py-3.5 px-4">Detail Perubahan</th>
                    <th className="py-3.5 px-4 text-right">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {logData.data.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(item.created_at).toLocaleString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.username}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getActionBadge(
                            item.action
                          )}`}
                        >
                          {item.action}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 capitalize">
                        {item.entity.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4 max-w-md text-slate-600">
                        {item.details || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {item.ip_address || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={logData.page}
              totalPages={logData.totalPages}
              totalItems={logData.total}
              itemsPerPage={logData.limit}
              onPageChange={(p) => setPage(p)}
              onLimitChange={(l) => {
                setLimit(l);
                setPage(1);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
