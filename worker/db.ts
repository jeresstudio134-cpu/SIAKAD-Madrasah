import { neon, Pool } from '@neondatabase/serverless';
import { drizzle as drizzleHttp } from 'drizzle-orm/neon-http';
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless';
import * as schema from '../db/schema.ts';

/**
 * Koneksi HTTP Neon untuk query biasa (non-transaksional)
 * Sangat ringan dan efisien di Cloudflare Workers.
 */
export function getDb(databaseUrl?: string) {
  if (!databaseUrl) return null;
  const sql = neon(databaseUrl);
  return drizzleHttp(sql, { schema });
}

/**
 * Koneksi WebSocket Pool Neon untuk operasi yang membutuhkan transaksi (db.transaction)
 * Dibuat on-demand per request.
 */
export function getTxDb(databaseUrl?: string) {
  if (!databaseUrl) return null;
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzleWs(pool, { schema });
}
