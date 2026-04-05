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

// Agent assembly tiers — determines which transition animation plays
export type AgentTier = 1 | 2 | 3 | 4;

export interface AgentDispatch {
  tier: AgentTier;
  agents: string[];       // Which agents are working
  taskSummary: string;    // One-line summary of what's being done
  phase: 'receiving' | 'analyzing' | 'proposing' | 'building' | 'verifying' | 'complete';
}

// Agent roster for assembly animations
export const AGENT_ROSTER = {
  acheevy: { name: 'ACHEEVY', role: 'Digital CEO', color: '#E8A020' },
  scout_ang: { name: 'Scout_Ang', role: 'Research & Intel', color: '#3B82F6' },
  content_ang: { name: 'Content_Ang', role: 'Content & Copy', color: '#8B5CF6' },
  biz_ang: { name: 'Biz_Ang', role: 'Business Strategy', color: '#10B981' },
  code_ang: { name: 'Code_Ang', role: 'Engineering', color: '#F43F5E' },
  illa: { name: 'ILLA', role: 'Creative Director', color: '#F97316' },
  learn_ang: { name: 'Learn_Ang', role: 'Training & Education', color: '#06B6D4' },
  luc: { name: 'LUC', role: 'Cost Analyst', color: '#84CC16' },
  chicken_hawk: { name: 'Chicken Hawk', role: 'Tactical Ops', color: '#DC2626' },
  // Broad|Cast Studio specialists
  beat_ang: { name: 'Beat_Ang', role: 'Audio & Music', color: '#A855F7' },
  cut_ang: { name: 'CUT_Ang', role: 'Video Editing', color: '#EC4899' },
  social_ang: { name: 'Social_Ang', role: 'Social Distribution', color: '#14B8A6' },
  publish_ang: { name: 'Publish_Ang', role: 'Publishing & CDN', color: '#6366F1' },
  promo_ang: { name: 'PROMO_Ang', role: 'Marketing & Promo', color: '#F59E0B' },
} as const;

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  price_in: number;
  price_out: number;
  context: string;
  tag?: string;
}

// OpenRouter model catalog — April 2026 verified pricing ($/1M tokens)
export const MODELS: ModelOption[] = [
  { id: 'google/gemma-4-26b-a4b-it',        name: 'Gemma 4 26B',           provider: 'Google',      price_in: 0.13,  price_out: 0.40,  context: '256K',  tag: 'DEFAULT' },
  { id: 'anthropic/claude-opus-4-6',         name: 'Claude Opus 4.6',      provider: 'Anthropic',   price_in: 15.00, price_out: 75.00, context: '1M',    tag: 'PREMIUM' },
  { id: 'moonshotai/kimi-k2.5r',            name: 'Kimi K2.5r',           provider: 'Moonshot',    price_in: 0.50,  price_out: 2.80,  context: '128K',  tag: 'REASON' },
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
  { id: 'google/gemini-3.1-flash-preview',   name: 'Gemini 3.1 Flash',     provider: 'Google',      price_in: 0.50,  price_out: 2.00,  context: '1M' },
  { id: 'google/gemini-3-flash-preview',     name: 'Gemini 3 Flash',       provider: 'Google',      price_in: 0.50,  price_out: 3.00,  context: '1M' },
  { id: 'x-ai/grok-4.20-beta',              name: 'Grok 4.20',            provider: 'xAI',         price_in: 2.00,  price_out: 6.00,  context: '2M' },
  { id: 'x-ai/grok-3',                      name: 'Grok 3',               provider: 'xAI',         price_in: 3.00,  price_out: 15.00, context: '128K' },
  { id: 'x-ai/grok-3-mini',                 name: 'Grok 3 Mini',          provider: 'xAI',         price_in: 0.30,  price_out: 0.50,  context: '128K',  tag: 'CHEAP' },
  { id: 'meta-llama/llama-4-maverick',       name: 'Llama 4 Maverick',     provider: 'Meta',        price_in: 0.15,  price_out: 0.60,  context: '1M',    tag: 'OPEN' },
  { id: 'qwen/qwen3.5-397b-a17b',           name: 'Qwen 3.5 397B',        provider: 'Qwen',        price_in: 0.39,  price_out: 2.34,  context: '256K',  tag: 'OPEN' },
  { id: 'openai/o4-mini',                   name: 'o4 Mini',              provider: 'OpenAI',      price_in: 1.10,  price_out: 4.40,  context: '200K',  tag: 'REASON' },
  { id: 'deepseek/deepseek-r1',             name: 'DeepSeek R1',          provider: 'DeepSeek',    price_in: 0.70,  price_out: 2.50,  context: '64K',   tag: 'REASON' },
  { id: 'mistralai/mistral-large-2',         name: 'Mistral Large 2',      provider: 'Mistral',     price_in: 2.00,  price_out: 6.00,  context: '128K' },
  { id: 'cohere/command-r-plus-2',           name: 'Command R+ 2',         provider: 'Cohere',      price_in: 2.50,  price_out: 10.00, context: '128K' },
  { id: 'inception/mercury-2',              name: 'Mercury 2',            provider: 'Inception',   price_in: 0.25,  price_out: 0.75,  context: '128K',  tag: 'FAST' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super', provider: 'NVIDIA', price_in: 0,     price_out: 0,     context: '128K',  tag: 'FREE' },
  { id: 'nvidia/nemotron-nano-9b-v2:free',  name: 'Nemotron Nano 9B',     provider: 'NVIDIA',      price_in: 0,     price_out: 0,     context: '128K',  tag: 'FREE' },
  { id: 'qwen/qwen3-coder:free',            name: 'Qwen3 Coder 480B',    provider: 'Qwen',        price_in: 0,     price_out: 0,     context: '256K',  tag: 'FREE' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', name: 'Qwen3 Next 80B', provider: 'Qwen',       price_in: 0,     price_out: 0,     context: '128K',  tag: 'FREE' },
  { id: 'qwen/qwen3.6-plus-preview:free',   name: 'Qwen 3.6 Plus',       provider: 'Qwen',        price_in: 0,     price_out: 0,     context: '256K',  tag: 'FREE' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Llama 3.3 70B', provider: 'Meta',        price_in: 0,     price_out: 0,     context: '128K',  tag: 'FREE' },
  { id: 'google/gemma-3-27b-it:free',       name: 'Gemma 3 27B',         provider: 'Google',      price_in: 0,     price_out: 0,     context: '128K',  tag: 'FREE' },
];
