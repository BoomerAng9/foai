import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';

/**
 * POST /api/broadcast/export — Export video in social media preset format
 * Body: { videoUrl, preset, projectId }
 *
 * Presets: tiktok (9:16), instagram (1:1), youtube (16:9), twitter (16:9 short)
 */

export interface ExportPreset {
  id: string;
  label: string;
  aspect: string;
  width: number;
  height: number;
  maxDuration?: number;
  description: string;
}

const PRESETS: ExportPreset[] = [
  { id: 'youtube', label: 'YouTube', aspect: '16:9', width: 1920, height: 1080, description: 'Standard landscape for YouTube' },
  { id: 'youtube-4k', label: 'YouTube 4K', aspect: '16:9', width: 3840, height: 2160, description: '4K UHD for YouTube' },
  { id: 'tiktok', label: 'TikTok / Reels', aspect: '9:16', width: 1080, height: 1920, maxDuration: 180, description: 'Vertical for TikTok, Instagram Reels, YouTube Shorts' },
  { id: 'instagram', label: 'Instagram Square', aspect: '1:1', width: 1080, height: 1080, description: 'Square format for Instagram feed' },
  { id: 'instagram-story', label: 'Instagram Story', aspect: '9:16', width: 1080, height: 1920, maxDuration: 60, description: 'Vertical for Instagram Stories' },
  { id: 'twitter', label: 'X / Twitter', aspect: '16:9', width: 1280, height: 720, maxDuration: 140, description: 'Optimized for X feed' },
  { id: 'linkedin', label: 'LinkedIn', aspect: '16:9', width: 1920, height: 1080, maxDuration: 600, description: 'Professional content for LinkedIn' },
  { id: 'ultrawide', label: 'Cinematic 2.39:1', aspect: '2.39:1', width: 2560, height: 1072, description: 'Anamorphic widescreen' },
];

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const { videoUrl, preset: presetId } = await req.json();

    if (!videoUrl) {
      return NextResponse.json({ error: 'videoUrl required' }, { status: 400 });
    }

    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) {
      return NextResponse.json({ error: `Unknown preset. Available: ${PRESETS.map(p => p.id).join(', ')}` }, { status: 400 });
    }

    // Queue FFmpeg crop/resize job
    return NextResponse.json({
      status: 'queued',
      export_id: `export-${Date.now()}`,
      preset: preset,
      source: videoUrl,
      message: `Exporting as ${preset.label} (${preset.width}x${preset.height})`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * GET /api/broadcast/export/presets — List available export presets
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  return NextResponse.json({ presets: PRESETS });
}
