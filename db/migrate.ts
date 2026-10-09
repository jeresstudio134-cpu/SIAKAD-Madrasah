import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'dotenv';
dotenv.config();

async function runMigrate() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL tidak disetel di file environment (.env).');
    process.exit(1);
  }

  console.log('🚀 Menghubungkan ke database Neon...');
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log('⏳ Menjalankan migrasi Drizzle...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('✅ Migrasi database Drizzle berhasil diterapkan ke Neon PostgreSQL!');
  } catch (error) {
    console.error('❌ Gagal menjalankan migrasi:', error);
    process.exit(1);
  }
}

runMigrate();
