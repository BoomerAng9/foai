export interface LucLineItem {
  service: string;
  tokens?: number;
  cost: number;
}

export interface LucEstimate {
  id: string;
  tier: string;
  items: LucLineItem[];
  total_tokens: number;
  total_cost: number;
  created_at: string;
}

export interface LucReceipt {
  job_id: string;
  estimate: LucEstimate;
  actual: {
    items: LucLineItem[];
    total_tokens: number;
    total_cost: number;
  };
  variance_pct: number;
  created_at: string;
}

export type LucAction = 'accept' | 'adjust' | 'stop';

export interface LucJobEntry {
  id: string;
  user_id: string;
  conversation_id: string;
  message: string;
  tier: string;
  estimate: LucEstimate;
  status: 'estimated' | 'accepted' | 'running' | 'completed' | 'cancelled';
  receipt?: LucReceipt;
  created_at: string;
}

export interface LedgerEntry {
  job_id: string;
  models_used: Array<{ model_id: string; tokens_in: number; tokens_out: number; cost: number }>;
  api_costs: Array<{ service: string; cost: number }>;
  surcharge: number;
  margin: number;
  total_internal_cost: number;
  total_customer_cost: number;
}
