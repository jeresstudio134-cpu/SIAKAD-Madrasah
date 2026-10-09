import { Bindings } from './types.ts';

/**
 * Menghasilkan signature SHA-1 untuk Cloudinary Signed Upload
 * Menggunakan Web Crypto API (SubtleCrypto) yang 100% native di Cloudflare Workers.
 */
export async function generateCloudinarySignature(
  params: Record<string, string | number>,
  apiSecret: string
): Promise<string> {
  const sortedKeys = Object.keys(params).sort();
  const serialized = sortedKeys.map((k) => `${k}=${params[k]}`).join('&') + apiSecret;
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function isCloudinaryConfigured(env: Bindings): boolean {
  return Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET &&
    !env.CLOUDINARY_CLOUD_NAME.includes('your_')
  );
}

export async function getSignedUploadParams(
  env: Bindings,
  folder: string = 'siakad_madrasah'
) {
  if (!isCloudinaryConfigured(env)) {
    return null;
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = await generateCloudinarySignature(
    { folder, timestamp },
    env.CLOUDINARY_API_SECRET!
  );

  return {
    signature,
    timestamp,
    apiKey: env.CLOUDINARY_API_KEY!,
    cloudName: env.CLOUDINARY_CLOUD_NAME!,
    folder,
  };
}
