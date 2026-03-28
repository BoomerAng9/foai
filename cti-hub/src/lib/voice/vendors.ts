export type VoiceVendorId = 'elevenlabs' | 'nvidia-personaplex' | 'grok';

export interface VoiceOption {
  id: string;
  label: string;
  description?: string;
  previewUrl?: string;
  modelIds?: string[];
  defaultModelId?: string;
}

export interface VoiceVendorConfig {
  id: VoiceVendorId;
  label: string;
  configured: boolean;
  supportsCatalog: boolean;
  voices: VoiceOption[];
  defaultVoiceId?: string;
  defaultModelId?: string;
  reason?: string;
}

export interface VoiceSynthesisResult {
  audioBase64: string;
  mimeType: string;
  vendor: VoiceVendorId;
  voiceId: string;
  modelId?: string;
}

interface ElevenLabsVoiceResponse {
  voices?: Array<{
    voice_id?: string;
    name?: string;
    category?: string;
    preview_url?: string;
    high_quality_base_model_ids?: string[];
    labels?: Record<string, string>;
  }>;
}

interface OpenAiCompatibleVendorRuntime {
  id: VoiceVendorId;
  label: string;
  endpoint?: string;
  apiKey?: string;
  defaultModelId?: string;
  defaultVoiceId?: string;
  authHeader: string;
  authScheme: string;
  mimeType: string;
}

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString('base64');
}

function getElevenLabsKey() {
  return process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY;
}

async function safeReadResponseBytes(response: Response) {
  return new Uint8Array(await response.arrayBuffer());
}

async function listElevenLabsVoices(): Promise<VoiceVendorConfig> {
  const apiKey = getElevenLabsKey();
  const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID;
  const defaultModelId = process.env.ELEVENLABS_MODEL_ID;

  if (!apiKey) {
    return {
      id: 'elevenlabs',
      label: 'ElevenLabs',
      configured: false,
      supportsCatalog: true,
      voices: [],
      defaultVoiceId,
      defaultModelId,
      reason: 'Set ELEVENLABS_API_KEY to enable premium ElevenLabs voices.',
    };
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v2/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `ElevenLabs voice catalog failed with status ${response.status}`);
    }

    const payload = (await response.json()) as ElevenLabsVoiceResponse;
    const voices = (payload.voices || [])
      .filter((voice) => voice.voice_id && voice.name)
      .map((voice) => ({
        id: voice.voice_id as string,
        label: voice.name as string,
        description: voice.category || voice.labels?.accent || voice.labels?.description,
        previewUrl: voice.preview_url,
        modelIds: Array.isArray(voice.high_quality_base_model_ids) ? voice.high_quality_base_model_ids : [],
        defaultModelId: defaultModelId || voice.high_quality_base_model_ids?.[0],
      }));

    return {
      id: 'elevenlabs',
      label: 'ElevenLabs',
      configured: true,
      supportsCatalog: true,
      voices,
      defaultVoiceId: defaultVoiceId || voices[0]?.id,
      defaultModelId: defaultModelId || voices[0]?.defaultModelId || 'eleven_multilingual_v2',
    };
  } catch (error) {
    return {
      id: 'elevenlabs',
      label: 'ElevenLabs',
      configured: false,
      supportsCatalog: true,
      voices: [],
      defaultVoiceId,
      defaultModelId,
      reason: error instanceof Error ? error.message : 'Failed to load ElevenLabs voices.',
    };
  }
}

function getOpenAiCompatibleRuntime(vendor: 'nvidia-personaplex' | 'grok'): OpenAiCompatibleVendorRuntime {
  if (vendor === 'nvidia-personaplex') {
    return {
      id: vendor,
      label: 'NVIDIA PersonaPlex',
      endpoint: process.env.NVIDIA_PERSONAPLEX_ENDPOINT,
      apiKey: process.env.NVIDIA_PERSONAPLEX_API_KEY || process.env.NVIDIA_API_KEY,
      defaultModelId: process.env.NVIDIA_PERSONAPLEX_MODEL,
      defaultVoiceId: process.env.NVIDIA_PERSONAPLEX_VOICE || 'persona-default',
      authHeader: process.env.NVIDIA_PERSONAPLEX_AUTH_HEADER || 'Authorization',
      authScheme: process.env.NVIDIA_PERSONAPLEX_AUTH_SCHEME || 'Bearer',
      mimeType: process.env.NVIDIA_PERSONAPLEX_MIME_TYPE || 'audio/mpeg',
    };
  }

  return {
    id: vendor,
    label: 'Grok',
    endpoint: process.env.GROK_VOICE_ENDPOINT,
    apiKey: process.env.GROK_VOICE_API_KEY || process.env.XAI_API_KEY,
    defaultModelId: process.env.GROK_VOICE_MODEL,
    defaultVoiceId: process.env.GROK_VOICE_VOICE || 'grok-voice',
    authHeader: process.env.GROK_VOICE_AUTH_HEADER || 'Authorization',
    authScheme: process.env.GROK_VOICE_AUTH_SCHEME || 'Bearer',
    mimeType: process.env.GROK_VOICE_MIME_TYPE || 'audio/mpeg',
  };
}

