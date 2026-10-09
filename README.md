# SIAKAD MADRASAH (Sistem Informasi Akademik Madrasah) - Data Master & Modul Akademik

Aplikasi **SIAKAD MADRASAH** berbahasa Indonesia berbasis Web modern untuk pengelolaan data induk kesiswaan, kepegawaian pendidik, rombongan belajar, kurikulum mapel khas madrasah (PAI Kemenag), manajemen hak akses staf, serta **MODUL AKADEMIK TERPADU**.

---

## 🌟 Modul & Fitur Utama

### 1. Fondasi & Data Master
- **Tahun Ajaran & Semester**: Status satu tahun ajaran aktif, tanggal mulai & selesai.
- **Rombel / Kelas**: Tingkat 7, 8, 9, kapasitas, dan penetapan wali kelas pendidik.
- **Mata Pelajaran Khas Madrasah**: Kelompok PAI (Al-Qur'an Hadis, Akidah Akhlak, Fikih, SKI, Bahasa Arab) & Kelompok Umum dengan KKM dan JP.
- **Guru & Pegawai**: NIP, NUPTK, data kepegawaian, jabatan, dan foto profil.
- **Data Siswa**: NIS, NISN, data orang tua/wali, alamat, foto, filter status (aktif, lulus, mutasi), ekspor & impor massal Excel (.xlsx).
- **Profil Madrasah**: Nama madrasah, NSM, NPSN, logo, alamat, dan data Kepala Madrasah untuk kop surat.
- **Autentikasi & Hak Akses**: Role Admin, Staf (TU, Keuangan, Akademik), dan Guru Pendidik. Dilengkapi proteksi rate limit, audit log, dan barrier wajib ganti password pertama kali.

### 2. Modul Akademik
- **Penempatan Siswa, Kenaikan Kelas & Kelulusan**:
  - Penempatan siswa ke kelas per tahun ajaran.
  - Kenaikan kelas massal berjenjang (naik / tinggal kelas).
  - Penetapan kelulusan massal untuk siswa tingkat akhir.
- **Penugasan Guru & Wali Kelas**:
  - Penugasan pendidik mengampu mata pelajaran di rombel tertentu dengan beban JP.
  - Penetapan resmi wali kelas per rombel.
- **Jadwal Pelajaran Mingguan**:
  - Tampilan matriks tabel jadwal mingguan (Senin - Sabtu, Jam Ke-1 s.d. Ke-6).
  - **Deteksi Bentrok Otomatis**: Mencegah guru mengajar di dua kelas berbeda pada waktu yang sama, serta mencegah kelas memiliki dua mapel berbeda pada jam yang sama.
- **Absensi Harian Siswa**:
  - Input kehadiran cepat per kelas (Hadir, Izin, Sakit, Alpa).
  - Tombol aksi cepat "Hadirkan Semua".
  - Rekapitulasi absensi bulanan dan semester untuk penilaian rapor.
- **Penilaian Siswa & Pembobotan Otomatis**:
  - Konfigurasi persentase bobot nilai fleksibel (Tugas, UH, UTS, UAS, Keterampilan) = 100%.
  - Perhitungan nilai akhir dan predikat huruf (A, B, C, D) otomatis real-time berdasarkan KKM.
- **Penilaian Sikap & Catatan Tahfidz Al-Qur'an**:
  - Rekap sikap spiritual & sosial (Sangat Baik, Baik, Cukup, Perlu Bimbingan).
  - Catatan capaian juz hafalan (Tahfidz), surah/ayat terakhir, dan predikat tahfidz (Mutqin, Jayyid Jiddan, Jayyid, Maqbul).
  - Catatan motivasi wali kelas dan rekomendasi kenaikan kelas.
- **Cetak Rapor & Transkrip (PDF)**:
  - Format cetak resmi berstandar Kemenag dengan Kop Madrasah, NSM, NPSN, dan logo.
  - Tabel nilai PAI dan Umum, catatan sikap, capaian tahfidz, rekap absensi, dan lembar pengesahan tanda tangan Orang Tua, Wali Kelas, serta Kepala Madrasah.
- **Restriksi Akses Guru & Wali Kelas**:
  - Guru/wali kelas hanya memiliki akses melihat dan menginput nilai/absensi pada rombel dan mata pelajaran yang diampunya.

### 3. Modul Keuangan (Baru)
- **Jenis & Pos Pembayaran**:
  - Konfigurasi pos keuangan madrasah (SPP Bulanan, Uang Gedung/Infaq Pembangunan, Seragam & Kitab, Kegiatan, dll).
  - Tarif fleksibel per jenjang (Tingkat 7, Tingkat 8, Tingkat 9) atau per rombel/kelas.
- **Generate Tagihan Massal**:
  - Penerbitan tagihan serentak per bulan (SPP) atau per semester/bebas untuk seluruh siswa aktif per jenjang/kelas.
  - Pencegahan duplikasi otomatis untuk siswa yang sudah memiliki tagihan aktif.
- **Pencatatan Pembayaran & Cicilan**:
  - Input transaksi kasir cepat (Tunai / Transfer Bank).
  - Mendukung pembayaran bertahap (cicilan/angsuran) dengan pembaruan otomatis status tagihan (*Belum Bayar*, *Sebagian*, *Lunas*).
- **Kwitansi Resmi Otomatis (Cetak / PDF)**:
  - Penomoran urut kwitansi resmi otomatis (`KWT-YYYYMM-XXXX`).
  - Dilengkapi Kop Madrasah, rincian pembayaran, nominal dan teks Terbilang Rupiah otomatis, serta lembar tanda tangan bendahara.
- **Daftar & Rekapitulasi Tunggakan**:
  - Rekapitulasi tunggakan per rombel/kelas (total tagihan, total terbayar, sisa tunggakan, dan persentase pelunasan).
  - Rincian siswa menunggak per pos pembayaran serta fitur cetak rekap / surat tagihan wali santri.
- **Laporan Keuangan & Ekspor Excel (.xlsx)**:
  - Laporan transaksi harian & bulanan dengan filter rentang tanggal, status transaksi, metode pembayaran, dan pos tagihan.
  - Ekspor langsung ke file spreadsheet Excel (`.xlsx`) siap olah.
- **Dashboard Keuangan Terpadu**:
  - Monitoring kas real-time: pemasukan bulan ini, pemasukan hari ini, total tunggakan, progress pelunasan tahun ajaran, dan riwayat transaksi terbaru.
- **Integritas Audit & Pembatalan Transaksi (Void)**:
  - Hak akses eksklusif hanya untuk Administrator dan Staf Keuangan (guru dan staf umum dibatasi).
  - Transaksi pembayaran **tidak dapat dihapus**, hanya dapat **dibatalkan (void)** dengan alasan pembatalan wajib yang tercatat transparan di Audit Log.

### 4. PPDB Online (Penerimaan Peserta Didik Baru)
- **Formulir Pendaftaran Publik (Tanpa Perlu Login)**:
  - Akses publik langsung di rute `/ppdb` dengan tata letak responsif dan elegan.
  - Pilihan jalur seleksi pendaftaran: **Reguler**, **Prestasi**, **Tahfidz**, dan **Afirmasi**.
  - Form multi-bagian: identitas calon santri, NISN, NIK, asal sekolah, kontak dan identitas orang tua/wali.
  - Penomoran pendaftaran otomatis unik (`PPDB-YYYY-XXXX`).
- **Unggah Berkas Persyaratan ke Cloudinary**:
  - Pas foto calon santri, scan ijazah/SKL, scan akta kelahiran, dan scan Kartu Keluarga (KK).
  - Terintegrasi dengan endpoint `/api/ppdb/upload` (Cloudinary signed upload) dengan fallback base64 aman.
- **Cek Status Pendaftaran Mandiri**:
  - Calon wali murid dapat mengecek status seleksi langsung di halaman publik hanya dengan memasukkan Nomor Pendaftaran atau NISN.
  - Tanda bukti penerimaan pendaftaran dengan tombol cetak bukti formulir.
- **Panel Pengelolaan & Verifikasi Staf TU / Admin (`/ppdb/admin`)**:
  - Filter pendaftar berdasarkan status seleksi, jalur pendaftaran, tahun ajaran, dan kata kunci pencarian.
  - Modal verifikasi berkas: ubah status menjadi **Menunggu Verifikasi**, **Terverifikasi**, **Diterima**, **Cadangan**, atau **Ditolak** dilengkapi catatan verifikasi staf.
- **Konversi 1-Klik Calon Santri Menjadi Siswa Aktif**:
  - Calon santri yang berstatus **Diterima** dapat dikonversi langsung menjadi siswa aktif madrasah.
  - Pemilihan rombel/kelas tujuan dan pembuatan nomor induk siswa (NIS) otomatis.
  - Otomatis membuat riwayat penempatan siswa di kelas yang dipilih dan mengunci status konversi agar tidak duplikat.

### 5. Pengumuman Madrasah & Kalender Akademik
- **Sistem Pengumuman Terpadu (`/pengumuman`)**:
  - Filter kategori: *Penting*, *Akademik*, *Keuangan*, *Kesiswaan*, *Umum*.
  - Target audiens fleksibel: *Semua*, *Guru*, *Siswa*, *Staf*.
  - Status Sematan (*Pinned*) untuk maklumat darurat madrasah di posisi paling atas.
  - Hak kelola penuh (buat, ubah, hapus) bagi Administrator dan staf yang berwenang.
- **Kalender Akademik Madrasah Interaktif (`/kalender`)**:
  - Agenda kegiatan madrasah per semester dan tahun ajaran aktif.
  - Klasifikasi warna dan kategori: *KBM*, *Libur Nasional*, *Ujian*, *Rapat*, *Ekstrakurikuler*.
  - Tampilan visual kartu agenda lengkap dengan sisa hari countdown dan rentang tanggal.

### 6. Dashboard Admin & Statistik Terpadu yang Diperkaya
- **Grafik Kehadiran Santri Bulanan**:
  - Rekapitulasi agregasi tingkat kehadiran per bulan semester ganjil (Juli s.d. Desember).
  - Visualisasi progress bar proporsional untuk Hadir, Izin, Sakit, Alpa, dan persentase kehadiran santri.
- **Distribusi Siswa per Rombel/Kelas**:
  - Pemantauan kapasitas rombel (jumlah siswa aktif vs kapasitas kelas) serta wali kelas penanggung jawab.
- **Widget Ringkasan PPDB Interaktif**:
  - Progress bar capaian target kuota penerimaan santri baru.
  - Indikator ringkasan status pendaftaran: Menunggu Verifikasi, Terverifikasi, Diterima, Sudah Konversi, dan Ditolak dengan tautan cepat ke portal kelola dan portal publik.
- **Panel Pengumuman & Agenda Kalender Terdekat**:
  - Memastikan staf dan pendidik selalu mendapatkan informasi operasional terhangat saat login.

---

## 🛠️ Tech Stack (Cloudflare Workers Architecture)

- **Frontend**: React 19 + Vite, TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form + Zod
- **Backend / Edge**: Cloudflare Workers + Hono (TypeScript), REST API dengan prefix `/api`
- **ORM & Database**: Drizzle ORM + `@neondatabase/serverless` (`drizzle-orm/neon-http` untuk query cepat & WebSocket Pool on-demand untuk transaksi)
- **Ekspor Dokumen**: SheetJS (`xlsx`) client-side & server ArrayBuffer, Native CSS Paged Media untuk cetak Rapor & Kwitansi PDF
- **Media & Berkas**: Cloudinary Signed Upload via Web Crypto SHA-1 (`/api/upload/sign`), unggah langsung dari browser tanpa Node SDK
- **Autentikasi & Keamanan**: JWT HttpOnly Cookie (`hono/jwt` + `hono/cookie`), `bcryptjs`, `hono/secure-headers`
- **Penyebaran (Deploy)**: Cloudflare Workers (Static Assets `dist/` + Edge Worker `worker/index.ts` dalam satu domain, bebas CORS, dikonfigurasi via `wrangler.jsonc`)

---

## 🔑 Kredensial Akun Contoh (Default Seed)

| Role | Username | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Akses penuh master, akademik, keuangan, PPDB, dan staf *(Wajib ganti password saat login pertama)* |
| **Staf Keuangan** | `bendahara` | `staf123` | Hj. Maryam Fauziah, S.E. (Akses kasir, tagihan massal, kwitansi resmi, dan laporan keuangan) |
| **Staf TU** | `stafftu` | `staf123` | Nurul Hidayati, S.AP (Operasional kesiswaan, rombel, PPDB admisi & verifikasi) |
| **Guru & Wali Kelas** | `guruzul` | `guru123` | Ust. Muhammad Zulkarnain (Guru Fikih & Wali Kelas 7-A) |
| **Guru Pendidik** | `gurusiti` | `guru123` | Hj. Siti Fatimah (Guru Matematika & Wali Kelas 7-B) |

---

## 🗄️ Langkah Pembuatan Database Neon PostgreSQL

1. Buka [https://neon.tech](https://neon.tech) dan masuk atau buat akun baru.
2. Buat Project baru, contoh: `siakad-madrasah`.
3. Pilih Region terdekat (misalnya `ap-southeast-1` Singapura).
4. Di bagian **Connection Details**, pilih opsi **Drizzle** atau **Node.js (psql)** dan salin Connection String:
   ```text
   postgresql://neondb_owner:password@ep-sample-1234.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
5. Simpan connection string tersebut ke variabel `DATABASE_URL` di file `.dev.vars` (untuk Wrangler) atau `.env`.

---

## ⚙️ Variabel Lingkungan Lokal (.dev.vars)

Salin `.dev.vars.example` menjadi `.dev.vars` untuk development lokal Cloudflare Workers:

```bash
cp .dev.vars.example .dev.vars
```

Isi variabel:
```env
# 1. DATABASE NEON POSTGRESQL
DATABASE_URL="postgresql://neondb_owner:your_password@ep-sample.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

# 2. AUTENTIKASI JWT (Minimal 32 Karakter)
JWT_SECRET="siakad_madrasah_super_secret_jwt_key_2025_change_in_production"

# 3. CLOUDINARY (FOTO GURU, SISWA, LOGO)
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

# 4. ENVIRONMENT
NODE_ENV="development"
```

---

## 🚀 Menjalankan di Komputer Lokal (Local Setup)

1. **Pasang Dependensi**:
   ```bash
   npm install
   ```

2. **Generate Migrasi Drizzle**:
   ```bash
   npm run db:generate
   ```

3. **Jalankan Migrasi Database ke Neon**:
   ```bash
   npm run db:migrate
   ```

4. **Jalankan Seeding Data Awal**:
   ```bash
   npm run db:seed
   ```

5. **Jalankan Server Development**:
   - Menjalankan lingkungan Vite + Hono Worker (Port 3000):
     ```bash
     npm run dev
     ```
   - Atau menjalankan langsung via Cloudflare Wrangler Dev:
     ```bash
     npm run worker:dev
     ```
   Aplikasi akan berjalan di `http://localhost:3000` (atau port default Wrangler).

---

## ☁️ Panduan Deploy ke Cloudflare Workers

Aplikasi ini menggunakan **Cloudflare Workers with Static Assets** yang didefinisikan di `wrangler.jsonc` (`worker/index.ts` sebagai backend dan `dist/` sebagai frontend):

### 1. Login ke Akun Cloudflare
```bash
npx wrangler login
```

### 2. Mengisi Secret di Cloudflare Workers
Masukkan kredensial sensitif secara aman ke Cloudflare (atau melalui menu **Settings > Variables and Secrets** di Cloudflare Dashboard):
```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put JWT_SECRET
npx wrangler secret put CLOUDINARY_CLOUD_NAME
npx wrangler secret put CLOUDINARY_API_KEY
npx wrangler secret put CLOUDINARY_API_SECRET
```

### 3. Deploy Langsung via CLI
Cukup jalankan satu perintah:
```bash
npm run deploy
```
*(Perintah ini akan otomatis menjalankan `vite build` untuk menghasilkan folder `dist/` kemudian menjalankan `wrangler deploy`)*.

### 4. Menghubungkan Repositori GitHub ke Cloudflare Workers (CI/CD)
1. Buka **Cloudflare Dashboard** → **Compute (Workers & Pages)** → **Create** → **Workers**.
2. Pilih opsi **Connect to Git** dan pilih repositori GitHub SIAKAD Anda.
3. Atur konfigurasi build:
   - **Framework preset**: `Vite` (atau `None`)
   - **Build command**: `npm run build`
   - **Deploy command**: `npx wrangler deploy`
   - **Root directory**: `/`
4. Di bagian **Variables and Secrets**, tambahkan seluruh environment variables yang ada di `.dev.vars.example`.
5. Klik **Save and Deploy**. Setiap `git push origin main` akan otomatis mem-build frontend dan mendeploy Worker dalam satu domain tanpa CORS!

### 5. Cara Menjalankan Migrasi Drizzle Bila Skema Berubah
Jika terdapat penambahan tabel atau kolom baru di `db/schema.ts`:
1. Buat file migrasi SQL baru:
   ```bash
   npm run db:generate
   ```
2. Jalankan migrasi ke database Neon aktif:
   ```bash
   npm run db:migrate
   ```
Database Neon akan terupdate secara instan tanpa perlu downtime.

---

## 🛡️ Fitur Keamanan & Validasi Edge

- **Single Domain (Zero CORS)**: Worker dan Asset berjalan dalam domain yang sama (`siakad.yourdomain.workers.dev`), menghindari isu preflight CORS browser.
- **Cookie HttpOnly + Secure**: Token sesi disimpan dalam cookie `HttpOnly`, `Secure`, dan `SameSite=Lax`.
- **Zod Validation di Edge**: Seluruh payload request create/update divalidasi ketat di sisi Worker sebelum query dijalankan.
- **Cloudinary Signed Upload via Web Crypto**: Pembuatan SHA-1 signature berjalan cepat di Edge Workers menggunakan SubtleCrypto native tanpa ketergantungan library Node.
- **Audit Logging**: Setiap aksi penting (`CREATE`, `UPDATE`, `DELETE`, `IMPORT`, `EXPORT`, `LOGIN`) tercatat secara transparan dengan IP pengguna (`CF-Connecting-IP`) dan waktu kejadian.
