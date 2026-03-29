/**
 * Nano Banana Pro 2 — Image generation via Gemini API.
 * Uses Gemini's image generation capabilities through @google/generative-ai SDK.
 *
 * Internal name: Nano Banana Pro 2
 * User-facing name: "Visual Engine" (never expose model names)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_KEY = process.env.GOOGLE_KEY;

export interface ImageGenResult {
  image_base64: string;
  mime_type: string;
  prompt_used: string;
  model: string;
}

/**
 * Generate an image using Gemini's image generation model.
 * Falls back to Gemini Flash for image-capable generation.
 */
export async function generateImage(
  prompt: string,
  options: {
    style?: 'photorealistic' | 'illustration' | 'flat' | 'isometric';
    aspect?: '1:1' | '16:9' | '9:16' | '4:3';
  } = {},
): Promise<ImageGenResult> {
  if (!GOOGLE_KEY) throw new Error('GOOGLE_KEY not configured');

  const genAI = new GoogleGenerativeAI(GOOGLE_KEY);

  // Use gemini-2.0-flash-exp for image generation capabilities
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    generationConfig: {
      // @ts-expect-error — responseModalities is valid for image gen
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const stylePrefix = options.style
    ? `Generate a ${options.style} style image. `
    : '';
  const aspectSuffix = options.aspect
    ? ` Aspect ratio: ${options.aspect}.`
    : '';

  const fullPrompt = `${stylePrefix}${prompt}${aspectSuffix}`;

  const result = await model.generateContent(fullPrompt);
  const response = result.response;

  // Extract image parts from the response
  const parts = response.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    if (part.inlineData) {
      return {
        image_base64: part.inlineData.data || '',
        mime_type: part.inlineData.mimeType || 'image/png',
        prompt_used: fullPrompt,
        model: 'gemini-2.0-flash-exp',
      };
    }
  }

  throw new Error('No image generated. The model returned text only.');
}

/**
 * Generate a branded aiPLUG card image.
 * Used when a new plug is deployed to create its visual identity.
 */
export async function generatePlugCard(
  plugName: string,
  plugType: string,
  description: string,
): Promise<ImageGenResult> {
  const prompt = `Create a clean, modern product card for a deployed AI service called "${plugName}".
Type: ${plugType}. Description: ${description}.
Style: Dark background (#191919), glass card effect, subtle grid pattern,
neon accent glow matching the service type (green for active, blue for data, amber for creative).
Include a plug/connector icon. Professional SaaS aesthetic. No text besides the name.`;

  return generateImage(prompt, { style: 'illustration', aspect: '4:3' });
}
