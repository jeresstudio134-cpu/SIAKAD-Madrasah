import { Hono } from 'hono';
import { secureHeaders } from 'hono/secure-headers';
import { AppContext } from './types.ts';
import { authRouter } from './routes/auth.ts';
import { stafRouter } from './routes/staf.ts';
import { dashboardRouter } from './routes/dashboard.ts';
import { masterRouter } from './routes/master.ts';
import { akademikRouter } from './routes/akademik.ts';
import { keuanganRouter } from './routes/keuangan.ts';
import { ppdbRouter } from './routes/ppdb.ts';
import { informasiRouter } from './routes/informasi.ts';
import { uploadRouter } from './routes/upload.ts';

export const app = new Hono<AppContext>();

// 1. Keamanan Header HTTP dengan secureHeaders bawaan Hono (menggantikan helmet)
app.use(
  '*',
  secureHeaders({
    crossOriginEmbedderPolicy: false,
  })
);

// 2. Health check endpoint
app.get('/api/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    service: 'SIAKAD Madrasah API (Cloudflare Workers & Hono)',
    timestamp: new Date().toISOString(),
  });
});

// 3. Mount API Routers (Semua menggunakan prefix /api yang sama persis seperti sebelumnya)
app.route('/api/auth', authRouter);
app.route('/api/staf', stafRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/akademik', akademikRouter);
app.route('/api/keuangan', keuanganRouter);
app.route('/api/ppdb', ppdbRouter);
app.route('/api/upload', uploadRouter);
app.route('/api', informasiRouter);
app.route('/api', masterRouter);

// 4. Handle Not Found & SPA Fallback untuk Cloudflare Workers Assets
app.notFound(async (c) => {
  // Jika request mengarah ke API tapi tidak ada rute yang cocok, kembalikan JSON 404
  if (c.req.path.startsWith('/api')) {
    return c.json(
      {
        success: false,
        message: 'Endpoint API tidak ditemukan.',
      },
      404
    );
  }

  // SPA Fallback untuk Cloudflare Workers:
  // Bila request bukan API (misal /akademik/penempatan, /keuangan, /siswa),
  // ambil index.html dari binding ASSETS supaya React Router menangani halaman sisi klien.
  if (c.env?.ASSETS) {
    try {
      const url = new URL(c.req.url);
      url.pathname = '/index.html';
      const indexReq = new Request(url.toString(), c.req.raw);
      const res = await c.env.ASSETS.fetch(indexReq);
      if (res.status === 200 || res.ok) {
        return res;
      }
    } catch (e) {
      console.error('Error fetching ASSETS fallback:', e);
    }
  }

  return c.text('Not Found', 404);
});

// 5. Global Error Handler (menggantikan Express error middleware)
app.onError((err, c) => {
  console.error('Unhandled Worker Error:', err);
  return c.json(
    {
      success: false,
      message: err.message || 'Terjadi kesalahan sistem internal.',
    },
    500
  );
});

export default app;
