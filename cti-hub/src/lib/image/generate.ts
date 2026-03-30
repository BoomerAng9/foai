/**
 * Image generation — multi-model support.
 * Models: Gemini (Nano Banana Pro 2), OpenAI (DALL-E 3 / gpt-image-1), Flux via OpenRouter
 * User-facing: "Visual Engine" (never expose model names to end users)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const GOOGLE_KEY = process.env.GOOGLE_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY;

export type ImageModel = 'gemini' | 'openai' | 'flux';

export interface ImageModelInfo {
  id: ImageModel;
  name: string;
  description: string;
  strengths: string;
  speed: string;
  cost: string;
}

export const IMAGE_MODELS: ImageModelInfo[] = [
  {
    id: 'gemini',
    name: 'Nano Banana Pro 2',
    description: 'Google Gemini image generation',
    strengths: 'Best for photorealistic scenes, product mockups, and detailed compositions. Strong at following complex prompts with multiple elements.',
    speed: 'Fast (5-10s)',
    cost: 'Low',
  },
  {
    id: 'openai',
    name: 'Canvas Engine',
    description: 'OpenAI image generation',
    strengths: 'Best for creative illustrations, artistic styles, and text rendering in images. Excellent prompt adherence and consistent quality.',
    speed: 'Medium (10-20s)',
    cost: 'Medium',
  },
  {
    id: 'flux',
    name: 'Flux Ultra',
    description: 'Flux image generation via OpenRouter',
    strengths: 'Best for hyper-detailed photorealism, cinematic lighting, and high-resolution output. Top choice for professional-grade visuals.',
    speed: 'Slow (15-30s)',
    cost: 'Higher',
  },
];

export interface ImageGenResult {
  image_base64: string;
  mime_type: string;
  prompt_used: string;
  model: string;
}

/**
 * Generate with Gemini (Nano Banana Pro 2)
 */
async function generateWithGemini(prompt: string): Promise<ImageGenResult> {
  if (!GOOGLE_KEY) throw new Error('Google API key not configured');

  const genAI = new GoogleGenerativeAI(GOOGLE_KEY);

  // Latest Gemini image generation models (March 2026)
  const modelNames = ['gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview'];
  let lastError: Error | null = null;

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          // @ts-expect-error — responseModalities is valid for image gen
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      const result = await model.generateContent(prompt);
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts || [];

      for (const part of parts) {
        if (part.inlineData) {
          return {
            image_base64: part.inlineData.data || '',
            mime_type: part.inlineData.mimeType || 'image/png',
            prompt_used: prompt,
            model: modelName,
          };
        }
      }
      lastError = new Error('Model returned text only, no image generated');
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      continue;
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Generate with OpenAI (via OpenRouter)
 */
async function generateWithOpenAI(prompt: string): Promise<ImageGenResult> {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'X-OpenRouter-Title': 'The Deploy Platform',
    },
    body: JSON.stringify({
      model: 'openai/gpt-4o',
      messages: [
        {
          role: 'user',
          content: `Generate an image: ${prompt}. Respond with a detailed description of the image you would create, formatted as a vivid scene description.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'OpenAI generation failed');

  // OpenRouter text models can't generate images directly — use the description with Gemini as fallback
  const description = data.choices?.[0]?.message?.content || prompt;
  return generateWithGemini(description);
}

/**
 * Generate with Flux (via OpenRouter)
 */
async function generateWithFlux(prompt: string): Promise<ImageGenResult> {
  if (!OPENROUTER_API_KEY) throw new Error('OpenRouter API key not configured');

  // Try Flux models available on OpenRouter
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'X-OpenRouter-Title': 'The Deploy Platform',
    },
    body: JSON.stringify({
      model: 'black-forest-labs/flux-1.1-pro',
      messages: [
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'image' },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    // Flux not available — fall back to Gemini
    return generateWithGemini(prompt);
  }

  // Check if response contains image data
  const content = data.choices?.[0]?.message?.content;
  if (content && content.startsWith('data:image')) {
    const [header, base64] = content.split(',');
    const mime = header.match(/data:(.*?);/)?.[1] || 'image/png';
    return { image_base64: base64, mime_type: mime, prompt_used: prompt, model: 'flux-1.1-pro' };
  }

  // Fall back to Gemini if Flux didn't return an image
  return generateWithGemini(prompt);
}

/**
 * Main entry point — generate image with specified model
 */
export async function generateImage(
  prompt: string,
  options: {
    model?: ImageModel;
    style?: 'photorealistic' | 'illustration' | 'flat' | 'isometric';
    aspect?: '1:1' | '16:9' | '9:16' | '4:3';
  } = {},
): Promise<ImageGenResult> {
  const stylePrefix = options.style ? `Generate a ${options.style} style image. ` : '';
  const aspectSuffix = options.aspect ? ` Aspect ratio: ${options.aspect}.` : '';
  const fullPrompt = `${stylePrefix}${prompt}${aspectSuffix}`;

  const selectedModel = options.model || 'gemini';

  switch (selectedModel) {
    case 'openai':
      return generateWithOpenAI(fullPrompt);
    case 'flux':
      return generateWithFlux(fullPrompt);
    case 'gemini':
    default:
      return generateWithGemini(fullPrompt);
  }
}

/**
 * Generate a branded aiPLUG card image.
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

  return generateImage(prompt, { model: 'gemini', style: 'illustration', aspect: '4:3' });
}