function describeOpenAiCompatibleVendor(vendor: 'nvidia-personaplex' | 'grok'): VoiceVendorConfig {
  const runtime = getOpenAiCompatibleRuntime(vendor);
  const configured = Boolean(runtime.endpoint && runtime.apiKey && runtime.defaultModelId);
  const voiceId = runtime.defaultVoiceId || 'default';

  return {
    id: runtime.id,
    label: runtime.label,
    configured,
    supportsCatalog: false,
    voices: configured
      ? [
          {
            id: voiceId,
            label: voiceId,
            defaultModelId: runtime.defaultModelId,
            modelIds: runtime.defaultModelId ? [runtime.defaultModelId] : [],
          },
        ]
      : [],
    defaultVoiceId: voiceId,
    defaultModelId: runtime.defaultModelId,
    reason: configured ? undefined : `Set ${vendor === 'grok' ? 'GROK_VOICE_ENDPOINT/GROK_VOICE_MODEL' : 'NVIDIA_PERSONAPLEX_ENDPOINT/NVIDIA_PERSONAPLEX_MODEL'} and the matching API key to enable this vendor.`,
  };
}

export async function listVoiceVendors(): Promise<VoiceVendorConfig[]> {
  const elevenLabs = await listElevenLabsVoices();
  const nvidia = describeOpenAiCompatibleVendor('nvidia-personaplex');
  const grok = describeOpenAiCompatibleVendor('grok');

  return [elevenLabs, nvidia, grok];
}

async function synthesizeWithElevenLabs(text: string, voiceId?: string, modelId?: string): Promise<VoiceSynthesisResult> {
  const apiKey = getElevenLabsKey();
  if (!apiKey) {
    throw new Error('ElevenLabs is not configured. Set ELEVENLABS_API_KEY.');
  }

  const selectedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!selectedVoiceId) {
    throw new Error('No ElevenLabs voice is selected.');
  }

  const selectedModelId = modelId || process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=${encodeURIComponent(outputFormat)}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: selectedModelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.8,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `ElevenLabs synthesis failed with status ${response.status}`);
  }

  const audioBytes = await safeReadResponseBytes(response);
  return {
    audioBase64: toBase64(audioBytes),
    mimeType: response.headers.get('content-type') || 'audio/mpeg',
    vendor: 'elevenlabs',
    voiceId: selectedVoiceId,
    modelId: selectedModelId,
  };
}

async function synthesizeWithOpenAiCompatibleVendor(vendor: 'nvidia-personaplex' | 'grok', text: string, voiceId?: string, modelId?: string): Promise<VoiceSynthesisResult> {
  const runtime = getOpenAiCompatibleRuntime(vendor);

  if (!runtime.endpoint || !runtime.apiKey || !runtime.defaultModelId) {
    throw new Error(`${runtime.label} voice is not configured.`);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: runtime.mimeType,
  };

  headers[runtime.authHeader] = runtime.authHeader.toLowerCase() === 'authorization'
    ? `${runtime.authScheme} ${runtime.apiKey}`.trim()
    : runtime.apiKey;

  const selectedVoiceId = voiceId || runtime.defaultVoiceId || 'default';
  const selectedModelId = modelId || runtime.defaultModelId;

  const response = await fetch(runtime.endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: selectedModelId,
      voice: selectedVoiceId,
      input: text,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${runtime.label} synthesis failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || runtime.mimeType;
  let audioBase64 = '';

  if (contentType.includes('application/json')) {
    const payload = await response.json() as Record<string, unknown>;
    const inlineAudio = payload.audio || payload.data || payload.b64_json;
    if (typeof inlineAudio !== 'string' || !inlineAudio.trim()) {
      throw new Error(`${runtime.label} returned JSON without audio data.`);
    }
    audioBase64 = inlineAudio;
  } else {
    const audioBytes = await safeReadResponseBytes(response);
    audioBase64 = toBase64(audioBytes);
  }

  return {
    audioBase64,
    mimeType: contentType.includes('application/json') ? runtime.mimeType : contentType,
    vendor,
    voiceId: selectedVoiceId,
    modelId: selectedModelId,
  };
}

export async function synthesizeVoice(input: {
  vendor: VoiceVendorId;
  text: string;
  voiceId?: string;
  modelId?: string;
}) {
  const trimmedText = input.text.trim();
  if (!trimmedText) {
    throw new Error('Text is required for voice synthesis.');
  }

  if (input.vendor === 'elevenlabs') {
    return synthesizeWithElevenLabs(trimmedText, input.voiceId, input.modelId);
  }

  return synthesizeWithOpenAiCompatibleVendor(input.vendor, trimmedText, input.voiceId, input.modelId);
}