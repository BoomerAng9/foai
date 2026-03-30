export interface Attachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface MessageMetadata {
  tokens_in?: number;
  tokens_out?: number;
  cost?: number;
  memories_recalled?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'acheevy';
  content: string;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
  created_at: string;
  streaming?: boolean;
  thinking?: string;
  activeAgent?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

export type TierId = 'premium' | 'bucket-list' | 'lfg';

export interface Tier {
  id: TierId;
  name: string;
  color: string;
}

export const TIERS: Tier[] = [
  { id: 'premium', name: 'Premium', color: '#22C55E' },
  { id: 'bucket-list', name: 'Bucket List', color: '#3B82F6' },
  { id: 'lfg', name: 'LFG', color: '#F59E0B' },
];

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  price_in: number;
  price_out: number;
  context: string;
  tag?: string;
}

// OpenRouter model catalog — March 2026 verified pricing ($/1M tokens)
export const MODELS: ModelOption[] = [
  { id: 'minimax/minimax-m2.7',              name: 'MiniMax M2.7',          provider: 'MiniMax',     price_in: 0.30,  price_out: 1.20,  context: '200K',  tag: 'DEFAULT' },
  { id: 'deepseek/deepseek-v3.2',           name: 'DeepSeek V3.2',        provider: 'DeepSeek',    price_in: 0.26,  price_out: 0.38,  context: '164K',  tag: 'CHEAP' },
  { id: 'meta-llama/llama-4-scout',          name: 'Llama 4 Scout',        provider: 'Meta',        price_in: 0.08,  price_out: 0.30,  context: '328K',  tag: 'CHEAP' },
  { id: 'qwen/qwen3.5-flash-02-23',         name: 'Qwen 3.5 Flash',       provider: 'Qwen',        price_in: 0.065, price_out: 0.26,  context: '1M',    tag: 'CHEAP' },
  { id: 'google/gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', provider: 'Google',  price_in: 0.25,  price_out: 1.50,  context: '1M',    tag: 'FAST' },
  { id: 'openai/gpt-5.4-nano',              name: 'GPT-5.4 Nano',         provider: 'OpenAI',      price_in: 0.20,  price_out: 1.25,  context: '400K',  tag: 'FAST' },
  { id: 'anthropic/claude-haiku-4.5',        name: 'Claude Haiku 4.5',     provider: 'Anthropic',   price_in: 1.00,  price_out: 5.00,  context: '200K',  tag: 'FAST' },
  { id: 'openai/gpt-5.4',                   name: 'GPT-5.4',              provider: 'OpenAI',      price_in: 2.50,  price_out: 15.00, context: '1M' },
  { id: 'openai/gpt-5.4-mini',              name: 'GPT-5.4 Mini',         provider: 'OpenAI',      price_in: 0.75,  price_out: 4.50,  context: '400K' },
  { id: 'anthropic/claude-sonnet-4.6',       name: 'Claude Sonnet 4.6',    provider: 'Anthropic',   price_in: 3.00,  price_out: 15.00, context: '1M' },
  { id: 'google/gemini-3.1-pro-preview',     name: 'Gemini 3.1 Pro',       provider: 'Google',      price_in: 2.00,  price_out: 12.00, context: '1M' },
  { id: 'google/gemini-3-flash-preview',     name: 'Gemini 3 Flash',       provider: 'Google',      price_in: 0.50,  price_out: 3.00,  context: '1M' },
  { id: 'x-ai/grok-4.20-beta',              name: 'Grok 4.20',            provider: 'xAI',         price_in: 2.00,  price_out: 6.00,  context: '2M' },
  { id: 'meta-llama/llama-4-maverick',       name: 'Llama 4 Maverick',     provider: 'Meta',        price_in: 0.15,  price_out: 0.60,  context: '1M',    tag: 'OPEN' },
  { id: 'qwen/qwen3.5-397b-a17b',           name: 'Qwen 3.5 397B',        provider: 'Qwen',        price_in: 0.39,  price_out: 2.34,  context: '256K',  tag: 'OPEN' },
  { id: 'openai/o4-mini',                   name: 'o4 Mini',              provider: 'OpenAI',      price_in: 1.10,  price_out: 4.40,  context: '200K',  tag: 'REASON' },
  { id: 'deepseek/deepseek-r1',             name: 'DeepSeek R1',          provider: 'DeepSeek',    price_in: 0.70,  price_out: 2.50,  context: '64K',   tag: 'REASON' },
  { id: 'inception/mercury-2',              name: 'Mercury 2',            provider: 'Inception',   price_in: 0.25,  price_out: 0.75,  context: '128K',  tag: 'FAST' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super', provider: 'NVIDIA', price_in: 0,     price_out: 0,     context: '128K',  tag: 'FREE' },
  { id: 'nvidia/nemotron-nano-9b-v2:free',  name: 'Nemotron Nano 9B',     provider: 'NVIDIA',      price_in: 0,     price_out: 0,     context: '128K',  tag: 'FREE' },
];
