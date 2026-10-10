import { eq, desc, asc, ilike, and, or, inArray, sql, count } from 'drizzle-orm';
import * as schema from '../db/schema.ts';
import { getDb, DbClient } from './db.ts';

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Neon Drizzle Store
 * Menggantikan seluruh InMemoryDataStore dengan query Drizzle ORM langsung ke Neon PostgreSQL.
 * Setiap instance dibentuk per-request dari c.env.DATABASE_URL.
 */
export class DbStore {
  constructor(public db: DbClient) {}

  // ==========================================
  // 0. AUDIT LOG
  // ==========================================
  async createAuditLog(data: {
    user_id?: number | null;
    username: string;
    action: string;
    entity: string;
    details?: string | null;
    ip_address?: string | null;
  }) {
    try {
      await this.db.insert(schema.auditLog).values({
        user_id: data.user_id ?? null,
        username: data.username,
        action: data.action,
        entity: data.entity,
        details: data.details ?? null,
        ip_address: data.ip_address ?? null,
      });
    } catch (err) {
      console.error('Gagal mencatat audit log:', err);
    }
  }

  async getAuditLogs(params: {
    entity?: string;
    action?: string;
    user_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.entity) conditions.push(eq(schema.auditLog.entity, params.entity));
    if (params.action) conditions.push(eq(schema.auditLog.action, params.action));
    if (params.user_id) conditions.push(eq(schema.auditLog.user_id, params.user_id));
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(or(ilike(schema.auditLog.details, q), ilike(schema.auditLog.username, q)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.auditLog)
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const items = await this.db
      .select()
      .from(schema.auditLog)
      .where(whereClause)
      .orderBy(desc(schema.auditLog.created_at))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  // ==========================================
  // 1. PROFIL MADRASAH (PENGATURAN)
  // ==========================================
  async getMadrasahProfile() {
    const rows = await this.db.select().from(schema.madrasahProfile).limit(1);
    return rows[0] || null;
  }

  async updateMadrasahProfile(data: any) {
    const existing = await this.getMadrasahProfile();
    if (existing) {
      const [updated] = await this.db
        .update(schema.madrasahProfile)
        .set({ ...data, updated_at: new Date() })
        .where(eq(schema.madrasahProfile.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(schema.madrasahProfile)
        .values({ ...data, updated_at: new Date() })
        .returning();
      return created;
    }
  }

  // ==========================================
  // 2. USERS & STAF / GURU AUTH
  // ==========================================
  async getUserByUsername(username: string) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);
    return user || null;
  }

  async getUserById(id: number) {
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return user || null;
  }

  async getAllStaf() {
    const rows = await this.db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        nama_lengkap: schema.users.nama_lengkap,
        email: schema.users.email,
        role: schema.users.role,
        staf_role: schema.users.staf_role,
        guru_id: schema.users.guru_id,
        is_active: schema.users.is_active,
        must_change_password: schema.users.must_change_password,
        permissions: schema.users.permissions,
        created_at: schema.users.created_at,
        updated_at: schema.users.updated_at,
        guru_nama: schema.guru.nama,
      })
      .from(schema.users)
      .leftJoin(schema.guru, eq(schema.users.guru_id, schema.guru.id))
      .orderBy(asc(schema.users.nama_lengkap));

    return rows.map((r) => ({
      ...r,
      guru: r.guru_id ? { id: r.guru_id, nama: r.guru_nama } : null,
    }));
  }

