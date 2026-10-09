import http from 'http';
import path from 'path';
import fs from 'fs';
import { getRequestListener } from '@hono/node-server';
import { app } from './worker/index.ts';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const honoHandler = getRequestListener(app.fetch);

  if (!isProduction) {
    // Mode Development: Mount Vite SPA Middleware bersama Hono Worker
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });

    const server = http.createServer((req, res) => {
      // Seluruh request ke /api ditangani oleh Hono Worker
      if (req.url?.startsWith('/api')) {
        honoHandler(req, res);
      } else {
        vite.middlewares(req, res);
      }
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n======================================================`);
      console.log(`🕌 SIAKAD MADRASAH (Cloudflare Workers & Hono Local Dev)`);
      console.log(`🌐 Port: ${PORT}`);
      console.log(`📁 Mode: Development (Vite + Hono Worker)`);
      console.log(`🔑 Admin Default: admin / admin123 (Wajib ganti password)`);
      console.log(`👥 Staf Default: stafftu / staf123`);
      console.log(`======================================================\n`);
    });
  } else {
    // Mode Production: Sajikan build static dist/ bersama Hono Worker
    const distPath = path.resolve(process.cwd(), 'dist');
    const server = http.createServer((req, res) => {
      if (req.url?.startsWith('/api')) {
        honoHandler(req, res);
      } else {
        const filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url || 'index.html');
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const stream = fs.createReadStream(filePath);
          stream.pipe(res);
        } else {
          const indexHtml = path.join(distPath, 'index.html');
          if (fs.existsSync(indexHtml)) {
            fs.createReadStream(indexHtml).pipe(res);
          } else {
            res.statusCode = 404;
            res.end('Not Found');
          }
        }
      }
    });

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🕌 SIAKAD MADRASAH Server berjalan di port ${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error('Gagal menjalankan server:', err);
  process.exit(1);
});
