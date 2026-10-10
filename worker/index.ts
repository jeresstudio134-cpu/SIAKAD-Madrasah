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

// 1. Keamanan Header HTTP dengan secureHeaders bawaan Hono
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

// 3. Mount API Routers (Semua endpoint backend berprefix /api)
app.route('/api/auth', authRouter);
app.route('/api/staf', stafRouter);
app.route('/api/dashboard', dashboardRouter);
app.route('/api/akademik', akademikRouter);
app.route('/api/keuangan', keuanganRouter);
app.route('/api/ppdb', ppdbRouter);
app.route('/api/upload', uploadRouter);
app.route('/api', informasiRouter);
app.route('/api', masterRouter);

// 4. Tangani semua endpoint /api yang tidak ditemukan dengan JSON 404
app.all('/api/*', (c) => {
  return c.json(
    {
      success: false,
      message: 'Endpoint API tidak ditemukan.',
    },
    404
  );
});

// 5. Cloudflare Workers Static Assets & SPA Fallback untuk rute frontend
// Menangani F5 / refresh halaman (seperti /akademik/penempatan, /keuangan, /siswa, dll.)
app.get('*', async (c) => {
  if (c.env?.ASSETS) {
    try {
      // (a) Coba sajikan asset statis langsung (JS bundle, CSS, favicon, gambar di /dist)
      const res = await c.env.ASSETS.fetch(c.req.raw);

      if (res.status !== 404) {
        // Bungkus ulang supaya header bisa dimodifikasi secureHeaders
        return new Response(res.body, res);
      }

      // (b) SPA Fallback: rute bukan file fisik -> kirim index.html (lewat '/')
      const url = new URL(c.req.url);
      url.pathname = '/';
      url.search = '';
      const fallbackRes = await c.env.ASSETS.fetch(
        new Request(url.toString(), { method: 'GET' })
      );
      return new Response(fallbackRes.body, fallbackRes);
    } catch (err) {
      console.error('Error fetching static asset or SPA fallback:', err);
    }
  }

  return c.text('Not Found', 404);
});

// 6. Global 404 Handler untuk method selain GET atau fallback darurat
app.notFound(async (c) => {
  if (c.req.path.startsWith('/api')) {
    return c.json(
      {
        success: false,
        message: 'Endpoint API tidak ditemukan.',
      },
      404
    );
  }

  if (c.req.method === 'GET' && c.env?.ASSETS) {
    try {
      const url = new URL(c.req.url);
      url.pathname = '/';
      url.search = '';
      const res = await c.env.ASSETS.fetch(
        new Request(url.toString(), { method: 'GET' })
      );
      return new Response(res.body, res);
    } catch (err) {
      console.error('Error in notFound SPA fallback:', err);
    }
  }

  return c.text('Not Found', 404);
});

// 7. Global Error Handler
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
