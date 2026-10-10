import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../db/schema.ts';

/**
 * Helper koneksi HTTP Neon untuk Cloudflare Workers & Hono API.
 * Dibuat on-demand per request menggunakan databaseUrl (dari c.env.DATABASE_URL).
 * Tidak menggunakan process.env atau koneksi global.
 */
export function getDb(databaseUrl?: string) {
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export type DbClient = NonNullable<ReturnType<typeof getDb>>;
