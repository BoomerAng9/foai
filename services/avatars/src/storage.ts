import { Storage } from '@google-cloud/storage';
import { config } from './config.js';

const storage = new Storage();
const bucket = storage.bucket(config.gcsBucket);

export function generateStorageKey(userId: string): string {
  return `${userId}/${Date.now()}.webp`;
}

export async function uploadAvatar(key: string, body: Buffer): Promise<boolean> {
  try {
    const file = bucket.file(key);
    await file.save(body, {
      contentType: 'image/webp',
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
      resumable: false, // small files; faster
    });
    return true;
  } catch (err) {
    console.error('[avatars] gcs upload failed', { key, err });
    return false;
  }
}

export function publicUrlFor(key: string): string {
  return `${config.gcsPublicUrl.replace(/\/+$/, '')}/${key}`;
}
