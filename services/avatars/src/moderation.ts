import { ImageAnnotatorClient } from '@google-cloud/vision';

const vision = new ImageAnnotatorClient();

export interface ModerationResult {
  approved: boolean;
  reason: string;
  confidence: number;
  categories: string[];
}

// Vertex AI SafeSearch returns: VERY_UNLIKELY | UNLIKELY | POSSIBLE | LIKELY | VERY_LIKELY
const LIKELIHOOD_SCORE: Record<string, number> = {
  UNKNOWN: 0,
  VERY_UNLIKELY: 0.05,
  UNLIKELY: 0.20,
  POSSIBLE: 0.50,
  LIKELY: 0.80,
  VERY_LIKELY: 0.95,
};

export async function moderateImage(buffer: Buffer): Promise<ModerationResult> {
  try {
    const [result] = await vision.safeSearchDetection({
      image: { content: buffer },
    });
    const safe = result.safeSearchAnnotation;
    if (!safe) {
      return { approved: true, reason: 'no annotation', confidence: 0, categories: [] };
    }

    const adult = LIKELIHOOD_SCORE[String(safe.adult)] ?? 0;
    const violence = LIKELIHOOD_SCORE[String(safe.violence)] ?? 0;
    const racy = LIKELIHOOD_SCORE[String(safe.racy)] ?? 0;
    const max = Math.max(adult, violence, racy);

    const categories: string[] = [];
    if (adult >= 0.5) categories.push(`adult:${safe.adult}`);
    if (violence >= 0.5) categories.push(`violence:${safe.violence}`);
    if (racy >= 0.5) categories.push(`racy:${safe.racy}`);

    const approved = max < 0.80;
    return {
      approved,
      reason: approved
        ? 'Image passed content safety checks'
        : 'Please upload a professional photo suitable for a business profile',
      confidence: max,
      categories,
    };
  } catch (err) {
    console.error('[avatars] moderation failed — auto-approving', err);
    return {
      approved: true,
      reason: 'auto-approved (moderation unavailable)',
      confidence: 0,
      categories: ['auto-approved'],
    };
  }
}
