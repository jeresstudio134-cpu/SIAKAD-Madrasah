CREATE TABLE "kalender_akademik" (
	"id" serial PRIMARY KEY NOT NULL,
	"tahun_ajaran_id" integer NOT NULL,
	"judul_kegiatan" varchar(255) NOT NULL,
	"deskripsi" text,
	"tanggal_mulai" varchar(20) NOT NULL,
	"tanggal_selesai" varchar(20) NOT NULL,
	"tipe_kegiatan" varchar(50) DEFAULT 'KBM' NOT NULL,
	"warna" varchar(30) DEFAULT 'emerald' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pengumuman" (
	"id" serial PRIMARY KEY NOT NULL,
	"judul" varchar(255) NOT NULL,
	"konten" text NOT NULL,
	"kategori" varchar(50) DEFAULT 'Umum' NOT NULL,
	"target_audiens" varchar(50) DEFAULT 'Semua' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ppdb_pendaftar" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor_pendaftaran" varchar(50) NOT NULL,
	"tahun_ajaran_id" integer NOT NULL,
	"jalur_pendaftaran" varchar(50) DEFAULT 'Reguler' NOT NULL,
	"nama_lengkap" varchar(150) NOT NULL,
	"nisn" varchar(20),
	"nik" varchar(20),
	"jenis_kelamin" varchar(1) NOT NULL,
	"tempat_lahir" varchar(100),
	"tanggal_lahir" varchar(20),
	"sekolah_asal" varchar(150),
	"nama_ayah" varchar(150),
	"nama_ibu" varchar(150),
	"telepon_ortu" varchar(30),
	"email_ortu" varchar(150),
	"alamat" text,
	"berkas_foto_url" text,
	"berkas_ijazah_url" text,
	"berkas_akta_url" text,
	"berkas_kk_url" text,
	"status" varchar(30) DEFAULT 'menunggu_verifikasi' NOT NULL,
	"catatan_verifikasi" text,
	"verified_by_user_id" integer,
	"verified_at" timestamp,
	"is_converted" boolean DEFAULT false NOT NULL,
	"converted_siswa_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ppdb_pendaftar_nomor_pendaftaran_unique" UNIQUE("nomor_pendaftaran")
);
--> statement-breakpoint
ALTER TABLE "kalender_akademik" ADD CONSTRAINT "kalender_akademik_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pengumuman" ADD CONSTRAINT "pengumuman_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_pendaftar" ADD CONSTRAINT "ppdb_pendaftar_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_pendaftar" ADD CONSTRAINT "ppdb_pendaftar_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppdb_pendaftar" ADD CONSTRAINT "ppdb_pendaftar_converted_siswa_id_siswa_id_fk" FOREIGN KEY ("converted_siswa_id") REFERENCES "public"."siswa"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kalender_ta_idx" ON "kalender_akademik" USING btree ("tahun_ajaran_id");--> statement-breakpoint
CREATE INDEX "kalender_tgl_idx" ON "kalender_akademik" USING btree ("tanggal_mulai");--> statement-breakpoint
CREATE INDEX "pengumuman_pinned_idx" ON "pengumuman" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX "pengumuman_target_idx" ON "pengumuman" USING btree ("target_audiens");--> statement-breakpoint
CREATE INDEX "ppdb_ta_idx" ON "ppdb_pendaftar" USING btree ("tahun_ajaran_id");--> statement-breakpoint
CREATE INDEX "ppdb_status_idx" ON "ppdb_pendaftar" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ppdb_nomor_idx" ON "ppdb_pendaftar" USING btree ("nomor_pendaftaran");