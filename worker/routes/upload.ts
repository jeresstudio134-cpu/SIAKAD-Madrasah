import { Hono } from 'hono';
import { AppContext } from '../types.ts';
import { generateCloudinarySignature, isCloudinaryConfigured } from '../cloudinary.ts';

export const uploadRouter = new Hono<AppContext>();

/**
 * Endpoint membuat signature SHA-1 untuk Cloudinary Signed Upload
 * Browser dapat memanggil endpoint ini lalu mengunggah langsung ke Cloudinary API
 */
uploadRouter.post('/sign', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const folder = body.folder || 'siakad_madrasah';

    if (!isCloudinaryConfigured(c.env)) {
      return c.json({
        success: false,
        configured: false,
        message: 'Cloudinary belum dikonfigurasi di environment Cloudflare Workers.',
      });
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = await generateCloudinarySignature(
      { folder, timestamp },
      c.env.CLOUDINARY_API_SECRET!
    );

    return c.json({
      success: true,
      configured: true,
      data: {
        signature,
        timestamp,
        apiKey: c.env.CLOUDINARY_API_KEY!,
        cloudName: c.env.CLOUDINARY_CLOUD_NAME!,
        folder,
      },
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: 'Gagal membuat signature upload.',
        error: error?.message,
      },
      500
    );
  }
});
