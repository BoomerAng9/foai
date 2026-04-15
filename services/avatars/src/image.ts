import sharp from 'sharp';

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: 'webp';
  originalSize: number;
}

const TARGET = 256;

export async function processImageBuffer(input: Buffer): Promise<ProcessedImage> {
  const out = await sharp(input)
    .resize(TARGET, TARGET, { fit: 'cover', position: 'attention' })
    .webp({ quality: 85 })
    .toBuffer();
  return {
    buffer: out,
    width: TARGET,
    height: TARGET,
    format: 'webp',
    originalSize: input.byteLength,
  };
}

export function isValidImageFile(file: { type: string; size: number }): boolean {
  const valid = ['image/jpeg', 'image/png', 'image/webp'];
  const max = 2 * 1024 * 1024;
  return valid.includes(file.type) && file.size <= max;
}

export function isOversize(size: number): boolean {
  return size > 2 * 1024 * 1024;
}

export function decodeBase64Image(base64: string): Buffer {
  const data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(data, 'base64');
}
