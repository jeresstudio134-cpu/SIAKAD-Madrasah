CREATE TABLE "jenis_pembayaran" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(100) NOT NULL,
	"tipe" varchar(20) DEFAULT 'bulanan' NOT NULL,
	"deskripsi" text,
	"tahun_ajaran_id" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tagihan_siswa" (
	"id" serial PRIMARY KEY NOT NULL,
	"siswa_id" integer NOT NULL,
	"kelas_id" integer NOT NULL,
	"jenis_pembayaran_id" integer NOT NULL,
	"tahun_ajaran_id" integer NOT NULL,
	"bulan" varchar(20),
	"nominal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"terbayar" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sisa" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'belum_bayar' NOT NULL,
	"jatuh_tempo" date,
	"catatan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarif_pembayaran" (
	"id" serial PRIMARY KEY NOT NULL,
	"jenis_pembayaran_id" integer NOT NULL,
	"tingkat" varchar(20) DEFAULT 'Semua' NOT NULL,
	"kelas_id" integer,
	"nominal" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaksi_pembayaran" (
	"id" serial PRIMARY KEY NOT NULL,
	"nomor_transaksi" varchar(50) NOT NULL,
	"tagihan_id" integer NOT NULL,
	"siswa_id" integer NOT NULL,
	"jumlah_bayar" numeric(12, 2) NOT NULL,
	"metode" varchar(20) DEFAULT 'Tunai' NOT NULL,
	"tanggal_bayar" date NOT NULL,
	"catatan" text,
	"created_by_user_id" integer,
	"status" varchar(20) DEFAULT 'valid' NOT NULL,
	"alasan_batal" text,
	"cancelled_at" timestamp,
	"cancelled_by_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transaksi_pembayaran_nomor_transaksi_unique" UNIQUE("nomor_transaksi")
);
--> statement-breakpoint
ALTER TABLE "jenis_pembayaran" ADD CONSTRAINT "jenis_pembayaran_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_jenis_pembayaran_id_jenis_pembayaran_id_fk" FOREIGN KEY ("jenis_pembayaran_id") REFERENCES "public"."jenis_pembayaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tagihan_siswa" ADD CONSTRAINT "tagihan_siswa_tahun_ajaran_id_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "public"."tahun_ajaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif_pembayaran" ADD CONSTRAINT "tarif_pembayaran_jenis_pembayaran_id_jenis_pembayaran_id_fk" FOREIGN KEY ("jenis_pembayaran_id") REFERENCES "public"."jenis_pembayaran"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarif_pembayaran" ADD CONSTRAINT "tarif_pembayaran_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "public"."kelas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi_pembayaran" ADD CONSTRAINT "transaksi_pembayaran_tagihan_id_tagihan_siswa_id_fk" FOREIGN KEY ("tagihan_id") REFERENCES "public"."tagihan_siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi_pembayaran" ADD CONSTRAINT "transaksi_pembayaran_siswa_id_siswa_id_fk" FOREIGN KEY ("siswa_id") REFERENCES "public"."siswa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi_pembayaran" ADD CONSTRAINT "transaksi_pembayaran_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaksi_pembayaran" ADD CONSTRAINT "transaksi_pembayaran_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jenis_bayar_ta_idx" ON "jenis_pembayaran" USING btree ("tahun_ajaran_id");--> statement-breakpoint
CREATE INDEX "tagihan_siswa_idx" ON "tagihan_siswa" USING btree ("siswa_id");--> statement-breakpoint
CREATE INDEX "tagihan_kelas_idx" ON "tagihan_siswa" USING btree ("kelas_id");--> statement-breakpoint
CREATE INDEX "tagihan_jenis_idx" ON "tagihan_siswa" USING btree ("jenis_pembayaran_id");--> statement-breakpoint
CREATE INDEX "tagihan_status_idx" ON "tagihan_siswa" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tarif_jenis_idx" ON "tarif_pembayaran" USING btree ("jenis_pembayaran_id");--> statement-breakpoint
CREATE INDEX "tarif_kelas_idx" ON "tarif_pembayaran" USING btree ("kelas_id");--> statement-breakpoint
CREATE INDEX "transaksi_tagihan_idx" ON "transaksi_pembayaran" USING btree ("tagihan_id");--> statement-breakpoint
CREATE INDEX "transaksi_siswa_idx" ON "transaksi_pembayaran" USING btree ("siswa_id");--> statement-breakpoint
CREATE INDEX "transaksi_tanggal_idx" ON "transaksi_pembayaran" USING btree ("tanggal_bayar");--> statement-breakpoint
CREATE INDEX "transaksi_status_idx" ON "transaksi_pembayaran" USING btree ("status");