  async createUser(data: any) {
    const [created] = await this.db
      .insert(schema.users)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async updateUser(id: number, data: any) {
    const [updated] = await this.db
      .update(schema.users)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.users.id, id))
      .returning();
    return updated || null;
  }

  async deleteUser(id: number) {
    const [deleted] = await this.db
      .delete(schema.users)
      .where(eq(schema.users.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 3. TAHUN AJARAN & SEMESTER
  // ==========================================
  async getTahunAjaranList() {
    return await this.db
      .select()
      .from(schema.tahunAjaran)
      .orderBy(desc(schema.tahunAjaran.id));
  }

  async getActiveTahunAjaran() {
    const [active] = await this.db
      .select()
      .from(schema.tahunAjaran)
      .where(eq(schema.tahunAjaran.is_active, true))
      .limit(1);

    if (active) return active;

    const [fallback] = await this.db
      .select()
      .from(schema.tahunAjaran)
      .orderBy(desc(schema.tahunAjaran.id))
      .limit(1);

    return fallback || null;
  }

  async getTahunAjaranById(id: number) {
    const [item] = await this.db
      .select()
      .from(schema.tahunAjaran)
      .where(eq(schema.tahunAjaran.id, id))
      .limit(1);
    return item || null;
  }

  async createTahunAjaran(data: any) {
    if (data.is_active) {
      await this.db
        .update(schema.tahunAjaran)
        .set({ is_active: false });
    }

    const [created] = await this.db
      .insert(schema.tahunAjaran)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async updateTahunAjaran(id: number, data: any) {
    if (data.is_active) {
      await this.db
        .update(schema.tahunAjaran)
        .set({ is_active: false });
    }

    const [updated] = await this.db
      .update(schema.tahunAjaran)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.tahunAjaran.id, id))
      .returning();
    return updated || null;
  }

  async deleteTahunAjaran(id: number) {
    const [deleted] = await this.db
      .delete(schema.tahunAjaran)
      .where(eq(schema.tahunAjaran.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 4. KELAS / ROMBEL
  // ==========================================
  async getKelasList(params: {
    tingkat?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.tingkat && params.tingkat !== 'Semua') {
      conditions.push(eq(schema.kelas.tingkat, params.tingkat));
    }
    if (params.search) {
      conditions.push(ilike(schema.kelas.nama, `%${params.search}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.kelas)
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const rows = await this.db
      .select({
        id: schema.kelas.id,
        tingkat: schema.kelas.tingkat,
        nama: schema.kelas.nama,
        tahun_ajaran_id: schema.kelas.tahun_ajaran_id,
        wali_kelas_id: schema.kelas.wali_kelas_id,
        kapasitas: schema.kelas.kapasitas,
        created_at: schema.kelas.created_at,
        updated_at: schema.kelas.updated_at,
        wali_nama: schema.guru.nama,
        wali_nip: schema.guru.nip,
        wali_gelar_depan: schema.guru.gelar_depan,
        wali_gelar_belakang: schema.guru.gelar_belakang,
        ta_tahun: schema.tahunAjaran.tahun,
        ta_semester: schema.tahunAjaran.semester,
      })
      .from(schema.kelas)
      .leftJoin(schema.guru, eq(schema.kelas.wali_kelas_id, schema.guru.id))
      .leftJoin(schema.tahunAjaran, eq(schema.kelas.tahun_ajaran_id, schema.tahunAjaran.id))
      .where(whereClause)
      .orderBy(asc(schema.kelas.tingkat), asc(schema.kelas.nama))
      .limit(limit)
      .offset(offset);

    // Dapatkan total siswa per kelas
    const items = await Promise.all(
      rows.map(async (r) => {
        const [siswaCountRes] = await this.db
          .select({ val: count() })
          .from(schema.siswa)
          .where(and(eq(schema.siswa.kelas_id, r.id), eq(schema.siswa.status, 'aktif')));

        return {
          id: r.id,
          tingkat: r.tingkat,
          nama: r.nama,
          tahun_ajaran_id: r.tahun_ajaran_id,
          wali_kelas_id: r.wali_kelas_id,
          kapasitas: r.kapasitas,
          created_at: r.created_at,
          updated_at: r.updated_at,
          total_siswa: Number(siswaCountRes?.val || 0),
          wali_kelas: r.wali_kelas_id
            ? {
                id: r.wali_kelas_id,
                nama: r.wali_nama,
                nip: r.wali_nip,
                gelar_depan: r.wali_gelar_depan,
                gelar_belakang: r.wali_gelar_belakang,
              }
            : null,
          tahun_ajaran: r.tahun_ajaran_id
            ? {
                id: r.tahun_ajaran_id,
                tahun: r.ta_tahun,
                semester: r.ta_semester,
              }
            : null,
        };
      })
    );

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAllKelasSimple() {
    return await this.db
      .select({
        id: schema.kelas.id,
        nama: schema.kelas.nama,
        tingkat: schema.kelas.tingkat,
        tahun_ajaran_id: schema.kelas.tahun_ajaran_id,
        wali_kelas_id: schema.kelas.wali_kelas_id,
      })
      .from(schema.kelas)
      .orderBy(asc(schema.kelas.tingkat), asc(schema.kelas.nama));
  }

  async getKelasById(id: number) {
    const [row] = await this.db
      .select({
        id: schema.kelas.id,
        tingkat: schema.kelas.tingkat,
        nama: schema.kelas.nama,
        tahun_ajaran_id: schema.kelas.tahun_ajaran_id,
        wali_kelas_id: schema.kelas.wali_kelas_id,
        kapasitas: schema.kelas.kapasitas,
        created_at: schema.kelas.created_at,
        updated_at: schema.kelas.updated_at,
        wali_nama: schema.guru.nama,
        wali_nip: schema.guru.nip,
        wali_gelar_depan: schema.guru.gelar_depan,
        wali_gelar_belakang: schema.guru.gelar_belakang,
        ta_tahun: schema.tahunAjaran.tahun,
        ta_semester: schema.tahunAjaran.semester,
      })
      .from(schema.kelas)
      .leftJoin(schema.guru, eq(schema.kelas.wali_kelas_id, schema.guru.id))
      .leftJoin(schema.tahunAjaran, eq(schema.kelas.tahun_ajaran_id, schema.tahunAjaran.id))
      .where(eq(schema.kelas.id, id))
      .limit(1);

    if (!row) return null;

    const [siswaCountRes] = await this.db
      .select({ val: count() })
      .from(schema.siswa)
      .where(and(eq(schema.siswa.kelas_id, row.id), eq(schema.siswa.status, 'aktif')));

    return {
      ...row,
      total_siswa: Number(siswaCountRes?.val || 0),
      wali_kelas: row.wali_kelas_id
        ? {
            id: row.wali_kelas_id,
            nama: row.wali_nama,
            nip: row.wali_nip,
            gelar_depan: row.wali_gelar_depan,
            gelar_belakang: row.wali_gelar_belakang,
          }
        : null,
      tahun_ajaran: row.tahun_ajaran_id
        ? {
            id: row.tahun_ajaran_id,
            tahun: row.ta_tahun,
            semester: row.ta_semester,
          }
        : null,
    };
  }

  async createKelas(data: any) {
    const [created] = await this.db
      .insert(schema.kelas)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async updateKelas(id: number, data: any) {
    const [updated] = await this.db
      .update(schema.kelas)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.kelas.id, id))
      .returning();
    return updated || null;
  }

  async deleteKelas(id: number) {
    const [deleted] = await this.db
      .delete(schema.kelas)
      .where(eq(schema.kelas.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 5. MATA PELAJARAN
  // ==========================================
  async getMapelList(params: {
    kelompok?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.kelompok && params.kelompok !== 'Semua') {
      conditions.push(eq(schema.mapel.kelompok, params.kelompok));
    }
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(or(ilike(schema.mapel.nama, q), ilike(schema.mapel.kode, q)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.mapel)
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const items = await this.db
      .select()
      .from(schema.mapel)
      .where(whereClause)
      .orderBy(asc(schema.mapel.kode))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAllMapelSimple() {
    return await this.db.select().from(schema.mapel).orderBy(asc(schema.mapel.nama));
  }

  async getMapelById(id: number) {
    const [item] = await this.db
      .select()
      .from(schema.mapel)
      .where(eq(schema.mapel.id, id))
      .limit(1);
    return item || null;
  }

  async createMapel(data: any) {
    const [created] = await this.db
      .insert(schema.mapel)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async updateMapel(id: number, data: any) {
    const [updated] = await this.db
      .update(schema.mapel)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.mapel.id, id))
      .returning();
    return updated || null;
  }

  async deleteMapel(id: number) {
    const [deleted] = await this.db
      .delete(schema.mapel)
      .where(eq(schema.mapel.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 6. GURU & TENAGA KEPENDIDIKAN
  // ==========================================
  async getGuruList(params: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.status === 'aktif') {
      conditions.push(eq(schema.guru.is_active, true));
    } else if (params.status === 'nonaktif') {
      conditions.push(eq(schema.guru.is_active, false));
    }
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(schema.guru.nama, q),
          ilike(schema.guru.nip, q),
          ilike(schema.guru.nuptk, q),
          ilike(schema.guru.email, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.guru)
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const items = await this.db
      .select()
      .from(schema.guru)
      .where(whereClause)
      .orderBy(asc(schema.guru.nama))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAllGuruSimple() {
    return await this.db
      .select({
        id: schema.guru.id,
        nama: schema.guru.nama,
        nip: schema.guru.nip,
        gelar_depan: schema.guru.gelar_depan,
        gelar_belakang: schema.guru.gelar_belakang,
        jabatan: schema.guru.jabatan,
      })
      .from(schema.guru)
      .where(eq(schema.guru.is_active, true))
      .orderBy(asc(schema.guru.nama));
  }

  async getGuruById(id: number) {
    const [item] = await this.db
      .select()
      .from(schema.guru)
      .where(eq(schema.guru.id, id))
      .limit(1);
    return item || null;
  }

  async createGuru(data: any) {
    const [created] = await this.db
      .insert(schema.guru)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async updateGuru(id: number, data: any) {
    const [updated] = await this.db
      .update(schema.guru)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.guru.id, id))
      .returning();
    return updated || null;
  }

  async deleteGuru(id: number) {
    const [deleted] = await this.db
      .delete(schema.guru)
      .where(eq(schema.guru.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 7. SISWA
  // ==========================================
  async getSiswaList(params: {
    kelas_id?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.kelas_id) {
      conditions.push(eq(schema.siswa.kelas_id, params.kelas_id));
    }
    if (params.status && params.status !== 'semua') {
      conditions.push(eq(schema.siswa.status, params.status));
    }
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(schema.siswa.nama, q),
          ilike(schema.siswa.nis, q),
          ilike(schema.siswa.nisn, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.siswa)
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const rows = await this.db
      .select({
        id: schema.siswa.id,
        nis: schema.siswa.nis,
        nisn: schema.siswa.nisn,
        nama: schema.siswa.nama,
        jenis_kelamin: schema.siswa.jenis_kelamin,
        tempat_lahir: schema.siswa.tempat_lahir,
        tanggal_lahir: schema.siswa.tanggal_lahir,
        kelas_id: schema.siswa.kelas_id,
        tahun_ajaran_masuk_id: schema.siswa.tahun_ajaran_masuk_id,
        nama_ayah: schema.siswa.nama_ayah,
        nama_ibu: schema.siswa.nama_ibu,
        nama_wali: schema.siswa.nama_wali,
        pekerjaan_ortu: schema.siswa.pekerjaan_ortu,
        telepon_ortu: schema.siswa.telepon_ortu,
        alamat: schema.siswa.alamat,
        status: schema.siswa.status,
        foto_url: schema.siswa.foto_url,
        created_at: schema.siswa.created_at,
        updated_at: schema.siswa.updated_at,
        kelas_nama: schema.kelas.nama,
        kelas_tingkat: schema.kelas.tingkat,
        ta_tahun: schema.tahunAjaran.tahun,
      })
      .from(schema.siswa)
      .leftJoin(schema.kelas, eq(schema.siswa.kelas_id, schema.kelas.id))
      .leftJoin(schema.tahunAjaran, eq(schema.siswa.tahun_ajaran_masuk_id, schema.tahunAjaran.id))
      .where(whereClause)
      .orderBy(asc(schema.siswa.nama))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      ...r,
      kelas: r.kelas_id ? { id: r.kelas_id, nama: r.kelas_nama, tingkat: r.kelas_tingkat } : null,
      tahun_ajaran_masuk: r.tahun_ajaran_masuk_id
        ? { id: r.tahun_ajaran_masuk_id, tahun: r.ta_tahun }
        : null,
    }));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getAllSiswaForExport(params: { kelas_id?: number; status?: string }) {
    const conditions: any[] = [];
    if (params.kelas_id) conditions.push(eq(schema.siswa.kelas_id, params.kelas_id));
    if (params.status && params.status !== 'semua') {
      conditions.push(eq(schema.siswa.status, params.status));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: schema.siswa.id,
        nis: schema.siswa.nis,
        nisn: schema.siswa.nisn,
        nama: schema.siswa.nama,
        jenis_kelamin: schema.siswa.jenis_kelamin,
        tempat_lahir: schema.siswa.tempat_lahir,
        tanggal_lahir: schema.siswa.tanggal_lahir,
        kelas_id: schema.siswa.kelas_id,
        nama_ayah: schema.siswa.nama_ayah,
        nama_ibu: schema.siswa.nama_ibu,
        telepon_ortu: schema.siswa.telepon_ortu,
        alamat: schema.siswa.alamat,
        status: schema.siswa.status,
        kelas_nama: schema.kelas.nama,
      })
      .from(schema.siswa)
      .leftJoin(schema.kelas, eq(schema.siswa.kelas_id, schema.kelas.id))
      .where(whereClause)
      .orderBy(asc(schema.siswa.nama));

    return rows.map((r) => ({
      ...r,
      kelas: r.kelas_id ? { id: r.kelas_id, nama: r.kelas_nama } : null,
    }));
  }

  async getSiswaById(id: number) {
    const [row] = await this.db
      .select({
        id: schema.siswa.id,
        nis: schema.siswa.nis,
        nisn: schema.siswa.nisn,
        nama: schema.siswa.nama,
        jenis_kelamin: schema.siswa.jenis_kelamin,
        tempat_lahir: schema.siswa.tempat_lahir,
        tanggal_lahir: schema.siswa.tanggal_lahir,
        kelas_id: schema.siswa.kelas_id,
        tahun_ajaran_masuk_id: schema.siswa.tahun_ajaran_masuk_id,
        nama_ayah: schema.siswa.nama_ayah,
        nama_ibu: schema.siswa.nama_ibu,
        nama_wali: schema.siswa.nama_wali,
        pekerjaan_ortu: schema.siswa.pekerjaan_ortu,
        telepon_ortu: schema.siswa.telepon_ortu,
        alamat: schema.siswa.alamat,
        status: schema.siswa.status,
        foto_url: schema.siswa.foto_url,
        created_at: schema.siswa.created_at,
        updated_at: schema.siswa.updated_at,
        kelas_nama: schema.kelas.nama,
        kelas_tingkat: schema.kelas.tingkat,
        ta_tahun: schema.tahunAjaran.tahun,
      })
      .from(schema.siswa)
      .leftJoin(schema.kelas, eq(schema.siswa.kelas_id, schema.kelas.id))
      .leftJoin(schema.tahunAjaran, eq(schema.siswa.tahun_ajaran_masuk_id, schema.tahunAjaran.id))
      .where(eq(schema.siswa.id, id))
      .limit(1);

    if (!row) return null;

    return {
      ...row,
      kelas: row.kelas_id
        ? { id: row.kelas_id, nama: row.kelas_nama, tingkat: row.kelas_tingkat }
        : null,
      tahun_ajaran_masuk: row.tahun_ajaran_masuk_id
        ? { id: row.tahun_ajaran_masuk_id, tahun: row.ta_tahun }
        : null,
    };
  }

  async createSiswa(data: any) {
    const [created] = await this.db
      .insert(schema.siswa)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Jika langsung ditentukan kelasnya dan ada TA aktif, buat penempatan
    if (created && created.kelas_id) {
      const activeTa = await this.getActiveTahunAjaran();
      if (activeTa) {
        await this.db.insert(schema.penempatanSiswa).values({
          siswa_id: created.id,
          kelas_id: created.kelas_id,
          tahun_ajaran_id: activeTa.id,
          status: 'aktif',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return created;
  }

  async batchCreateSiswa(validList: any[]) {
    if (!validList || validList.length === 0) return [];
    const activeTa = await this.getActiveTahunAjaran();

    const inserted: any[] = [];
    for (const item of validList) {
      const [res] = await this.db
        .insert(schema.siswa)
        .values({
          ...item,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      if (res && res.kelas_id && activeTa) {
        await this.db.insert(schema.penempatanSiswa).values({
          siswa_id: res.id,
          kelas_id: res.kelas_id,
          tahun_ajaran_id: activeTa.id,
          status: 'aktif',
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      inserted.push(res);
    }
    return inserted;
  }

  async updateSiswa(id: number, data: any) {
    const [updated] = await this.db
      .update(schema.siswa)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.siswa.id, id))
      .returning();
    return updated || null;
  }

  async deleteSiswa(id: number) {
    const [deleted] = await this.db
      .delete(schema.siswa)
      .where(eq(schema.siswa.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 8. AKADEMIK - PENEMPATAN SISWA
  // ==========================================
  async getPenempatanList(params: { tahun_ajaran_id: number; kelas_id?: number }) {
    const conditions: any[] = [eq(schema.penempatanSiswa.tahun_ajaran_id, params.tahun_ajaran_id)];
    if (params.kelas_id) {
      conditions.push(eq(schema.penempatanSiswa.kelas_id, params.kelas_id));
    }

    const rows = await this.db
      .select({
        id: schema.penempatanSiswa.id,
        siswa_id: schema.penempatanSiswa.siswa_id,
        kelas_id: schema.penempatanSiswa.kelas_id,
        tahun_ajaran_id: schema.penempatanSiswa.tahun_ajaran_id,
        status: schema.penempatanSiswa.status,
        catatan: schema.penempatanSiswa.catatan,
        created_at: schema.penempatanSiswa.created_at,
        siswa_nama: schema.siswa.nama,
        siswa_nis: schema.siswa.nis,
        siswa_nisn: schema.siswa.nisn,
        siswa_gender: schema.siswa.jenis_kelamin,
        kelas_nama: schema.kelas.nama,
        kelas_tingkat: schema.kelas.tingkat,
      })
      .from(schema.penempatanSiswa)
      .innerJoin(schema.siswa, eq(schema.penempatanSiswa.siswa_id, schema.siswa.id))
      .innerJoin(schema.kelas, eq(schema.penempatanSiswa.kelas_id, schema.kelas.id))
      .where(and(...conditions))
      .orderBy(asc(schema.siswa.nama));

    return rows.map((r) => ({
      id: r.id,
      siswa_id: r.siswa_id,
      kelas_id: r.kelas_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      status: r.status,
      catatan: r.catatan,
      created_at: r.created_at,
      siswa: {
        id: r.siswa_id,
        nama: r.siswa_nama,
        nis: r.siswa_nis,
        nisn: r.siswa_nisn,
        jenis_kelamin: r.siswa_gender,
      },
      kelas: {
        id: r.kelas_id,
        nama: r.kelas_nama,
        tingkat: r.kelas_tingkat,
      },
    }));
  }

  async getSiswaTanpaKelas(tahun_ajaran_id: number) {
    // Siswa aktif yang belum punya catatan penempatan di TA ini
    const assignedRes = await this.db
      .select({ siswa_id: schema.penempatanSiswa.siswa_id })
      .from(schema.penempatanSiswa)
      .where(eq(schema.penempatanSiswa.tahun_ajaran_id, tahun_ajaran_id));

    const assignedIds = assignedRes.map((r) => r.siswa_id);

    const conditions: any[] = [eq(schema.siswa.status, 'aktif')];
    if (assignedIds.length > 0) {
      conditions.push(sql`${schema.siswa.id} NOT IN (${sql.join(assignedIds, sql`, `)})`);
    }

    return await this.db
      .select({
        id: schema.siswa.id,
        nis: schema.siswa.nis,
        nisn: schema.siswa.nisn,
        nama: schema.siswa.nama,
        jenis_kelamin: schema.siswa.jenis_kelamin,
      })
      .from(schema.siswa)
      .where(and(...conditions))
      .orderBy(asc(schema.siswa.nama));
  }

  async batchTempatkanSiswa(siswa_ids: number[], kelas_id: number, tahun_ajaran_id: number) {
    let countSuccess = 0;
    for (const sid of siswa_ids) {
      // Hapus jika sudah ada di TA ini
      await this.db
        .delete(schema.penempatanSiswa)
        .where(
          and(
            eq(schema.penempatanSiswa.siswa_id, sid),
            eq(schema.penempatanSiswa.tahun_ajaran_id, tahun_ajaran_id)
          )
        );

      await this.db.insert(schema.penempatanSiswa).values({
        siswa_id: sid,
        kelas_id,
        tahun_ajaran_id,
        status: 'aktif',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await this.db
        .update(schema.siswa)
        .set({ kelas_id, updated_at: new Date() })
        .where(eq(schema.siswa.id, sid));

      countSuccess++;
    }
    return { count: countSuccess };
  }

  async batchKenaikanKelas(params: {
    siswa_ids: number[];
    kelas_tujuan_id: number;
    tahun_ajaran_asal_id: number;
    tahun_ajaran_tujuan_id: number;
    status: 'naik_kelas' | 'tinggal_kelas';
  }) {
    let countSuccess = 0;
    for (const sid of params.siswa_ids) {
      // Update status TA asal
      await this.db
        .update(schema.penempatanSiswa)
        .set({ status: params.status, updated_at: new Date() })
        .where(
          and(
            eq(schema.penempatanSiswa.siswa_id, sid),
            eq(schema.penempatanSiswa.tahun_ajaran_id, params.tahun_ajaran_asal_id)
          )
        );

      // Buat penempatan di TA tujuan
      await this.db
        .delete(schema.penempatanSiswa)
        .where(
          and(
            eq(schema.penempatanSiswa.siswa_id, sid),
            eq(schema.penempatanSiswa.tahun_ajaran_id, params.tahun_ajaran_tujuan_id)
          )
        );

      await this.db.insert(schema.penempatanSiswa).values({
        siswa_id: sid,
        kelas_id: params.kelas_tujuan_id,
        tahun_ajaran_id: params.tahun_ajaran_tujuan_id,
        status: 'aktif',
        created_at: new Date(),
        updated_at: new Date(),
      });

      await this.db
        .update(schema.siswa)
        .set({ kelas_id: params.kelas_tujuan_id, updated_at: new Date() })
        .where(eq(schema.siswa.id, sid));

      countSuccess++;
    }
    return { count: countSuccess };
  }

  async batchKelulusan(siswa_ids: number[], tahun_ajaran_id: number) {
    let countSuccess = 0;
    for (const sid of siswa_ids) {
      await this.db
        .update(schema.penempatanSiswa)
        .set({ status: 'lulus', updated_at: new Date() })
        .where(
          and(
            eq(schema.penempatanSiswa.siswa_id, sid),
            eq(schema.penempatanSiswa.tahun_ajaran_id, tahun_ajaran_id)
          )
        );

      await this.db
        .update(schema.siswa)
        .set({ status: 'lulus', kelas_id: null, updated_at: new Date() })
        .where(eq(schema.siswa.id, sid));

      countSuccess++;
    }
    return { count: countSuccess };
  }

  // ==========================================
  // 9. AKADEMIK - PENGAJARAN GURU
  // ==========================================
  async getPengajaranList(params: {
    tahun_ajaran_id?: number;
    guru_id?: number;
    kelas_id?: number;
    mapel_id?: number;
  }) {
    const conditions: any[] = [];
    if (params.tahun_ajaran_id) {
      conditions.push(eq(schema.pengajaranGuru.tahun_ajaran_id, params.tahun_ajaran_id));
    }
    if (params.guru_id) {
      conditions.push(eq(schema.pengajaranGuru.guru_id, params.guru_id));
    }
    if (params.kelas_id) {
      conditions.push(eq(schema.pengajaranGuru.kelas_id, params.kelas_id));
    }
    if (params.mapel_id) {
      conditions.push(eq(schema.pengajaranGuru.mapel_id, params.mapel_id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: schema.pengajaranGuru.id,
        guru_id: schema.pengajaranGuru.guru_id,
        mapel_id: schema.pengajaranGuru.mapel_id,
        kelas_id: schema.pengajaranGuru.kelas_id,
        tahun_ajaran_id: schema.pengajaranGuru.tahun_ajaran_id,
        beban_jp: schema.pengajaranGuru.beban_jp,
        created_at: schema.pengajaranGuru.created_at,
        guru_nama: schema.guru.nama,
        guru_nip: schema.guru.nip,
        mapel_nama: schema.mapel.nama,
        mapel_kode: schema.mapel.kode,
        kelas_nama: schema.kelas.nama,
        kelas_tingkat: schema.kelas.tingkat,
        ta_tahun: schema.tahunAjaran.tahun,
      })
      .from(schema.pengajaranGuru)
      .innerJoin(schema.guru, eq(schema.pengajaranGuru.guru_id, schema.guru.id))
      .innerJoin(schema.mapel, eq(schema.pengajaranGuru.mapel_id, schema.mapel.id))
      .innerJoin(schema.kelas, eq(schema.pengajaranGuru.kelas_id, schema.kelas.id))
      .innerJoin(schema.tahunAjaran, eq(schema.pengajaranGuru.tahun_ajaran_id, schema.tahunAjaran.id))
      .where(whereClause)
      .orderBy(asc(schema.kelas.nama), asc(schema.mapel.nama));

    return rows.map((r) => ({
      id: r.id,
      guru_id: r.guru_id,
      mapel_id: r.mapel_id,
      kelas_id: r.kelas_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      beban_jp: r.beban_jp,
      created_at: r.created_at,
      guru: { id: r.guru_id, nama: r.guru_nama, nip: r.guru_nip },
      mapel: { id: r.mapel_id, nama: r.mapel_nama, kode: r.mapel_kode },
      kelas: { id: r.kelas_id, nama: r.kelas_nama, tingkat: r.kelas_tingkat },
      tahun_ajaran: { id: r.tahun_ajaran_id, tahun: r.ta_tahun },
    }));
  }

  async createPengajaran(data: any) {
    const [created] = await this.db
      .insert(schema.pengajaranGuru)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async deletePengajaran(id: number) {
    const [deleted] = await this.db
      .delete(schema.pengajaranGuru)
      .where(eq(schema.pengajaranGuru.id, id))
      .returning();
    return !!deleted;
  }

  async setWaliKelas(kelas_id: number, guru_id: number | null) {
    const [updated] = await this.db
      .update(schema.kelas)
      .set({ wali_kelas_id: guru_id, updated_at: new Date() })
      .where(eq(schema.kelas.id, kelas_id))
      .returning();
    return updated || null;
  }

  async getGuruAccessScope(guru_id: number, tahun_ajaran_id: number) {
    // 1. Cek kelas di mana guru adalah wali kelas
    const waliKelasRows = await this.db
      .select({ id: schema.kelas.id })
      .from(schema.kelas)
      .where(eq(schema.kelas.wali_kelas_id, guru_id));

    const waliKelasIds = waliKelasRows.map((r) => r.id);

    // 2. Cek pengajaran guru
    const ajarRows = await this.db
      .select({
        kelas_id: schema.pengajaranGuru.kelas_id,
        mapel_id: schema.pengajaranGuru.mapel_id,
      })
      .from(schema.pengajaranGuru)
      .where(
        and(
          eq(schema.pengajaranGuru.guru_id, guru_id),
          eq(schema.pengajaranGuru.tahun_ajaran_id, tahun_ajaran_id)
        )
      );

    const taughtKelasIds = ajarRows.map((r) => r.kelas_id);
    const taughtMapelIds = Array.from(new Set(ajarRows.map((r) => r.mapel_id)));
    const allowedKelasIds = Array.from(new Set([...waliKelasIds, ...taughtKelasIds]));

    return {
      allowedKelasIds,
      taughtMapelIds,
      waliKelasIds,
    };
  }

  // ==========================================
  // 10. AKADEMIK - JADWAL PELAJARAN
  // ==========================================
  async getJadwalList(params: {
    tahun_ajaran_id?: number;
    kelas_id?: number;
    guru_id?: number;
    hari?: string;
  }) {
    const conditions: any[] = [];
    if (params.tahun_ajaran_id) {
      conditions.push(eq(schema.jadwalPelajaran.tahun_ajaran_id, params.tahun_ajaran_id));
    }
    if (params.kelas_id) {
      conditions.push(eq(schema.jadwalPelajaran.kelas_id, params.kelas_id));
    }
    if (params.guru_id) {
      conditions.push(eq(schema.jadwalPelajaran.guru_id, params.guru_id));
    }
    if (params.hari && params.hari !== 'Semua') {
      conditions.push(eq(schema.jadwalPelajaran.hari, params.hari));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await this.db
      .select({
        id: schema.jadwalPelajaran.id,
        tahun_ajaran_id: schema.jadwalPelajaran.tahun_ajaran_id,
        kelas_id: schema.jadwalPelajaran.kelas_id,
        mapel_id: schema.jadwalPelajaran.mapel_id,
        guru_id: schema.jadwalPelajaran.guru_id,
        hari: schema.jadwalPelajaran.hari,
        jam_ke: schema.jadwalPelajaran.jam_ke,
        jam_mulai: schema.jadwalPelajaran.jam_mulai,
        jam_selesai: schema.jadwalPelajaran.jam_selesai,
        ruang: schema.jadwalPelajaran.ruang,
        mapel_nama: schema.mapel.nama,
        mapel_kode: schema.mapel.kode,
        guru_nama: schema.guru.nama,
        guru_nip: schema.guru.nip,
        kelas_nama: schema.kelas.nama,
      })
      .from(schema.jadwalPelajaran)
      .innerJoin(schema.mapel, eq(schema.jadwalPelajaran.mapel_id, schema.mapel.id))
      .innerJoin(schema.guru, eq(schema.jadwalPelajaran.guru_id, schema.guru.id))
      .innerJoin(schema.kelas, eq(schema.jadwalPelajaran.kelas_id, schema.kelas.id))
      .where(whereClause)
      .orderBy(asc(schema.jadwalPelajaran.hari), asc(schema.jadwalPelajaran.jam_ke));

    return rows.map((r) => ({
      id: r.id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      kelas_id: r.kelas_id,
      mapel_id: r.mapel_id,
      guru_id: r.guru_id,
      hari: r.hari,
      jam_ke: r.jam_ke,
      jam_mulai: r.jam_mulai,
      jam_selesai: r.jam_selesai,
      ruang: r.ruang,
      mapel: { id: r.mapel_id, nama: r.mapel_nama, kode: r.mapel_kode },
      guru: { id: r.guru_id, nama: r.guru_nama, nip: r.guru_nip },
      kelas: { id: r.kelas_id, nama: r.kelas_nama },
    }));
  }

  async checkJadwalConflict(data: any, excludeId?: number) {
    const conditionsGuru: any[] = [
      eq(schema.jadwalPelajaran.tahun_ajaran_id, data.tahun_ajaran_id),
      eq(schema.jadwalPelajaran.guru_id, data.guru_id),
      eq(schema.jadwalPelajaran.hari, data.hari),
      eq(schema.jadwalPelajaran.jam_ke, data.jam_ke),
    ];
    if (excludeId) {
      conditionsGuru.push(sql`${schema.jadwalPelajaran.id} != ${excludeId}`);
    }

    const [conflictGuru] = await this.db
      .select()
      .from(schema.jadwalPelajaran)
      .where(and(...conditionsGuru))
      .limit(1);

    if (conflictGuru) {
      return { conflict: true, reason: 'Guru sudah mengajar di kelas lain pada jam dan hari ini.' };
    }

    const conditionsKelas: any[] = [
      eq(schema.jadwalPelajaran.tahun_ajaran_id, data.tahun_ajaran_id),
      eq(schema.jadwalPelajaran.kelas_id, data.kelas_id),
      eq(schema.jadwalPelajaran.hari, data.hari),
      eq(schema.jadwalPelajaran.jam_ke, data.jam_ke),
    ];
    if (excludeId) {
      conditionsKelas.push(sql`${schema.jadwalPelajaran.id} != ${excludeId}`);
    }

    const [conflictKelas] = await this.db
      .select()
      .from(schema.jadwalPelajaran)
      .where(and(...conditionsKelas))
      .limit(1);

    if (conflictKelas) {
      return { conflict: true, reason: 'Kelas ini sudah memiliki jadwal mata pelajaran lain pada jam ini.' };
    }

    return { conflict: false };
  }

  async createJadwal(data: any) {
    const conflictCheck = await this.checkJadwalConflict(data);
    if (conflictCheck.conflict) {
      throw new Error(conflictCheck.reason);
    }

    const [created] = await this.db
      .insert(schema.jadwalPelajaran)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async updateJadwal(id: number, data: any) {
    const conflictCheck = await this.checkJadwalConflict(data, id);
    if (conflictCheck.conflict) {
      throw new Error(conflictCheck.reason);
    }

    const [updated] = await this.db
      .update(schema.jadwalPelajaran)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.jadwalPelajaran.id, id))
      .returning();
    return updated || null;
  }

  async deleteJadwal(id: number) {
    const [deleted] = await this.db
      .delete(schema.jadwalPelajaran)
      .where(eq(schema.jadwalPelajaran.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 11. AKADEMIK - ABSENSI SISWA
  // ==========================================
  async getAbsensiByTanggal(kelas_id: number, tanggal: string, tahun_ajaran_id: number) {
    // 1. Ambil semua siswa di kelas ini
    const penempatanRows = await this.db
      .select({
        siswa_id: schema.siswa.id,
        nama: schema.siswa.nama,
        nis: schema.siswa.nis,
        jenis_kelamin: schema.siswa.jenis_kelamin,
      })
      .from(schema.penempatanSiswa)
      .innerJoin(schema.siswa, eq(schema.penempatanSiswa.siswa_id, schema.siswa.id))
      .where(
        and(
          eq(schema.penempatanSiswa.kelas_id, kelas_id),
          eq(schema.penempatanSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      )
      .orderBy(asc(schema.siswa.nama));

    const siswaList =
      penempatanRows.length > 0
        ? penempatanRows
        : await this.db
            .select({
              siswa_id: schema.siswa.id,
              nama: schema.siswa.nama,
              nis: schema.siswa.nis,
              jenis_kelamin: schema.siswa.jenis_kelamin,
            })
            .from(schema.siswa)
            .where(and(eq(schema.siswa.kelas_id, kelas_id), eq(schema.siswa.status, 'aktif')))
            .orderBy(asc(schema.siswa.nama));

    // 2. Ambil absensi yang sudah ada pada tanggal ini
    const absensiRows = await this.db
      .select()
      .from(schema.absensiSiswa)
      .where(
        and(
          eq(schema.absensiSiswa.kelas_id, kelas_id),
          eq(schema.absensiSiswa.tanggal, tanggal),
          eq(schema.absensiSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      );

    const absensiMap = new Map(absensiRows.map((a) => [a.siswa_id, a]));

    return siswaList.map((s) => {
      const existing = absensiMap.get(s.siswa_id);
      return {
        siswa_id: s.siswa_id,
        nama: s.nama,
        nis: s.nis,
        jenis_kelamin: s.jenis_kelamin,
        status: existing?.status || 'H',
        catatan: existing?.catatan || '',
      };
    });
  }

  async saveBatchAbsensi(
    kelas_id: number,
    tanggal: string,
    tahun_ajaran_id: number,
    items: Array<{ siswa_id: number; status: string; catatan?: string }>,
    created_by_user_id?: number
  ) {
    for (const item of items) {
      const [existing] = await this.db
        .select({ id: schema.absensiSiswa.id })
        .from(schema.absensiSiswa)
        .where(
          and(
            eq(schema.absensiSiswa.siswa_id, item.siswa_id),
            eq(schema.absensiSiswa.kelas_id, kelas_id),
            eq(schema.absensiSiswa.tanggal, tanggal),
            eq(schema.absensiSiswa.tahun_ajaran_id, tahun_ajaran_id)
          )
        )
        .limit(1);

      if (existing) {
        await this.db
          .update(schema.absensiSiswa)
          .set({
            status: item.status,
            catatan: item.catatan || null,
            updated_at: new Date(),
          })
          .where(eq(schema.absensiSiswa.id, existing.id));
      } else {
        await this.db.insert(schema.absensiSiswa).values({
          siswa_id: item.siswa_id,
          kelas_id,
          tahun_ajaran_id,
          tanggal,
          status: item.status,
          catatan: item.catatan || null,
          created_by_user_id: created_by_user_id || null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }
    return { success: true, count: items.length };
  }

  async getRekapAbsensi(kelas_id: number, tahun_ajaran_id: number, bulan?: string) {
    const penempatanRows = await this.db
      .select({
        siswa_id: schema.siswa.id,
        nama: schema.siswa.nama,
        nis: schema.siswa.nis,
      })
      .from(schema.penempatanSiswa)
      .innerJoin(schema.siswa, eq(schema.penempatanSiswa.siswa_id, schema.siswa.id))
      .where(
        and(
          eq(schema.penempatanSiswa.kelas_id, kelas_id),
          eq(schema.penempatanSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      )
      .orderBy(asc(schema.siswa.nama));

    const siswaList =
      penempatanRows.length > 0
        ? penempatanRows
        : await this.db
            .select({
              siswa_id: schema.siswa.id,
              nama: schema.siswa.nama,
              nis: schema.siswa.nis,
            })
            .from(schema.siswa)
            .where(and(eq(schema.siswa.kelas_id, kelas_id), eq(schema.siswa.status, 'aktif')))
            .orderBy(asc(schema.siswa.nama));

    const absensiCond: any[] = [
      eq(schema.absensiSiswa.kelas_id, kelas_id),
      eq(schema.absensiSiswa.tahun_ajaran_id, tahun_ajaran_id),
    ];
    if (bulan) {
      absensiCond.push(sql`TO_CHAR(${schema.absensiSiswa.tanggal}, 'YYYY-MM') = ${bulan}`);
    }

    const allAbsensi = await this.db
      .select()
      .from(schema.absensiSiswa)
      .where(and(...absensiCond));

    return siswaList.map((s) => {
      const records = allAbsensi.filter((a) => a.siswa_id === s.siswa_id);
      const hadir = records.filter((r) => r.status === 'H').length;
      const izin = records.filter((r) => r.status === 'I').length;
      const sakit = records.filter((r) => r.status === 'S').length;
      const alpa = records.filter((r) => r.status === 'A').length;
      const total = hadir + izin + sakit + alpa;
      const persentase = total > 0 ? Math.round((hadir / total) * 100) : 100;

      return {
        siswa_id: s.siswa_id,
        nama: s.nama,
        nis: s.nis,
        hadir,
        izin,
        sakit,
        alpa,
        total,
        persentase,
      };
    });
  }

  // ==========================================
  // 12. AKADEMIK - BOBOT NILAI & NILAI SISWA
  // ==========================================
  async getBobotNilai(tahun_ajaran_id: number) {
    const [row] = await this.db
      .select()
      .from(schema.bobotNilai)
      .where(eq(schema.bobotNilai.tahun_ajaran_id, tahun_ajaran_id))
      .limit(1);

    if (row) return row;

    return {
      tahun_ajaran_id,
      bobot_tugas: 20,
      bobot_uh: 20,
      bobot_uts: 25,
      bobot_uas: 25,
      bobot_keterampilan: 10,
    };
  }

  async saveBobotNilai(tahun_ajaran_id: number, data: any) {
    const [existing] = await this.db
      .select({ id: schema.bobotNilai.id })
      .from(schema.bobotNilai)
      .where(eq(schema.bobotNilai.tahun_ajaran_id, tahun_ajaran_id))
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(schema.bobotNilai)
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where(eq(schema.bobotNilai.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await this.db
        .insert(schema.bobotNilai)
        .values({
          tahun_ajaran_id,
          ...data,
          updated_at: new Date(),
        })
        .returning();
      return created;
    }
  }

  async getNilaiByKelasMapel(kelas_id: number, mapel_id: number, tahun_ajaran_id: number) {
    const penempatanRows = await this.db
      .select({
        siswa_id: schema.siswa.id,
        nama: schema.siswa.nama,
        nis: schema.siswa.nis,
      })
      .from(schema.penempatanSiswa)
      .innerJoin(schema.siswa, eq(schema.penempatanSiswa.siswa_id, schema.siswa.id))
      .where(
        and(
          eq(schema.penempatanSiswa.kelas_id, kelas_id),
          eq(schema.penempatanSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      )
      .orderBy(asc(schema.siswa.nama));

    const siswaList =
      penempatanRows.length > 0
        ? penempatanRows
        : await this.db
            .select({
              siswa_id: schema.siswa.id,
              nama: schema.siswa.nama,
              nis: schema.siswa.nis,
            })
            .from(schema.siswa)
            .where(and(eq(schema.siswa.kelas_id, kelas_id), eq(schema.siswa.status, 'aktif')))
            .orderBy(asc(schema.siswa.nama));

    const nilaiRows = await this.db
      .select()
      .from(schema.nilaiSiswa)
      .where(
        and(
          eq(schema.nilaiSiswa.kelas_id, kelas_id),
          eq(schema.nilaiSiswa.mapel_id, mapel_id),
          eq(schema.nilaiSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      );

    const nilaiMap = new Map(nilaiRows.map((n) => [n.siswa_id, n]));

    return siswaList.map((s) => {
      const existing = nilaiMap.get(s.siswa_id);
      return {
        siswa_id: s.siswa_id,
        nama: s.nama,
        nis: s.nis,
        nilai_tugas: existing ? Number(existing.nilai_tugas) : 0,
        nilai_uh: existing ? Number(existing.nilai_uh) : 0,
        nilai_uts: existing ? Number(existing.nilai_uts) : 0,
        nilai_uas: existing ? Number(existing.nilai_uas) : 0,
        nilai_keterampilan: existing ? Number(existing.nilai_keterampilan) : 0,
        nilai_akhir: existing ? Number(existing.nilai_akhir) : 0,
        predikat: existing?.predikat || 'C',
        catatan: existing?.catatan || '',
      };
    });
  }

  async saveBatchNilai(
    kelas_id: number,
    mapel_id: number,
    tahun_ajaran_id: number,
    items: Array<any>
  ) {
    const bobot = await this.getBobotNilai(tahun_ajaran_id);

    for (const item of items) {
      const tugas = Number(item.nilai_tugas) || 0;
      const uh = Number(item.nilai_uh) || 0;
      const uts = Number(item.nilai_uts) || 0;
      const uas = Number(item.nilai_uas) || 0;
      const ket = Number(item.nilai_keterampilan) || 0;

      const totalBobot =
        bobot.bobot_tugas +
        bobot.bobot_uh +
        bobot.bobot_uts +
        bobot.bobot_uas +
        bobot.bobot_keterampilan;

      const nilaiAkhirNum =
        totalBobot > 0
          ? (tugas * bobot.bobot_tugas +
              uh * bobot.bobot_uh +
              uts * bobot.bobot_uts +
              uas * bobot.bobot_uas +
              ket * bobot.bobot_keterampilan) /
            totalBobot
          : 0;

      const nilaiAkhir = Math.round(nilaiAkhirNum * 100) / 100;

      let predikat = 'D';
      if (nilaiAkhir >= 90) predikat = 'A';
      else if (nilaiAkhir >= 80) predikat = 'B';
      else if (nilaiAkhir >= 70) predikat = 'C';

      const [existing] = await this.db
        .select({ id: schema.nilaiSiswa.id })
        .from(schema.nilaiSiswa)
        .where(
          and(
            eq(schema.nilaiSiswa.siswa_id, item.siswa_id),
            eq(schema.nilaiSiswa.mapel_id, mapel_id),
            eq(schema.nilaiSiswa.kelas_id, kelas_id),
            eq(schema.nilaiSiswa.tahun_ajaran_id, tahun_ajaran_id)
          )
        )
        .limit(1);

      if (existing) {
        await this.db
          .update(schema.nilaiSiswa)
          .set({
            nilai_tugas: String(tugas),
            nilai_uh: String(uh),
            nilai_uts: String(uts),
            nilai_uas: String(uas),
            nilai_keterampilan: String(ket),
            nilai_akhir: String(nilaiAkhir),
            predikat,
            catatan: item.catatan || null,
            updated_at: new Date(),
          })
          .where(eq(schema.nilaiSiswa.id, existing.id));
      } else {
        await this.db.insert(schema.nilaiSiswa).values({
          siswa_id: item.siswa_id,
          mapel_id,
          kelas_id,
          tahun_ajaran_id,
          nilai_tugas: String(tugas),
          nilai_uh: String(uh),
          nilai_uts: String(uts),
          nilai_uas: String(uas),
          nilai_keterampilan: String(ket),
          nilai_akhir: String(nilaiAkhir),
          predikat,
          catatan: item.catatan || null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return { success: true, count: items.length };
  }

  // ==========================================
  // 13. AKADEMIK - CATATAN RAPOR & RAPOR LENGKAP
  // ==========================================
  async getCatatanRaporByKelas(kelas_id: number, tahun_ajaran_id: number) {
    const penempatanRows = await this.db
      .select({
        siswa_id: schema.siswa.id,
        nama: schema.siswa.nama,
        nis: schema.siswa.nis,
      })
      .from(schema.penempatanSiswa)
      .innerJoin(schema.siswa, eq(schema.penempatanSiswa.siswa_id, schema.siswa.id))
      .where(
        and(
          eq(schema.penempatanSiswa.kelas_id, kelas_id),
          eq(schema.penempatanSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      )
      .orderBy(asc(schema.siswa.nama));

    const siswaList =
      penempatanRows.length > 0
        ? penempatanRows
        : await this.db
            .select({
              siswa_id: schema.siswa.id,
              nama: schema.siswa.nama,
              nis: schema.siswa.nis,
            })
            .from(schema.siswa)
            .where(and(eq(schema.siswa.kelas_id, kelas_id), eq(schema.siswa.status, 'aktif')))
            .orderBy(asc(schema.siswa.nama));

    const catatanRows = await this.db
      .select()
      .from(schema.catatanRaporSiswa)
      .where(
        and(
          eq(schema.catatanRaporSiswa.kelas_id, kelas_id),
          eq(schema.catatanRaporSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      );

    const catatanMap = new Map(catatanRows.map((c) => [c.siswa_id, c]));

    return siswaList.map((s) => {
      const c = catatanMap.get(s.siswa_id);
      return {
        siswa_id: s.siswa_id,
        nama: s.nama,
        nis: s.nis,
        sikap_spiritual: c?.sikap_spiritual || 'Baik',
        deskripsi_spiritual: c?.deskripsi_spiritual || '',
        sikap_sosial: c?.sikap_sosial || 'Baik',
        deskripsi_sosial: c?.deskripsi_sosial || '',
        juz_hafalan: c?.juz_hafalan || '',
        surah_terakhir: c?.surah_terakhir || '',
        predikat_tahfidz: c?.predikat_tahfidz || 'Jayyid',
        catatan_wali_kelas: c?.catatan_wali_kelas || '',
        status_akhir: c?.status_akhir || 'Belum Ditentukan',
        naik_ke_kelas: c?.naik_ke_kelas || '',
      };
    });
  }

  async saveCatatanRapor(kelas_id: number, tahun_ajaran_id: number, items: Array<any>) {
    for (const item of items) {
      const [existing] = await this.db
        .select({ id: schema.catatanRaporSiswa.id })
        .from(schema.catatanRaporSiswa)
        .where(
          and(
            eq(schema.catatanRaporSiswa.siswa_id, item.siswa_id),
            eq(schema.catatanRaporSiswa.kelas_id, kelas_id),
            eq(schema.catatanRaporSiswa.tahun_ajaran_id, tahun_ajaran_id)
          )
        )
        .limit(1);

      if (existing) {
        await this.db
          .update(schema.catatanRaporSiswa)
          .set({
            ...item,
            updated_at: new Date(),
          })
          .where(eq(schema.catatanRaporSiswa.id, existing.id));
      } else {
        await this.db.insert(schema.catatanRaporSiswa).values({
          siswa_id: item.siswa_id,
          kelas_id,
          tahun_ajaran_id,
          ...item,
          updated_at: new Date(),
        });
      }
    }
    return { success: true, count: items.length };
  }

  async getRaporLengkap(siswa_id: number, tahun_ajaran_id: number) {
    const siswa = await this.getSiswaById(siswa_id);
    if (!siswa) return null;

    const madrasah = await this.getMadrasahProfile();
    const ta = await this.getTahunAjaranById(tahun_ajaran_id);
    const kelas = siswa.kelas_id ? await this.getKelasById(siswa.kelas_id) : null;

    // Nilai mata pelajaran
    const nilaiRows = await this.db
      .select({
        mapel_id: schema.nilaiSiswa.mapel_id,
        nilai_tugas: schema.nilaiSiswa.nilai_tugas,
        nilai_uh: schema.nilaiSiswa.nilai_uh,
        nilai_uts: schema.nilaiSiswa.nilai_uts,
        nilai_uas: schema.nilaiSiswa.nilai_uas,
        nilai_keterampilan: schema.nilaiSiswa.nilai_keterampilan,
        nilai_akhir: schema.nilaiSiswa.nilai_akhir,
        predikat: schema.nilaiSiswa.predikat,
        catatan: schema.nilaiSiswa.catatan,
        mapel_nama: schema.mapel.nama,
        mapel_kode: schema.mapel.kode,
        mapel_kelompok: schema.mapel.kelompok,
        mapel_kkm: schema.mapel.kkm,
      })
      .from(schema.nilaiSiswa)
      .innerJoin(schema.mapel, eq(schema.nilaiSiswa.mapel_id, schema.mapel.id))
      .where(
        and(
          eq(schema.nilaiSiswa.siswa_id, siswa_id),
          eq(schema.nilaiSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      )
      .orderBy(asc(schema.mapel.kode));

    // Rekap Absensi siswa
    const absensiRecords = await this.db
      .select()
      .from(schema.absensiSiswa)
      .where(
        and(
          eq(schema.absensiSiswa.siswa_id, siswa_id),
          eq(schema.absensiSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      );

    const hadir = absensiRecords.filter((a) => a.status === 'H').length;
    const izin = absensiRecords.filter((a) => a.status === 'I').length;
    const sakit = absensiRecords.filter((a) => a.status === 'S').length;
    const alpa = absensiRecords.filter((a) => a.status === 'A').length;

    // Catatan Rapor
    const [catatan] = await this.db
      .select()
      .from(schema.catatanRaporSiswa)
      .where(
        and(
          eq(schema.catatanRaporSiswa.siswa_id, siswa_id),
          eq(schema.catatanRaporSiswa.tahun_ajaran_id, tahun_ajaran_id)
        )
      )
      .limit(1);

    return {
      siswa,
      madrasah,
      tahun_ajaran: ta,
      kelas,
      nilai: nilaiRows.map((n) => ({
        mapel_id: n.mapel_id,
        nama: n.mapel_nama,
        kode: n.mapel_kode,
        kelompok: n.mapel_kelompok,
        kkm: n.mapel_kkm,
        nilai_akhir: Number(n.nilai_akhir),
        predikat: n.predikat,
        catatan: n.catatan,
      })),
      absensi: { hadir, izin, sakit, alpa },
      catatan: catatan || {
        sikap_spiritual: 'Baik',
        deskripsi_spiritual: 'Menunjukkan ketaatan beribadah dan akhlak terpuji.',
        sikap_sosial: 'Baik',
        deskripsi_sosial: 'Menunjukkan kepedulian sosial, sopan santun, dan kerja sama yang baik.',
        juz_hafalan: 'Juz 30',
        surah_terakhir: 'An-Naba',
        predikat_tahfidz: 'Jayyid',
        catatan_wali_kelas: 'Tingkatkan terus prestasi belajar dan kedisiplinan.',
        status_akhir: 'Naik Kelas',
      },
    };
  }

  // ==========================================
  // 14. KEUANGAN - JENIS & TARIF PEMBAYARAN
  // ==========================================
  async getJenisPembayaranList(tahun_ajaran_id?: number) {
    const conditions: any[] = [];
    if (tahun_ajaran_id) {
      conditions.push(eq(schema.jenisPembayaran.tahun_ajaran_id, tahun_ajaran_id));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await this.db
      .select()
      .from(schema.jenisPembayaran)
      .where(whereClause)
      .orderBy(desc(schema.jenisPembayaran.id));

    return await Promise.all(
      list.map(async (j) => {
        const tarifList = await this.db
          .select({
            id: schema.tarifPembayaran.id,
            jenis_pembayaran_id: schema.tarifPembayaran.jenis_pembayaran_id,
            tingkat: schema.tarifPembayaran.tingkat,
            kelas_id: schema.tarifPembayaran.kelas_id,
            nominal: schema.tarifPembayaran.nominal,
            kelas_nama: schema.kelas.nama,
          })
          .from(schema.tarifPembayaran)
          .leftJoin(schema.kelas, eq(schema.tarifPembayaran.kelas_id, schema.kelas.id))
          .where(eq(schema.tarifPembayaran.jenis_pembayaran_id, j.id));

        return {
          ...j,
          tarifList: tarifList.map((t) => ({
            ...t,
            nominal: Number(t.nominal),
            kelas: t.kelas_id ? { id: t.kelas_id, nama: t.kelas_nama } : null,
          })),
        };
      })
    );
  }

  async getJenisPembayaranById(id: number) {
    const [item] = await this.db
      .select()
      .from(schema.jenisPembayaran)
      .where(eq(schema.jenisPembayaran.id, id))
      .limit(1);

    if (!item) return null;

    const tarifList = await this.db
      .select({
        id: schema.tarifPembayaran.id,
        jenis_pembayaran_id: schema.tarifPembayaran.jenis_pembayaran_id,
        tingkat: schema.tarifPembayaran.tingkat,
        kelas_id: schema.tarifPembayaran.kelas_id,
        nominal: schema.tarifPembayaran.nominal,
        kelas_nama: schema.kelas.nama,
      })
      .from(schema.tarifPembayaran)
      .leftJoin(schema.kelas, eq(schema.tarifPembayaran.kelas_id, schema.kelas.id))
      .where(eq(schema.tarifPembayaran.jenis_pembayaran_id, id));

    return {
      ...item,
      tarifList: tarifList.map((t) => ({
        ...t,
        nominal: Number(t.nominal),
        kelas: t.kelas_id ? { id: t.kelas_id, nama: t.kelas_nama } : null,
      })),
    };
  }

  async createJenisPembayaran(data: any) {
    const { tarifList, ...jenisData } = data;
    const [created] = await this.db
      .insert(schema.jenisPembayaran)
      .values({
        ...jenisData,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    if (created && Array.isArray(tarifList)) {
      for (const t of tarifList) {
        await this.db.insert(schema.tarifPembayaran).values({
          jenis_pembayaran_id: created.id,
          tingkat: t.tingkat || 'Semua',
          kelas_id: t.kelas_id ? Number(t.kelas_id) : null,
          nominal: String(t.nominal || 0),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return await this.getJenisPembayaranById(created.id);
  }

  async updateJenisPembayaran(id: number, data: any) {
    const { tarifList, ...jenisData } = data;
    await this.db
      .update(schema.jenisPembayaran)
      .set({
        ...jenisData,
        updated_at: new Date(),
      })
      .where(eq(schema.jenisPembayaran.id, id));

    if (Array.isArray(tarifList)) {
      await this.db
        .delete(schema.tarifPembayaran)
        .where(eq(schema.tarifPembayaran.jenis_pembayaran_id, id));

      for (const t of tarifList) {
        await this.db.insert(schema.tarifPembayaran).values({
          jenis_pembayaran_id: id,
          tingkat: t.tingkat || 'Semua',
          kelas_id: t.kelas_id ? Number(t.kelas_id) : null,
          nominal: String(t.nominal || 0),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    }

    return await this.getJenisPembayaranById(id);
  }

  async deleteJenisPembayaran(id: number) {
    const [used] = await this.db
      .select({ id: schema.tagihanSiswa.id })
      .from(schema.tagihanSiswa)
      .where(eq(schema.tagihanSiswa.jenis_pembayaran_id, id))
      .limit(1);

    if (used) {
      throw new Error('Pos pembayaran ini sudah memiliki riwayat tagihan dan tidak dapat dihapus.');
    }

    await this.db
      .delete(schema.tarifPembayaran)
      .where(eq(schema.tarifPembayaran.jenis_pembayaran_id, id));

    const [deleted] = await this.db
      .delete(schema.jenisPembayaran)
      .where(eq(schema.jenisPembayaran.id, id))
      .returning();

    return !!deleted;
  }

  // ==========================================
  // 15. KEUANGAN - TAGIHAN SISWA
  // ==========================================
  async generateTagihanMassal(data: {
    jenis_pembayaran_id: number;
    tahun_ajaran_id: number;
    kelas_id?: number | null;
    tingkat?: string | null;
    bulan_list?: string[];
    nominal_override?: number | null;
    jatuh_tempo?: string | null;
  }) {
    const jenis = await this.getJenisPembayaranById(data.jenis_pembayaran_id);
    if (!jenis) throw new Error('Jenis pembayaran tidak ditemukan.');

    // Cari siswa sasaran
    const conditions: any[] = [eq(schema.siswa.status, 'aktif')];
    if (data.kelas_id) {
      conditions.push(eq(schema.siswa.kelas_id, data.kelas_id));
    }
    if (data.tingkat && data.tingkat !== 'Semua') {
      const kelasInTingkat = await this.db
        .select({ id: schema.kelas.id })
        .from(schema.kelas)
        .where(eq(schema.kelas.tingkat, data.tingkat));
      const kIds = kelasInTingkat.map((k) => k.id);
      if (kIds.length > 0) {
        conditions.push(inArray(schema.siswa.kelas_id, kIds));
      } else {
        return { count: 0, message: 'Tidak ada kelas pada tingkat tersebut.' };
      }
    }

    const siswaList = await this.db
      .select({
        id: schema.siswa.id,
        kelas_id: schema.siswa.kelas_id,
      })
      .from(schema.siswa)
      .where(and(...conditions));

    const bulanArr =
      jenis.tipe === 'bulanan' && Array.isArray(data.bulan_list) && data.bulan_list.length > 0
        ? data.bulan_list
        : [null];

    let createdCount = 0;

    for (const s of siswaList) {
      if (!s.kelas_id) continue;

      // Cari nominal
      let nominal = Number(data.nominal_override) || 0;
      if (!nominal) {
        const tarifMatch =
          jenis.tarifList.find((t: any) => t.kelas_id === s.kelas_id) ||
          jenis.tarifList.find((t: any) => t.tingkat === 'Semua') ||
          jenis.tarifList[0];
        nominal = tarifMatch ? Number(tarifMatch.nominal) : 0;
      }

      for (const b of bulanArr) {
        // Cek duplikasi
        const checkCond: any[] = [
          eq(schema.tagihanSiswa.siswa_id, s.id),
          eq(schema.tagihanSiswa.jenis_pembayaran_id, data.jenis_pembayaran_id),
          eq(schema.tagihanSiswa.tahun_ajaran_id, data.tahun_ajaran_id),
        ];
        if (b) {
          checkCond.push(eq(schema.tagihanSiswa.bulan, b));
        }

        const [existing] = await this.db
          .select({ id: schema.tagihanSiswa.id })
          .from(schema.tagihanSiswa)
          .where(and(...checkCond))
          .limit(1);

        if (!existing) {
          await this.db.insert(schema.tagihanSiswa).values({
            siswa_id: s.id,
            kelas_id: s.kelas_id,
            jenis_pembayaran_id: data.jenis_pembayaran_id,
            tahun_ajaran_id: data.tahun_ajaran_id,
            bulan: b,
            nominal: String(nominal),
            terbayar: '0',
            sisa: String(nominal),
            status: 'belum_bayar',
            jatuh_tempo: data.jatuh_tempo || null,
            created_at: new Date(),
            updated_at: new Date(),
          });
          createdCount++;
        }
      }
    }

    return { count: createdCount };
  }

  async getTagihanList(params: {
    kelas_id?: number;
    status?: string;
    jenis_pembayaran_id?: number;
    tahun_ajaran_id?: number;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.kelas_id) conditions.push(eq(schema.tagihanSiswa.kelas_id, params.kelas_id));
    if (params.status && params.status !== 'semua') {
      conditions.push(eq(schema.tagihanSiswa.status, params.status));
    }
    if (params.jenis_pembayaran_id) {
      conditions.push(eq(schema.tagihanSiswa.jenis_pembayaran_id, params.jenis_pembayaran_id));
    }
    if (params.tahun_ajaran_id) {
      conditions.push(eq(schema.tagihanSiswa.tahun_ajaran_id, params.tahun_ajaran_id));
    }
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(schema.siswa.nama, q),
          ilike(schema.siswa.nis, q),
          ilike(schema.jenisPembayaran.nama, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.tagihanSiswa)
      .innerJoin(schema.siswa, eq(schema.tagihanSiswa.siswa_id, schema.siswa.id))
      .innerJoin(schema.jenisPembayaran, eq(schema.tagihanSiswa.jenis_pembayaran_id, schema.jenisPembayaran.id))
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const rows = await this.db
      .select({
        id: schema.tagihanSiswa.id,
        siswa_id: schema.tagihanSiswa.siswa_id,
        kelas_id: schema.tagihanSiswa.kelas_id,
        jenis_pembayaran_id: schema.tagihanSiswa.jenis_pembayaran_id,
        tahun_ajaran_id: schema.tagihanSiswa.tahun_ajaran_id,
        bulan: schema.tagihanSiswa.bulan,
        nominal: schema.tagihanSiswa.nominal,
        terbayar: schema.tagihanSiswa.terbayar,
        sisa: schema.tagihanSiswa.sisa,
        status: schema.tagihanSiswa.status,
        jatuh_tempo: schema.tagihanSiswa.jatuh_tempo,
        created_at: schema.tagihanSiswa.created_at,
        siswa_nama: schema.siswa.nama,
        siswa_nis: schema.siswa.nis,
        kelas_nama: schema.kelas.nama,
        jenis_nama: schema.jenisPembayaran.nama,
        jenis_tipe: schema.jenisPembayaran.tipe,
      })
      .from(schema.tagihanSiswa)
      .innerJoin(schema.siswa, eq(schema.tagihanSiswa.siswa_id, schema.siswa.id))
      .innerJoin(schema.kelas, eq(schema.tagihanSiswa.kelas_id, schema.kelas.id))
      .innerJoin(schema.jenisPembayaran, eq(schema.tagihanSiswa.jenis_pembayaran_id, schema.jenisPembayaran.id))
      .where(whereClause)
      .orderBy(desc(schema.tagihanSiswa.id))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      id: r.id,
      siswa_id: r.siswa_id,
      kelas_id: r.kelas_id,
      jenis_pembayaran_id: r.jenis_pembayaran_id,
      tahun_ajaran_id: r.tahun_ajaran_id,
      bulan: r.bulan,
      nominal: Number(r.nominal),
      terbayar: Number(r.terbayar),
      sisa: Number(r.sisa),
      status: r.status,
      jatuh_tempo: r.jatuh_tempo,
      created_at: r.created_at,
      siswa: { id: r.siswa_id, nama: r.siswa_nama, nis: r.siswa_nis },
      kelas: { id: r.kelas_id, nama: r.kelas_nama },
      jenisPembayaran: { id: r.jenis_pembayaran_id, nama: r.jenis_nama, tipe: r.jenis_tipe },
    }));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getTagihanBySiswa(siswa_id: number, tahun_ajaran_id?: number) {
    const conditions: any[] = [eq(schema.tagihanSiswa.siswa_id, siswa_id)];
    if (tahun_ajaran_id) {
      conditions.push(eq(schema.tagihanSiswa.tahun_ajaran_id, tahun_ajaran_id));
    }

    const rows = await this.db
      .select({
        id: schema.tagihanSiswa.id,
        siswa_id: schema.tagihanSiswa.siswa_id,
        kelas_id: schema.tagihanSiswa.kelas_id,
        jenis_pembayaran_id: schema.tagihanSiswa.jenis_pembayaran_id,
        tahun_ajaran_id: schema.tagihanSiswa.tahun_ajaran_id,
        bulan: schema.tagihanSiswa.bulan,
        nominal: schema.tagihanSiswa.nominal,
        terbayar: schema.tagihanSiswa.terbayar,
        sisa: schema.tagihanSiswa.sisa,
        status: schema.tagihanSiswa.status,
        jatuh_tempo: schema.tagihanSiswa.jatuh_tempo,
        jenis_nama: schema.jenisPembayaran.nama,
        jenis_tipe: schema.jenisPembayaran.tipe,
      })
      .from(schema.tagihanSiswa)
      .innerJoin(schema.jenisPembayaran, eq(schema.tagihanSiswa.jenis_pembayaran_id, schema.jenisPembayaran.id))
      .where(and(...conditions))
      .orderBy(asc(schema.tagihanSiswa.id));

    return rows.map((r) => ({
      ...r,
      nominal: Number(r.nominal),
      terbayar: Number(r.terbayar),
      sisa: Number(r.sisa),
      jenisPembayaran: { id: r.jenis_pembayaran_id, nama: r.jenis_nama, tipe: r.jenis_tipe },
    }));
  }

  async getTagihanById(id: number) {
    const [row] = await this.db
      .select({
        id: schema.tagihanSiswa.id,
        siswa_id: schema.tagihanSiswa.siswa_id,
        kelas_id: schema.tagihanSiswa.kelas_id,
        jenis_pembayaran_id: schema.tagihanSiswa.jenis_pembayaran_id,
        tahun_ajaran_id: schema.tagihanSiswa.tahun_ajaran_id,
        bulan: schema.tagihanSiswa.bulan,
        nominal: schema.tagihanSiswa.nominal,
        terbayar: schema.tagihanSiswa.terbayar,
        sisa: schema.tagihanSiswa.sisa,
        status: schema.tagihanSiswa.status,
        jatuh_tempo: schema.tagihanSiswa.jatuh_tempo,
        siswa_nama: schema.siswa.nama,
        siswa_nis: schema.siswa.nis,
        kelas_nama: schema.kelas.nama,
        jenis_nama: schema.jenisPembayaran.nama,
        jenis_tipe: schema.jenisPembayaran.tipe,
      })
      .from(schema.tagihanSiswa)
      .innerJoin(schema.siswa, eq(schema.tagihanSiswa.siswa_id, schema.siswa.id))
      .innerJoin(schema.kelas, eq(schema.tagihanSiswa.kelas_id, schema.kelas.id))
      .innerJoin(schema.jenisPembayaran, eq(schema.tagihanSiswa.jenis_pembayaran_id, schema.jenisPembayaran.id))
      .where(eq(schema.tagihanSiswa.id, id))
      .limit(1);

    if (!row) return null;

    const txRows = await this.db
      .select()
      .from(schema.transaksiPembayaran)
      .where(eq(schema.transaksiPembayaran.tagihan_id, id))
      .orderBy(desc(schema.transaksiPembayaran.id));

    return {
      ...row,
      nominal: Number(row.nominal),
      terbayar: Number(row.terbayar),
      sisa: Number(row.sisa),
      siswa: { id: row.siswa_id, nama: row.siswa_nama, nis: row.siswa_nis },
      kelas: { id: row.kelas_id, nama: row.kelas_nama },
      jenisPembayaran: { id: row.jenis_pembayaran_id, nama: row.jenis_nama, tipe: row.jenis_tipe },
      transaksiList: txRows.map((t) => ({ ...t, jumlah_bayar: Number(t.jumlah_bayar) })),
    };
  }

  // ==========================================
  // 16. KEUANGAN - TRANSAKSI PEMBAYARAN & KWITANSI
  // ==========================================
  async createTransaksiPembayaran(data: {
    tagihan_id: number;
    siswa_id: number;
    jumlah_bayar: number;
    metode: 'Tunai' | 'Transfer';
    tanggal_bayar: string;
    catatan?: string | null;
    user_id: number;
  }) {
    const tagihan = await this.getTagihanById(data.tagihan_id);
    if (!tagihan) throw new Error('Tagihan tidak ditemukan.');

    const jumlah = Number(data.jumlah_bayar);
    if (jumlah <= 0) throw new Error('Jumlah pembayaran harus lebih dari 0.');
    if (jumlah > tagihan.sisa) {
      throw new Error(`Jumlah pembayaran (Rp ${jumlah}) melebihi sisa tagihan (Rp ${tagihan.sisa}).`);
    }

    const now = new Date();
    const prefix = `KWT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [lastTx] = await this.db
      .select({ nomor: schema.transaksiPembayaran.nomor_transaksi })
      .from(schema.transaksiPembayaran)
      .where(ilike(schema.transaksiPembayaran.nomor_transaksi, `${prefix}%`))
      .orderBy(desc(schema.transaksiPembayaran.id))
      .limit(1);

    let nextNum = 1;
    if (lastTx && lastTx.nomor) {
      const parts = lastTx.nomor.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    const nomorTransaksi = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    const [tx] = await this.db
      .insert(schema.transaksiPembayaran)
      .values({
        nomor_transaksi: nomorTransaksi,
        tagihan_id: data.tagihan_id,
        siswa_id: data.siswa_id,
        jumlah_bayar: String(jumlah),
        metode: data.metode || 'Tunai',
        tanggal_bayar: data.tanggal_bayar,
        catatan: data.catatan || null,
        created_by_user_id: data.user_id,
        status: 'valid',
        created_at: now,
        updated_at: now,
      })
      .returning();

    const newTerbayar = tagihan.terbayar + jumlah;
    const newSisa = Math.max(0, tagihan.nominal - newTerbayar);
    const newStatus = newSisa <= 0 ? 'lunas' : 'sebagian';

    await this.db
      .update(schema.tagihanSiswa)
      .set({
        terbayar: String(newTerbayar),
        sisa: String(newSisa),
        status: newStatus,
        updated_at: now,
      })
      .where(eq(schema.tagihanSiswa.id, data.tagihan_id));

    return {
      transaksi: { ...tx, jumlah_bayar: Number(tx.jumlah_bayar) },
      tagihan: { ...tagihan, terbayar: newTerbayar, sisa: newSisa, status: newStatus },
    };
  }

  async cancelTransaksiPembayaran(
    id: number,
    data: { alasan_batal: string; user_id: number }
  ) {
    const [tx] = await this.db
      .select()
      .from(schema.transaksiPembayaran)
      .where(eq(schema.transaksiPembayaran.id, id))
      .limit(1);

    if (!tx) throw new Error('Transaksi pembayaran tidak ditemukan.');
    if (tx.status === 'dibatalkan') throw new Error('Transaksi ini sudah dibatalkan sebelumnya.');

    const tagihan = await this.getTagihanById(tx.tagihan_id);
    if (!tagihan) throw new Error('Tagihan terkait transaksi ini tidak ditemukan.');

    const now = new Date();
    const [updatedTx] = await this.db
      .update(schema.transaksiPembayaran)
      .set({
        status: 'dibatalkan',
        alasan_batal: data.alasan_batal,
        cancelled_at: now,
        cancelled_by_user_id: data.user_id,
        updated_at: now,
      })
      .where(eq(schema.transaksiPembayaran.id, id))
      .returning();

    const jumlah = Number(tx.jumlah_bayar);
    const newTerbayar = Math.max(0, tagihan.terbayar - jumlah);
    const newSisa = tagihan.nominal - newTerbayar;
    const newStatus = newTerbayar <= 0 ? 'belum_bayar' : 'sebagian';

    await this.db
      .update(schema.tagihanSiswa)
      .set({
        terbayar: String(newTerbayar),
        sisa: String(newSisa),
        status: newStatus,
        updated_at: now,
      })
      .where(eq(schema.tagihanSiswa.id, tx.tagihan_id));

    return {
      transaksi: { ...updatedTx, jumlah_bayar: Number(updatedTx.jumlah_bayar) },
      tagihan: { ...tagihan, terbayar: newTerbayar, sisa: newSisa, status: newStatus },
    };
  }

  async getTransaksiList(params: {
    search?: string;
    status?: string;
    tanggal_mulai?: string;
    tanggal_selesai?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.status && params.status !== 'semua') {
      conditions.push(eq(schema.transaksiPembayaran.status, params.status));
    }
    if (params.tanggal_mulai) {
      conditions.push(sql`${schema.transaksiPembayaran.tanggal_bayar} >= ${params.tanggal_mulai}`);
    }
    if (params.tanggal_selesai) {
      conditions.push(sql`${schema.transaksiPembayaran.tanggal_bayar} <= ${params.tanggal_selesai}`);
    }
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(schema.transaksiPembayaran.nomor_transaksi, q),
          ilike(schema.siswa.nama, q),
          ilike(schema.siswa.nis, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.transaksiPembayaran)
      .innerJoin(schema.siswa, eq(schema.transaksiPembayaran.siswa_id, schema.siswa.id))
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const rows = await this.db
      .select({
        id: schema.transaksiPembayaran.id,
        nomor_transaksi: schema.transaksiPembayaran.nomor_transaksi,
        tagihan_id: schema.transaksiPembayaran.tagihan_id,
        siswa_id: schema.transaksiPembayaran.siswa_id,
        jumlah_bayar: schema.transaksiPembayaran.jumlah_bayar,
        metode: schema.transaksiPembayaran.metode,
        tanggal_bayar: schema.transaksiPembayaran.tanggal_bayar,
        catatan: schema.transaksiPembayaran.catatan,
        status: schema.transaksiPembayaran.status,
        alasan_batal: schema.transaksiPembayaran.alasan_batal,
        cancelled_at: schema.transaksiPembayaran.cancelled_at,
        created_at: schema.transaksiPembayaran.created_at,
        siswa_nama: schema.siswa.nama,
        siswa_nis: schema.siswa.nis,
        kelas_nama: schema.kelas.nama,
        jenis_nama: schema.jenisPembayaran.nama,
        bulan: schema.tagihanSiswa.bulan,
        kasir_nama: schema.users.nama_lengkap,
      })
      .from(schema.transaksiPembayaran)
      .innerJoin(schema.siswa, eq(schema.transaksiPembayaran.siswa_id, schema.siswa.id))
      .innerJoin(schema.tagihanSiswa, eq(schema.transaksiPembayaran.tagihan_id, schema.tagihanSiswa.id))
      .innerJoin(schema.kelas, eq(schema.tagihanSiswa.kelas_id, schema.kelas.id))
      .innerJoin(schema.jenisPembayaran, eq(schema.tagihanSiswa.jenis_pembayaran_id, schema.jenisPembayaran.id))
      .leftJoin(schema.users, eq(schema.transaksiPembayaran.created_by_user_id, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.transaksiPembayaran.id))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      ...r,
      jumlah_bayar: Number(r.jumlah_bayar),
      siswa: { id: r.siswa_id, nama: r.siswa_nama, nis: r.siswa_nis },
      kelas: { nama: r.kelas_nama },
      tagihan: { jenis_nama: r.jenis_nama, bulan: r.bulan },
      kasir: { nama: r.kasir_nama },
    }));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getTransaksiById(id: number) {
    const [row] = await this.db
      .select({
        id: schema.transaksiPembayaran.id,
        nomor_transaksi: schema.transaksiPembayaran.nomor_transaksi,
        tagihan_id: schema.transaksiPembayaran.tagihan_id,
        siswa_id: schema.transaksiPembayaran.siswa_id,
        jumlah_bayar: schema.transaksiPembayaran.jumlah_bayar,
        metode: schema.transaksiPembayaran.metode,
        tanggal_bayar: schema.transaksiPembayaran.tanggal_bayar,
        catatan: schema.transaksiPembayaran.catatan,
        status: schema.transaksiPembayaran.status,
        alasan_batal: schema.transaksiPembayaran.alasan_batal,
        cancelled_at: schema.transaksiPembayaran.cancelled_at,
        created_at: schema.transaksiPembayaran.created_at,
        siswa_nama: schema.siswa.nama,
        siswa_nis: schema.siswa.nis,
        kelas_nama: schema.kelas.nama,
        jenis_nama: schema.jenisPembayaran.nama,
        bulan: schema.tagihanSiswa.bulan,
        nominal_tagihan: schema.tagihanSiswa.nominal,
        kasir_nama: schema.users.nama_lengkap,
      })
      .from(schema.transaksiPembayaran)
      .innerJoin(schema.siswa, eq(schema.transaksiPembayaran.siswa_id, schema.siswa.id))
      .innerJoin(schema.tagihanSiswa, eq(schema.transaksiPembayaran.tagihan_id, schema.tagihanSiswa.id))
      .innerJoin(schema.kelas, eq(schema.tagihanSiswa.kelas_id, schema.kelas.id))
      .innerJoin(schema.jenisPembayaran, eq(schema.tagihanSiswa.jenis_pembayaran_id, schema.jenisPembayaran.id))
      .leftJoin(schema.users, eq(schema.transaksiPembayaran.created_by_user_id, schema.users.id))
      .where(eq(schema.transaksiPembayaran.id, id))
      .limit(1);

    if (!row) return null;

    return {
      ...row,
      jumlah_bayar: Number(row.jumlah_bayar),
      nominal_tagihan: Number(row.nominal_tagihan),
      siswa: { id: row.siswa_id, nama: row.siswa_nama, nis: row.siswa_nis },
      kelas: { nama: row.kelas_nama },
      tagihan: { jenis_nama: row.jenis_nama, bulan: row.bulan },
      kasir: { nama: row.kasir_nama },
    };
  }

  async getKwitansiData(id: number) {
    const tx = await this.getTransaksiById(id);
    if (!tx) return null;
    const madrasah = await this.getMadrasahProfile();
    return {
      transaksi: tx,
      madrasah,
    };
  }

  async getTunggakanList(params: {
    tahun_ajaran_id?: number;
    kelas_id?: number;
    jenis_pembayaran_id?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [sql`${schema.tagihanSiswa.status} != 'lunas'`];
    if (params.tahun_ajaran_id) {
      conditions.push(eq(schema.tagihanSiswa.tahun_ajaran_id, params.tahun_ajaran_id));
    }
    if (params.kelas_id) {
      conditions.push(eq(schema.tagihanSiswa.kelas_id, params.kelas_id));
    }
    if (params.jenis_pembayaran_id) {
      conditions.push(eq(schema.tagihanSiswa.jenis_pembayaran_id, params.jenis_pembayaran_id));
    }

    const whereClause = and(...conditions);

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.tagihanSiswa)
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const rows = await this.db
      .select({
        id: schema.tagihanSiswa.id,
        siswa_id: schema.tagihanSiswa.siswa_id,
        kelas_id: schema.tagihanSiswa.kelas_id,
        bulan: schema.tagihanSiswa.bulan,
        nominal: schema.tagihanSiswa.nominal,
        terbayar: schema.tagihanSiswa.terbayar,
        sisa: schema.tagihanSiswa.sisa,
        status: schema.tagihanSiswa.status,
        jatuh_tempo: schema.tagihanSiswa.jatuh_tempo,
        siswa_nama: schema.siswa.nama,
        siswa_nis: schema.siswa.nis,
        kelas_nama: schema.kelas.nama,
        jenis_nama: schema.jenisPembayaran.nama,
      })
      .from(schema.tagihanSiswa)
      .innerJoin(schema.siswa, eq(schema.tagihanSiswa.siswa_id, schema.siswa.id))
      .innerJoin(schema.kelas, eq(schema.tagihanSiswa.kelas_id, schema.kelas.id))
      .innerJoin(schema.jenisPembayaran, eq(schema.tagihanSiswa.jenis_pembayaran_id, schema.jenisPembayaran.id))
      .where(whereClause)
      .orderBy(desc(schema.tagihanSiswa.sisa))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      ...r,
      nominal: Number(r.nominal),
      terbayar: Number(r.terbayar),
      sisa: Number(r.sisa),
      siswa: { id: r.siswa_id, nama: r.siswa_nama, nis: r.siswa_nis },
      kelas: { id: r.kelas_id, nama: r.kelas_nama },
      jenisPembayaran: { nama: r.jenis_nama },
    }));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getTunggakanSummaryByKelas(tahun_ajaran_id?: number) {
    const conditions: any[] = [sql`${schema.tagihanSiswa.status} != 'lunas'`];
    if (tahun_ajaran_id) {
      conditions.push(eq(schema.tagihanSiswa.tahun_ajaran_id, tahun_ajaran_id));
    }

    const rows = await this.db
      .select({
        kelas_id: schema.tagihanSiswa.kelas_id,
        kelas_nama: schema.kelas.nama,
        total_tunggakan: sql<string>`SUM(${schema.tagihanSiswa.sisa})`,
        jumlah_tagihan: count(),
      })
      .from(schema.tagihanSiswa)
      .innerJoin(schema.kelas, eq(schema.tagihanSiswa.kelas_id, schema.kelas.id))
      .where(and(...conditions))
      .groupBy(schema.tagihanSiswa.kelas_id, schema.kelas.nama)
      .orderBy(asc(schema.kelas.nama));

    return rows.map((r) => ({
      kelas_id: r.kelas_id,
      kelas_nama: r.kelas_nama,
      total_tunggakan: Number(r.total_tunggakan || 0),
      jumlah_tagihan: Number(r.jumlah_tagihan || 0),
    }));
  }

  async getDashboardKeuanganStats(tahun_ajaran_id?: number) {
    const conditions: any[] = [];
    if (tahun_ajaran_id) {
      conditions.push(eq(schema.tagihanSiswa.tahun_ajaran_id, tahun_ajaran_id));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [tagihanSum] = await this.db
      .select({
        totalNominal: sql<string>`COALESCE(SUM(${schema.tagihanSiswa.nominal}), '0')`,
        totalTerbayar: sql<string>`COALESCE(SUM(${schema.tagihanSiswa.terbayar}), '0')`,
        totalSisa: sql<string>`COALESCE(SUM(${schema.tagihanSiswa.sisa}), '0')`,
      })
      .from(schema.tagihanSiswa)
      .where(whereClause);

    const today = new Date().toISOString().slice(0, 10);
    const [todayTx] = await this.db
      .select({
        totalHariIni: sql<string>`COALESCE(SUM(${schema.transaksiPembayaran.jumlah_bayar}), '0')`,
        countHariIni: count(),
      })
      .from(schema.transaksiPembayaran)
      .where(
        and(
          eq(schema.transaksiPembayaran.status, 'valid'),
          eq(schema.transaksiPembayaran.tanggal_bayar, today)
        )
      );

    return {
      totalTagihan: Number(tagihanSum?.totalNominal || 0),
      totalPenerimaan: Number(tagihanSum?.totalTerbayar || 0),
      totalTunggakan: Number(tagihanSum?.totalSisa || 0),
      penerimaanHariIni: Number(todayTx?.totalHariIni || 0),
      transaksiHariIni: Number(todayTx?.countHariIni || 0),
    };
  }

  // ==========================================
  // 17. PPDB (PENERIMAAN PESERTA DIDIK BARU)
  // ==========================================
  async createPPDB(data: any) {
    const ta = await this.getActiveTahunAjaran();
    const tahunAjaranId = data.tahun_ajaran_id || (ta ? ta.id : 1);

    const now = new Date();
    const prefix = `PPDB-${now.getFullYear()}`;
    const [lastItem] = await this.db
      .select({ nomor: schema.ppdbPendaftar.nomor_pendaftaran })
      .from(schema.ppdbPendaftar)
      .where(ilike(schema.ppdbPendaftar.nomor_pendaftaran, `${prefix}%`))
      .orderBy(desc(schema.ppdbPendaftar.id))
      .limit(1);

    let nextNum = 1;
    if (lastItem && lastItem.nomor) {
      const parts = lastItem.nomor.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) nextNum = lastSeq + 1;
    }
    const nomorPendaftaran = `${prefix}-${String(nextNum).padStart(4, '0')}`;

    const [created] = await this.db
      .insert(schema.ppdbPendaftar)
      .values({
        ...data,
        nomor_pendaftaran: nomorPendaftaran,
        tahun_ajaran_id: tahunAjaranId,
        status: 'menunggu_verifikasi',
        is_converted: false,
        created_at: now,
        updated_at: now,
      })
      .returning();

    return created;
  }

  async getPPDBByNomor(nomor: string) {
    const [item] = await this.db
      .select()
      .from(schema.ppdbPendaftar)
      .where(eq(schema.ppdbPendaftar.nomor_pendaftaran, nomor))
      .limit(1);
    return item || null;
  }

  async getPPDBList(params: {
    status?: string;
    jalur?: string;
    search?: string;
    tahun_ajaran_id?: number;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.status && params.status !== 'semua') {
      conditions.push(eq(schema.ppdbPendaftar.status, params.status));
    }
    if (params.jalur && params.jalur !== 'semua') {
      conditions.push(eq(schema.ppdbPendaftar.jalur_pendaftaran, params.jalur));
    }
    if (params.tahun_ajaran_id) {
      conditions.push(eq(schema.ppdbPendaftar.tahun_ajaran_id, params.tahun_ajaran_id));
    }
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(schema.ppdbPendaftar.nama_lengkap, q),
          ilike(schema.ppdbPendaftar.nomor_pendaftaran, q),
          ilike(schema.ppdbPendaftar.nisn, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.ppdbPendaftar)
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const items = await this.db
      .select()
      .from(schema.ppdbPendaftar)
      .where(whereClause)
      .orderBy(desc(schema.ppdbPendaftar.id))
      .limit(limit)
      .offset(offset);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPPDBById(id: number) {
    const [row] = await this.db
      .select({
        id: schema.ppdbPendaftar.id,
        nomor_pendaftaran: schema.ppdbPendaftar.nomor_pendaftaran,
        tahun_ajaran_id: schema.ppdbPendaftar.tahun_ajaran_id,
        jalur_pendaftaran: schema.ppdbPendaftar.jalur_pendaftaran,
        nama_lengkap: schema.ppdbPendaftar.nama_lengkap,
        nisn: schema.ppdbPendaftar.nisn,
        nik: schema.ppdbPendaftar.nik,
        jenis_kelamin: schema.ppdbPendaftar.jenis_kelamin,
        tempat_lahir: schema.ppdbPendaftar.tempat_lahir,
        tanggal_lahir: schema.ppdbPendaftar.tanggal_lahir,
        sekolah_asal: schema.ppdbPendaftar.sekolah_asal,
        nama_ayah: schema.ppdbPendaftar.nama_ayah,
        nama_ibu: schema.ppdbPendaftar.nama_ibu,
        telepon_ortu: schema.ppdbPendaftar.telepon_ortu,
        email_ortu: schema.ppdbPendaftar.email_ortu,
        alamat: schema.ppdbPendaftar.alamat,
        berkas_foto_url: schema.ppdbPendaftar.berkas_foto_url,
        berkas_ijazah_url: schema.ppdbPendaftar.berkas_ijazah_url,
        berkas_akta_url: schema.ppdbPendaftar.berkas_akta_url,
        berkas_kk_url: schema.ppdbPendaftar.berkas_kk_url,
        status: schema.ppdbPendaftar.status,
        catatan_verifikasi: schema.ppdbPendaftar.catatan_verifikasi,
        verified_by_user_id: schema.ppdbPendaftar.verified_by_user_id,
        verified_at: schema.ppdbPendaftar.verified_at,
        is_converted: schema.ppdbPendaftar.is_converted,
        converted_siswa_id: schema.ppdbPendaftar.converted_siswa_id,
        created_at: schema.ppdbPendaftar.created_at,
        verifier_nama: schema.users.nama_lengkap,
      })
      .from(schema.ppdbPendaftar)
      .leftJoin(schema.users, eq(schema.ppdbPendaftar.verified_by_user_id, schema.users.id))
      .where(eq(schema.ppdbPendaftar.id, id))
      .limit(1);

    if (!row) return null;

    return {
      ...row,
      verifiedBy: row.verified_by_user_id ? { id: row.verified_by_user_id, nama: row.verifier_nama } : null,
    };
  }

  async verifikasiPPDB(
    id: number,
    data: { status: string; catatan_verifikasi?: string; user_id: number }
  ) {
    const [updated] = await this.db
      .update(schema.ppdbPendaftar)
      .set({
        status: data.status,
        catatan_verifikasi: data.catatan_verifikasi || null,
        verified_by_user_id: data.user_id,
        verified_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(schema.ppdbPendaftar.id, id))
      .returning();
    return updated || null;
  }

  async konversiPPDBSiswa(
    id: number,
    data: { kelas_id: number; nis?: string; nisn?: string; tahun_ajaran_id: number }
  ) {
    const pendaftar = await this.getPPDBById(id);
    if (!pendaftar) throw new Error('Data pendaftar PPDB tidak ditemukan.');
    if (pendaftar.is_converted) throw new Error('Pendaftar ini sudah pernah dikonversi menjadi siswa.');

    const now = new Date();
    const nis = data.nis || `S-${now.getFullYear()}${String(pendaftar.id).padStart(4, '0')}`;
    const nisn = data.nisn || pendaftar.nisn || `00${now.getFullYear()}${String(pendaftar.id).padStart(4, '0')}`;

    const [siswaCreated] = await this.db
      .insert(schema.siswa)
      .values({
        nis,
        nisn,
        nama: pendaftar.nama_lengkap,
        jenis_kelamin: pendaftar.jenis_kelamin as any,
        tempat_lahir: pendaftar.tempat_lahir,
        tanggal_lahir: pendaftar.tanggal_lahir,
        kelas_id: data.kelas_id,
        tahun_ajaran_masuk_id: data.tahun_ajaran_id,
        nama_ayah: pendaftar.nama_ayah,
        nama_ibu: pendaftar.nama_ibu,
        telepon_ortu: pendaftar.telepon_ortu,
        alamat: pendaftar.alamat,
        status: 'aktif',
        foto_url: pendaftar.berkas_foto_url,
        created_at: now,
        updated_at: now,
      })
      .returning();

    await this.db.insert(schema.penempatanSiswa).values({
      siswa_id: siswaCreated.id,
      kelas_id: data.kelas_id,
      tahun_ajaran_id: data.tahun_ajaran_id,
      status: 'aktif',
      created_at: now,
      updated_at: now,
    });

    await this.db
      .update(schema.ppdbPendaftar)
      .set({
        is_converted: true,
        converted_siswa_id: siswaCreated.id,
        updated_at: now,
      })
      .where(eq(schema.ppdbPendaftar.id, id));

    return siswaCreated;
  }

  async getPPDBStats(tahun_ajaran_id?: number) {
    const conditions: any[] = [];
    if (tahun_ajaran_id) {
      conditions.push(eq(schema.ppdbPendaftar.tahun_ajaran_id, tahun_ajaran_id));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await this.db.select().from(schema.ppdbPendaftar).where(whereClause);

    return {
      total: list.length,
      menunggu: list.filter((p) => p.status === 'menunggu_verifikasi').length,
      terverifikasi: list.filter((p) => p.status === 'terverifikasi').length,
      diterima: list.filter((p) => p.status === 'diterima').length,
      ditolak: list.filter((p) => p.status === 'ditolak').length,
      cadangan: list.filter((p) => p.status === 'cadangan').length,
      dikonversi: list.filter((p) => p.is_converted).length,
      jalur: {
        Reguler: list.filter((p) => p.jalur_pendaftaran === 'Reguler').length,
        Prestasi: list.filter((p) => p.jalur_pendaftaran === 'Prestasi').length,
        Afirmasi: list.filter((p) => p.jalur_pendaftaran === 'Afirmasi').length,
        Tahfidz: list.filter((p) => p.jalur_pendaftaran === 'Tahfidz').length,
      },
    };
  }

  // ==========================================
  // 18. INFORMASI - PENGUMUMAN
  // ==========================================
  async getPengumumanList(params: {
    kategori?: string;
    target_audiens?: string;
    published_only?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (params.kategori && params.kategori !== 'Semua') {
      conditions.push(eq(schema.pengumuman.kategori, params.kategori));
    }
    if (params.target_audiens && params.target_audiens !== 'Semua') {
      conditions.push(eq(schema.pengumuman.target_audiens, params.target_audiens));
    }
    if (params.published_only) {
      conditions.push(eq(schema.pengumuman.is_published, true));
    }
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(or(ilike(schema.pengumuman.judul, q), ilike(schema.pengumuman.konten, q)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRes] = await this.db
      .select({ val: count() })
      .from(schema.pengumuman)
      .where(whereClause);

    const total = Number(totalRes?.val || 0);

    const rows = await this.db
      .select({
        id: schema.pengumuman.id,
        judul: schema.pengumuman.judul,
        konten: schema.pengumuman.konten,
        kategori: schema.pengumuman.kategori,
        target_audiens: schema.pengumuman.target_audiens,
        is_pinned: schema.pengumuman.is_pinned,
        is_published: schema.pengumuman.is_published,
        created_by_user_id: schema.pengumuman.created_by_user_id,
        created_at: schema.pengumuman.created_at,
        updated_at: schema.pengumuman.updated_at,
        author_nama: schema.users.nama_lengkap,
      })
      .from(schema.pengumuman)
      .leftJoin(schema.users, eq(schema.pengumuman.created_by_user_id, schema.users.id))
      .where(whereClause)
      .orderBy(desc(schema.pengumuman.is_pinned), desc(schema.pengumuman.created_at))
      .limit(limit)
      .offset(offset);

    const items = rows.map((r) => ({
      ...r,
      author: r.created_by_user_id ? { id: r.created_by_user_id, nama_lengkap: r.author_nama } : null,
    }));

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPengumumanById(id: number) {
    const [row] = await this.db
      .select({
        id: schema.pengumuman.id,
        judul: schema.pengumuman.judul,
        konten: schema.pengumuman.konten,
        kategori: schema.pengumuman.kategori,
        target_audiens: schema.pengumuman.target_audiens,
        is_pinned: schema.pengumuman.is_pinned,
        is_published: schema.pengumuman.is_published,
        created_by_user_id: schema.pengumuman.created_by_user_id,
        created_at: schema.pengumuman.created_at,
        updated_at: schema.pengumuman.updated_at,
        author_nama: schema.users.nama_lengkap,
      })
      .from(schema.pengumuman)
      .leftJoin(schema.users, eq(schema.pengumuman.created_by_user_id, schema.users.id))
      .where(eq(schema.pengumuman.id, id))
      .limit(1);

    if (!row) return null;

    return {
      ...row,
      author: row.created_by_user_id ? { id: row.created_by_user_id, nama_lengkap: row.author_nama } : null,
    };
  }

  async createPengumuman(data: any) {
    const [created] = await this.db
      .insert(schema.pengumuman)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async updatePengumuman(id: number, data: any) {
    const [updated] = await this.db
      .update(schema.pengumuman)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.pengumuman.id, id))
      .returning();
    return updated || null;
  }

  async deletePengumuman(id: number) {
    const [deleted] = await this.db
      .delete(schema.pengumuman)
      .where(eq(schema.pengumuman.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 19. INFORMASI - KALENDER AKADEMIK
  // ==========================================
  async getKalenderList(params: {
    tahun_ajaran_id?: number;
    bulan?: string;
    search?: string;
  }) {
    const conditions: any[] = [];
    if (params.tahun_ajaran_id) {
      conditions.push(eq(schema.kalenderAkademik.tahun_ajaran_id, params.tahun_ajaran_id));
    }
    if (params.bulan) {
      conditions.push(sql`${schema.kalenderAkademik.tanggal_mulai} LIKE ${`${params.bulan}%`}`);
    }
    if (params.search) {
      const q = `%${params.search}%`;
      conditions.push(
        or(
          ilike(schema.kalenderAkademik.judul_kegiatan, q),
          ilike(schema.kalenderAkademik.deskripsi, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return await this.db
      .select()
      .from(schema.kalenderAkademik)
      .where(whereClause)
      .orderBy(asc(schema.kalenderAkademik.tanggal_mulai));
  }

  async getKalenderById(id: number) {
    const [item] = await this.db
      .select()
      .from(schema.kalenderAkademik)
      .where(eq(schema.kalenderAkademik.id, id))
      .limit(1);
    return item || null;
  }

  async createKalender(data: any) {
    const [created] = await this.db
      .insert(schema.kalenderAkademik)
      .values({
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();
    return created;
  }

  async updateKalender(id: number, data: any) {
    const [updated] = await this.db
      .update(schema.kalenderAkademik)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(eq(schema.kalenderAkademik.id, id))
      .returning();
    return updated || null;
  }

  async deleteKalender(id: number) {
    const [deleted] = await this.db
      .delete(schema.kalenderAkademik)
      .where(eq(schema.kalenderAkademik.id, id))
      .returning();
    return !!deleted;
  }

  // ==========================================
  // 20. DASHBOARD STATISTIK
  // ==========================================
  async getDashboardStats(guru_id?: number | null) {
    // 1. Siswa counts
    const [totalSiswaRes] = await this.db.select({ val: count() }).from(schema.siswa);
    const [siswaAktifRes] = await this.db
      .select({ val: count() })
      .from(schema.siswa)
      .where(eq(schema.siswa.status, 'aktif'));
    const [siswaLulusRes] = await this.db
      .select({ val: count() })
      .from(schema.siswa)
      .where(eq(schema.siswa.status, 'lulus'));
    const [siswaPindahRes] = await this.db
      .select({ val: count() })
      .from(schema.siswa)
      .where(eq(schema.siswa.status, 'pindah'));
    const [siswaLRes] = await this.db
      .select({ val: count() })
      .from(schema.siswa)
      .where(and(eq(schema.siswa.status, 'aktif'), eq(schema.siswa.jenis_kelamin, 'L')));
    const [siswaPRes] = await this.db
      .select({ val: count() })
      .from(schema.siswa)
      .where(and(eq(schema.siswa.status, 'aktif'), eq(schema.siswa.jenis_kelamin, 'P')));

    // 2. Guru counts
    const [totalGuruRes] = await this.db.select({ val: count() }).from(schema.guru);
    const [guruAktifRes] = await this.db
      .select({ val: count() })
      .from(schema.guru)
      .where(eq(schema.guru.is_active, true));
    const [guruPnsRes] = await this.db
      .select({ val: count() })
      .from(schema.guru)
      .where(eq(schema.guru.status_kepegawaian, 'PNS'));

    // 3. Kelas & Mapel
    const [totalKelasRes] = await this.db.select({ val: count() }).from(schema.kelas);
    const [totalMapelRes] = await this.db.select({ val: count() }).from(schema.mapel);

    const taAktif = await this.getActiveTahunAjaran();

    // 4. Guru Stats (jika login sebagai guru)
    let guruStats = null;
    if (guru_id && taAktif) {
      const scope = await this.getGuruAccessScope(guru_id, taAktif.id);
      const [jadwalCountRes] = await this.db
        .select({ val: count() })
        .from(schema.jadwalPelajaran)
        .where(
          and(
            eq(schema.jadwalPelajaran.guru_id, guru_id),
            eq(schema.jadwalPelajaran.tahun_ajaran_id, taAktif.id)
          )
        );

      let waliKelasNama = '';
      if (scope.waliKelasIds.length > 0) {
        const waliKelasRows = await this.db
          .select({ nama: schema.kelas.nama })
          .from(schema.kelas)
          .where(inArray(schema.kelas.id, scope.waliKelasIds));
        waliKelasNama = waliKelasRows.map((k) => k.nama).join(', ');
      }

      guruStats = {
        totalKelasAjar: scope.allowedKelasIds.length,
        isWaliKelas: scope.waliKelasIds.length > 0,
        waliKelasNama,
        totalJadwalMengajar: Number(jadwalCountRes?.val || 0),
      };
    }

    // 5. Siswa per Kelas
    const allKelas = await this.db
      .select({
        id: schema.kelas.id,
        nama: schema.kelas.nama,
        tingkat: schema.kelas.tingkat,
        kapasitas: schema.kelas.kapasitas,
        wali_kelas_id: schema.kelas.wali_kelas_id,
        wali_nama: schema.guru.nama,
      })
      .from(schema.kelas)
      .leftJoin(schema.guru, eq(schema.kelas.wali_kelas_id, schema.guru.id))
      .orderBy(asc(schema.kelas.tingkat), asc(schema.kelas.nama));

    const siswaPerKelas = await Promise.all(
      allKelas.map(async (k) => {
        const [c] = await this.db
          .select({ val: count() })
          .from(schema.siswa)
          .where(and(eq(schema.siswa.kelas_id, k.id), eq(schema.siswa.status, 'aktif')));

        return {
          kelas_id: k.id,
          nama: k.nama,
          tingkat: k.tingkat,
          wali_kelas: k.wali_nama || 'Belum ditentukan',
          kapasitas: k.kapasitas,
          jumlahSiswa: Number(c?.val || 0),
        };
      })
    );

    // 6. Ringkasan PPDB
    const ppdbSummary = await this.getPPDBStats(taAktif?.id);

    // 7. Pengumuman Terkini
    const pengumumanRows = await this.db
      .select({
        id: schema.pengumuman.id,
        judul: schema.pengumuman.judul,
        kategori: schema.pengumuman.kategori,
        target_audiens: schema.pengumuman.target_audiens,
        is_pinned: schema.pengumuman.is_pinned,
        created_at: schema.pengumuman.created_at,
        created_by_user_id: schema.pengumuman.created_by_user_id,
        author_nama: schema.users.nama_lengkap,
      })
      .from(schema.pengumuman)
      .leftJoin(schema.users, eq(schema.pengumuman.created_by_user_id, schema.users.id))
      .where(eq(schema.pengumuman.is_published, true))
      .orderBy(desc(schema.pengumuman.is_pinned), desc(schema.pengumuman.created_at))
      .limit(3);

    const recentAnnouncements = pengumumanRows.map((p) => ({
      ...p,
      author: p.created_by_user_id ? { id: p.created_by_user_id, nama_lengkap: p.author_nama } : null,
    }));

    // 8. Agenda Kalender Terdekat
    const upcomingEvents = await this.db
      .select()
      .from(schema.kalenderAkademik)
      .orderBy(asc(schema.kalenderAkademik.tanggal_mulai))
      .limit(4);

    // 9. Recent audit logs
    const recentLogs = await this.db
      .select()
      .from(schema.auditLog)
      .orderBy(desc(schema.auditLog.created_at))
      .limit(5);

    // 10. Agregasi kehadiran bulanan
    const bulanLabels = [
      { key: '07', label: 'Juli' },
      { key: '08', label: 'Agustus' },
      { key: '09', label: 'September' },
      { key: '10', label: 'Oktober' },
      { key: '11', label: 'November' },
      { key: '12', label: 'Desember' },
    ];

    const kehadiranBulanan = await Promise.all(
      bulanLabels.map(async (b) => {
        const [hadirRes] = await this.db
          .select({ val: count() })
          .from(schema.absensiSiswa)
          .where(
            and(
              eq(schema.absensiSiswa.status, 'H'),
              sql`TO_CHAR(${schema.absensiSiswa.tanggal}, 'MM') = ${b.key}`
            )
          );
        const [izinRes] = await this.db
          .select({ val: count() })
          .from(schema.absensiSiswa)
          .where(
            and(
              eq(schema.absensiSiswa.status, 'I'),
              sql`TO_CHAR(${schema.absensiSiswa.tanggal}, 'MM') = ${b.key}`
            )
          );
        const [sakitRes] = await this.db
          .select({ val: count() })
          .from(schema.absensiSiswa)
          .where(
            and(
              eq(schema.absensiSiswa.status, 'S'),
              sql`TO_CHAR(${schema.absensiSiswa.tanggal}, 'MM') = ${b.key}`
            )
          );
        const [alpaRes] = await this.db
          .select({ val: count() })
          .from(schema.absensiSiswa)
          .where(
            and(
              eq(schema.absensiSiswa.status, 'A'),
              sql`TO_CHAR(${schema.absensiSiswa.tanggal}, 'MM') = ${b.key}`
            )
          );

        const hadir = Number(hadirRes?.val || 0);
        const izin = Number(izinRes?.val || 0);
        const sakit = Number(sakitRes?.val || 0);
        const alpa = Number(alpaRes?.val || 0);
        const total = hadir + izin + sakit + alpa;

        return {
          bulan: b.label,
          hadir,
          izin,
          sakit,
          alpa,
          persentaseHadir: total > 0 ? Math.round((hadir / total) * 100) : 100,
        };
      })
    );

    const totalSiswa = Number(totalSiswaRes?.val || 0);
    const siswaAktif = Number(siswaAktifRes?.val || 0);
    const siswaLulus = Number(siswaLulusRes?.val || 0);
    const siswaPindah = Number(siswaPindahRes?.val || 0);
    const totalGuru = Number(totalGuruRes?.val || 0);
    const guruAktif = Number(guruAktifRes?.val || 0);
    const guruPNS = Number(guruPnsRes?.val || 0);

    return {
      counts: {
        siswa: totalSiswa,
        siswaLaki: Number(siswaLRes?.val || 0),
        siswaPerempuan: Number(siswaPRes?.val || 0),
        guru: totalGuru,
        kelas: Number(totalKelasRes?.val || 0),
        mapel: Number(totalMapelRes?.val || 0),
        alumni: siswaLulus,
        mutasi: siswaPindah,
      },
      totalSiswa,
      siswaAktif,
      siswaLulus,
      siswaPindah,
      totalGuru,
      guruAktif,
      guruPNS,
      guruNonPNS: totalGuru - guruPNS,
      totalKelas: Number(totalKelasRes?.val || 0),
      totalMapel: Number(totalMapelRes?.val || 0),
      tahunAjaranAktif: taAktif,
      guruStats,
      kehadiranBulanan,
      siswaPerKelas,
      ppdbSummary,
      recentAnnouncements,
      upcomingEvents,
      recentLogs,
    };
  }
}

/**
 * Factory helper: Buat DbStore per request dari URL database Neon.
 * Mengembalikan null jika DATABASE_URL tidak ditemukan.
 */
export function getStore(databaseUrl?: string): DbStore | null {
  const db = getDb(databaseUrl);
  if (!db) return null;
  return new DbStore(db);
}
